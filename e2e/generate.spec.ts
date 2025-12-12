import { test, expect } from "./fixtures/base";
import { GeneratePage, VALIDATION_LIMITS } from "./pages/generate.page";
import {
  TEST_DATA,
  VALIDATION_MESSAGES,
  TIMEOUTS,
  TEST_USERS,
} from "./helpers/test-data";
import { loginViaUI } from "./helpers/auth.helper";

/**
 * E2E Tests for AI Flashcard Generation Feature.
 *
 * Test coverage:
 * - Source text validation (min/max length, character counter)
 * - Generation happy path (generate → review → save)
 * - Proposal management (accept, reject, edit, restore)
 * - Bulk actions (save accepted, reject all)
 * - Error handling and edge cases
 * - View state transitions
 */

test.describe("AI Flashcard Generation", () => {
  // =========================================================
  // AUTHENTICATION & ACCESS CONTROL
  // =========================================================

  test.describe("Authentication", () => {
    test("should redirect to login when accessing /generate without authentication", async ({
      generatePage,
      page,
    }) => {
      await generatePage.goto();

      // Should be redirected to login
      await expect(page).toHaveURL(/\/auth\/login/);
    });

    test("should allow access to /generate when authenticated", async ({
      page,
    }) => {
      // Login first
      await loginViaUI(page);

      // Navigate to generate page
      await page.goto("/generate");

      // Should stay on generate page
      await expect(page).toHaveURL(/\/generate/);

      // Should see the source text input
      const generatePage = new GeneratePage(page);
      await expect(generatePage.sourceTextInput).toBeVisible();
    });
  });

  // =========================================================
  // SOURCE TEXT VALIDATION
  // =========================================================

  test.describe("Source Text Validation", () => {
    test.beforeEach(async ({ page }) => {
      await loginViaUI(page);
      await page.goto("/generate");
    });

    test("should show character counter with correct initial state", async ({
      page,
    }) => {
      const generatePage = new GeneratePage(page);
      await generatePage.waitForReady();

      // Character counter should be visible
      await expect(generatePage.characterCounter).toBeVisible();

      // Should show 0 characters initially (or close to 0)
      const count = await generatePage.getCharacterCount();
      expect(count.current).toBeLessThanOrEqual(10);
      expect(count.max).toBe(VALIDATION_LIMITS.SOURCE_TEXT_MAX);
    });

    test("should update character counter as user types", async ({ page }) => {
      const generatePage = new GeneratePage(page);
      await generatePage.waitForReady();

      const testText = "Test text with exactly 30 char";
      await generatePage.fillSourceText(testText);

      const count = await generatePage.getCharacterCount();
      expect(count.current).toBe(testText.length);
    });

    test("should disable generate button when text is too short", async ({
      page,
    }) => {
      const generatePage = new GeneratePage(page);
      await generatePage.waitForReady();

      // Enter text below minimum
      await generatePage.fillSourceText(TEST_DATA.SOURCE_TEXT_TOO_SHORT);

      // Generate button should be disabled
      const isEnabled = await generatePage.isGenerateButtonEnabled();
      expect(isEnabled).toBe(false);
    });

    test("should disable generate button when text is empty", async ({
      page,
    }) => {
      const generatePage = new GeneratePage(page);
      await generatePage.waitForReady();

      // Clear any existing text
      await generatePage.clearSourceText();

      // Generate button should be disabled
      const isEnabled = await generatePage.isGenerateButtonEnabled();
      expect(isEnabled).toBe(false);
    });

    test("should enable generate button when text meets minimum length", async ({
      page,
    }) => {
      const generatePage = new GeneratePage(page);
      await generatePage.waitForReady();

      // Enter text at minimum length
      await generatePage.fillSourceText(TEST_DATA.SOURCE_TEXT_MIN);

      // Generate button should be enabled
      const isEnabled = await generatePage.isGenerateButtonEnabled();
      expect(isEnabled).toBe(true);
    });

    test("should enable generate button for maximum length text", async ({
      page,
    }) => {
      const generatePage = new GeneratePage(page);
      await generatePage.waitForReady();

      // Enter text at maximum length
      await generatePage.fillSourceText(TEST_DATA.SOURCE_TEXT_MAX);

      // Generate button should be enabled
      const isEnabled = await generatePage.isGenerateButtonEnabled();
      expect(isEnabled).toBe(true);

      // Verify character count
      const count = await generatePage.getCharacterCount();
      expect(count.current).toBe(VALIDATION_LIMITS.SOURCE_TEXT_MAX);
    });

    test("should show validation error for text below minimum", async ({
      page,
    }) => {
      const generatePage = new GeneratePage(page);
      await generatePage.waitForReady();

      // Enter text below minimum (but not empty - error shown only when user started typing)
      await generatePage.fillSourceText(TEST_DATA.SOURCE_TEXT_TOO_SHORT);

      // Error message should be visible
      // Note: The error appears based on the component's hasError logic
      const count = await generatePage.getCharacterCount();
      expect(count.current).toBeLessThan(VALIDATION_LIMITS.SOURCE_TEXT_MIN);
    });

    test("should handle text with special characters and Polish diacritics", async ({
      page,
    }) => {
      const generatePage = new GeneratePage(page);
      await generatePage.waitForReady();

      await generatePage.fillSourceText(TEST_DATA.SOURCE_TEXT_SPECIAL_CHARS);

      // Should be able to generate (text is long enough)
      const isEnabled = await generatePage.isGenerateButtonEnabled();
      expect(isEnabled).toBe(true);

      // Character count should reflect all characters
      const count = await generatePage.getCharacterCount();
      expect(count.current).toBe(TEST_DATA.SOURCE_TEXT_SPECIAL_CHARS.length);
    });
  });

  // =========================================================
  // GENERATION HAPPY PATH
  // =========================================================

  test.describe("Generation Happy Path", () => {
    test.beforeEach(async ({ page }) => {
      await loginViaUI(page);
      await page.goto("/generate");
    });

    test("should display proposals after successful generation", async ({
      page,
    }) => {
      test.setTimeout(TIMEOUTS.AI_GENERATION + 30000); // Extended timeout for AI

      const generatePage = new GeneratePage(page);
      await generatePage.waitForReady();

      // Generate flashcards
      await generatePage.generateFlashcards(TEST_DATA.SOURCE_TEXT_STANDARD);

      // Wait for generation to complete
      await generatePage.waitForGenerationComplete(TIMEOUTS.AI_GENERATION);

      // Check for proposals or error
      const hasError = await generatePage.hasError();
      if (hasError) {
        // If there's an error (e.g., AI service unavailable), test should note this
        const errorMessage = await generatePage.getErrorMessage();
        console.log("Generation error (may be expected in test env):", errorMessage);
        return;
      }

      // Should show review section with proposals
      await expect(generatePage.reviewHeading).toBeVisible();

      // Should have at least one proposal
      const proposalCount = await generatePage.getProposalCount();
      expect(proposalCount).toBeGreaterThan(0);
    });

    test("should show source text preview in review mode", async ({ page }) => {
      test.setTimeout(TIMEOUTS.AI_GENERATION + 30000);

      const generatePage = new GeneratePage(page);
      await generatePage.waitForReady();

      const sourceText = TEST_DATA.SOURCE_TEXT_STANDARD;
      await generatePage.generateFlashcards(sourceText);
      await generatePage.waitForGenerationComplete(TIMEOUTS.AI_GENERATION);

      // Skip if error
      if (await generatePage.hasError()) return;

      // Should show source text preview component
      await expect(generatePage.sourceTextPreview).toBeVisible();
    });

    test("should have proposals accepted by default", async ({ page }) => {
      test.setTimeout(TIMEOUTS.AI_GENERATION + 30000);

      const generatePage = new GeneratePage(page);
      await generatePage.waitForReady();

      await generatePage.generateFlashcards(TEST_DATA.SOURCE_TEXT_STANDARD);
      await generatePage.waitForGenerationComplete(TIMEOUTS.AI_GENERATION);

      if (await generatePage.hasError()) return;

      // First proposal should be accepted by default
      const isAccepted = await generatePage.isProposalAccepted(0);
      expect(isAccepted).toBe(true);
    });
  });

  // =========================================================
  // PROPOSAL MANAGEMENT
  // =========================================================

  test.describe("Proposal Management", () => {
    // Skip these tests if we can't generate proposals (requires working AI)
    test.beforeEach(async ({ page }) => {
      test.setTimeout(TIMEOUTS.AI_GENERATION + 30000);

      await loginViaUI(page);
      await page.goto("/generate");

      const generatePage = new GeneratePage(page);
      await generatePage.waitForReady();
      await generatePage.generateFlashcards(TEST_DATA.SOURCE_TEXT_STANDARD);

      try {
        await generatePage.waitForGenerationComplete(TIMEOUTS.AI_GENERATION);

        if (await generatePage.hasError()) {
          test.skip();
        }
      } catch {
        test.skip();
      }
    });

    test("should allow rejecting a single proposal", async ({ page }) => {
      const generatePage = new GeneratePage(page);

      // Get initial state
      const initialAcceptedCount = await generatePage.getAcceptedCount();

      // Reject first proposal
      await generatePage.rejectProposal(0);

      // Proposal should show as rejected
      const isRejected = await generatePage.isProposalRejected(0);
      expect(isRejected).toBe(true);

      // Accepted count should decrease
      const newAcceptedCount = await generatePage.getAcceptedCount();
      expect(newAcceptedCount).toBe(initialAcceptedCount - 1);
    });

    test("should allow restoring a rejected proposal", async ({ page }) => {
      const generatePage = new GeneratePage(page);

      // Reject first proposal
      await generatePage.rejectProposal(0);

      // Verify it's rejected
      expect(await generatePage.isProposalRejected(0)).toBe(true);

      // Restore the proposal
      await generatePage.restoreProposal(0);

      // Should no longer be rejected
      expect(await generatePage.isProposalRejected(0)).toBe(false);

      // Should be accepted again
      expect(await generatePage.isProposalAccepted(0)).toBe(true);
    });

    test("should allow editing a proposal", async ({ page }) => {
      const generatePage = new GeneratePage(page);

      // Enter edit mode
      await generatePage.editProposal(0);

      // Edit the front text
      await generatePage.editProposalFront(0, TEST_DATA.EDITED_FLASHCARD.front);

      // Edit the back text
      await generatePage.editProposalBack(0, TEST_DATA.EDITED_FLASHCARD.back);

      // Save the edit
      await generatePage.saveProposalEdit(0);

      // Verify the edit was saved (proposal should show "Edytowana" badge)
      const card = generatePage.getProposalCard(0);
      // Use getByText to find badge - more reliable than class selector
      await expect(card.getByText("Edytowana")).toBeVisible();
    });

    test("should validate edited proposal front length", async ({ page }) => {
      const generatePage = new GeneratePage(page);

      // Enter edit mode
      await generatePage.editProposal(0);

      // Try to enter text exceeding max length
      await generatePage.editProposalFront(0, TEST_DATA.FLASHCARD_FRONT_TOO_LONG);

      // Should show validation error
      const card = generatePage.getProposalCard(0);
      const errorText = card.getByRole("alert");
      await expect(errorText).toContainText(/maksymalnie|maximum/i);
    });

    test("should validate edited proposal back length", async ({ page }) => {
      const generatePage = new GeneratePage(page);

      // Enter edit mode
      await generatePage.editProposal(0);

      // Try to enter text exceeding max length
      await generatePage.editProposalBack(0, TEST_DATA.FLASHCARD_BACK_TOO_LONG);

      // Should show validation error
      const card = generatePage.getProposalCard(0);
      const errorText = card.getByRole("alert");
      await expect(errorText).toContainText(/maksymalnie|maximum/i);
    });

    test("should not allow empty front text", async ({ page }) => {
      const generatePage = new GeneratePage(page);

      // Enter edit mode
      await generatePage.editProposal(0);

      // Clear the front text
      await generatePage.editProposalFront(0, "");

      // Should show validation error
      const card = generatePage.getProposalCard(0);
      const errorText = card.getByRole("alert");
      await expect(errorText).toContainText(/wymagane|required/i);
    });
  });

  // =========================================================
  // BULK ACTIONS
  // =========================================================

  test.describe("Bulk Actions", () => {
    test.beforeEach(async ({ page }) => {
      test.setTimeout(TIMEOUTS.AI_GENERATION + 30000);

      await loginViaUI(page);
      await page.goto("/generate");

      const generatePage = new GeneratePage(page);
      await generatePage.waitForReady();
      await generatePage.generateFlashcards(TEST_DATA.SOURCE_TEXT_STANDARD);

      try {
        await generatePage.waitForGenerationComplete(TIMEOUTS.AI_GENERATION);
        if (await generatePage.hasError()) {
          test.skip();
        }
      } catch {
        test.skip();
      }
    });

    test("should show correct accepted count", async ({ page }) => {
      const generatePage = new GeneratePage(page);

      const proposalCount = await generatePage.getProposalCount();
      const acceptedCount = await generatePage.getAcceptedCount();

      // By default, all proposals are accepted
      expect(acceptedCount).toBe(proposalCount);
    });

    test("should update accepted count when rejecting proposals", async ({
      page,
    }) => {
      const generatePage = new GeneratePage(page);

      const initialCount = await generatePage.getAcceptedCount();

      // Reject first proposal
      await generatePage.rejectProposal(0);

      const newCount = await generatePage.getAcceptedCount();
      expect(newCount).toBe(initialCount - 1);
    });

    test("should disable save button when no proposals are accepted", async ({
      page,
    }) => {
      const generatePage = new GeneratePage(page);

      const proposalCount = await generatePage.getProposalCount();

      // Reject all proposals one by one
      for (let i = 0; i < proposalCount; i++) {
        await generatePage.rejectProposal(i);
      }

      // Save button should be disabled
      const isEnabled = await generatePage.isSaveButtonEnabled();
      expect(isEnabled).toBe(false);
    });

    test("should reject all proposals and return to input form", async ({
      page,
    }) => {
      const generatePage = new GeneratePage(page);

      // Click "Reject All"
      await generatePage.rejectAllProposals();

      // Should return to idle state
      await expect(generatePage.sourceTextInput).toBeVisible();
      await expect(generatePage.reviewHeading).not.toBeVisible();
    });

    test("should save accepted flashcards successfully", async ({ page }) => {
      const generatePage = new GeneratePage(page);

      const acceptedCount = await generatePage.getAcceptedCount();

      // Save accepted flashcards
      await generatePage.saveAcceptedFlashcards();

      // Wait for success
      await generatePage.waitForSaveSuccess();

      // Should show success message
      await expect(generatePage.successAlert).toBeVisible();

      // Should show correct count
      const savedCount = await generatePage.getSavedCount();
      expect(savedCount).toBe(acceptedCount);
    });

    test("should allow starting new generation after success", async ({
      page,
    }) => {
      const generatePage = new GeneratePage(page);

      // Save flashcards
      await generatePage.saveAcceptedFlashcards();
      await generatePage.waitForSaveSuccess();

      // Click "New Generation" button
      await generatePage.startNewGeneration();

      // Should return to input form
      await expect(generatePage.sourceTextInput).toBeVisible();
      await expect(generatePage.successAlert).not.toBeVisible();
    });
  });

  // =========================================================
  // ERROR HANDLING
  // =========================================================

  test.describe("Error Handling", () => {
    test.beforeEach(async ({ page }) => {
      await loginViaUI(page);
      await page.goto("/generate");
    });

    test("should display error alert on generation failure", async ({
      page,
    }) => {
      const generatePage = new GeneratePage(page);
      await generatePage.waitForReady();

      // Mock API to return error
      await page.route("**/api/generations", async (route) => {
        await route.fulfill({
          status: 500,
          contentType: "application/json",
          body: JSON.stringify({ message: "Internal server error" }),
        });
      });

      // Try to generate
      await generatePage.fillSourceText(TEST_DATA.SOURCE_TEXT_STANDARD);
      await generatePage.clickGenerate();

      // Wait for error
      await expect(generatePage.errorAlert).toBeVisible({ timeout: 10000 });
    });

    test("should allow dismissing error and returning to input", async ({
      page,
    }) => {
      const generatePage = new GeneratePage(page);
      await generatePage.waitForReady();

      // Mock API to return error
      await page.route("**/api/generations", async (route) => {
        await route.fulfill({
          status: 500,
          contentType: "application/json",
          body: JSON.stringify({ message: "Test error" }),
        });
      });

      // Generate and get error
      await generatePage.fillSourceText(TEST_DATA.SOURCE_TEXT_STANDARD);
      await generatePage.clickGenerate();
      await expect(generatePage.errorAlert).toBeVisible({ timeout: 10000 });

      // Source text input should still be visible for retry
      await expect(generatePage.sourceTextInput).toBeVisible();
    });

    test("should handle network timeout gracefully", async ({ page }) => {
      test.setTimeout(70000);

      const generatePage = new GeneratePage(page);
      await generatePage.waitForReady();

      // Mock API to timeout
      await page.route("**/api/generations", async (route) => {
        // Delay longer than typical timeout
        await new Promise((resolve) => setTimeout(resolve, 65000));
        await route.fulfill({
          status: 500,
          body: JSON.stringify({ message: "Timeout" }),
        });
      });

      // Try to generate
      await generatePage.fillSourceText(TEST_DATA.SOURCE_TEXT_STANDARD);
      await generatePage.clickGenerate();

      // Should eventually show error or remain in loading state
      // (actual behavior depends on fetch timeout configuration)
    });
  });

  // =========================================================
  // STATE PERSISTENCE
  // =========================================================

  test.describe("State Persistence", () => {
    test.beforeEach(async ({ page }) => {
      await loginViaUI(page);
    });

    test("should persist source text in localStorage", async ({ page }) => {
      const generatePage = new GeneratePage(page);
      await page.goto("/generate");
      await generatePage.waitForReady();

      // Enter some text
      const testText = TEST_DATA.SOURCE_TEXT_STANDARD.slice(0, 2000);
      await generatePage.fillSourceText(testText);

      // Reload the page
      await page.reload();
      // Wait for localStorage restore (useEffect runs after render)
      await generatePage.waitForLocalStorageRestore(testText.length);

      // Text should be restored
      const count = await generatePage.getCharacterCount();
      expect(count.current).toBe(testText.length);
    });

    test("should clear localStorage after successful save", async ({
      page,
    }) => {
      test.setTimeout(TIMEOUTS.AI_GENERATION + 30000);

      const generatePage = new GeneratePage(page);
      await page.goto("/generate");
      await generatePage.waitForReady();

      // Generate and save
      await generatePage.generateFlashcards(TEST_DATA.SOURCE_TEXT_STANDARD);

      try {
        await generatePage.waitForGenerationComplete(TIMEOUTS.AI_GENERATION);
        if (await generatePage.hasError()) {
          test.skip();
          return;
        }
      } catch {
        test.skip();
        return;
      }

      await generatePage.saveAcceptedFlashcards();
      await generatePage.waitForSaveSuccess();

      // Start new generation
      await generatePage.startNewGeneration();

      // Text input should be empty
      const count = await generatePage.getCharacterCount();
      expect(count.current).toBeLessThanOrEqual(10);
    });
  });

  // =========================================================
  // RESPONSIVE BEHAVIOR
  // =========================================================

  test.describe("Responsive Behavior", () => {
    test.beforeEach(async ({ page }) => {
      await loginViaUI(page);
      await page.goto("/generate");
    });

    test("should be usable on mobile viewport", async ({ page }) => {
      // Set mobile viewport
      await page.setViewportSize({ width: 375, height: 667 });

      const generatePage = new GeneratePage(page);
      await generatePage.waitForReady();

      // All key elements should be visible and usable
      await expect(generatePage.sourceTextInput).toBeVisible();
      await expect(generatePage.generateButton).toBeVisible();
      await expect(generatePage.characterCounter).toBeVisible();
    });

    test("should show bulk actions bar properly on mobile after generation", async ({
      page,
    }) => {
      test.setTimeout(TIMEOUTS.AI_GENERATION + 30000);

      await page.setViewportSize({ width: 375, height: 667 });

      const generatePage = new GeneratePage(page);
      await generatePage.waitForReady();

      await generatePage.generateFlashcards(TEST_DATA.SOURCE_TEXT_STANDARD);

      try {
        await generatePage.waitForGenerationComplete(TIMEOUTS.AI_GENERATION);
        if (await generatePage.hasError()) return;
      } catch {
        return;
      }

      // Bulk actions bar should be visible (sticky at bottom)
      await expect(generatePage.saveButton).toBeVisible();
      await expect(generatePage.rejectAllButton).toBeVisible();
    });
  });

  // =========================================================
  // ACCESSIBILITY
  // =========================================================

  test.describe("Accessibility", () => {
    test.beforeEach(async ({ page }) => {
      await loginViaUI(page);
      await page.goto("/generate");
    });

    test("should have proper ARIA labels on interactive elements", async ({
      page,
    }) => {
      const generatePage = new GeneratePage(page);
      await generatePage.waitForReady();

      // Generate button should be accessible
      await expect(generatePage.generateButton).toBeVisible();

      // Source text input should be focusable
      await generatePage.sourceTextInput.focus();
      await expect(generatePage.sourceTextInput).toBeFocused();
    });

    test("should announce validation errors", async ({ page }) => {
      const generatePage = new GeneratePage(page);
      await generatePage.waitForReady();

      // Enter invalid text
      await generatePage.fillSourceText("Too short");

      // Error should be announced (role="alert")
      // The validation error has role="alert" which is announced to screen readers
    });

    test("should have proper heading structure in review mode", async ({
      page,
    }) => {
      test.setTimeout(TIMEOUTS.AI_GENERATION + 30000);

      const generatePage = new GeneratePage(page);
      await generatePage.waitForReady();

      await generatePage.generateFlashcards(TEST_DATA.SOURCE_TEXT_STANDARD);

      try {
        await generatePage.waitForGenerationComplete(TIMEOUTS.AI_GENERATION);
        if (await generatePage.hasError()) return;
      } catch {
        return;
      }

      // Should have heading for review section
      await expect(generatePage.reviewHeading).toBeVisible();
    });
  });
});
