import { expect, type Locator, type Page } from "@playwright/test";
import { BasePage } from "./base.page";

/**
 * Validation limits - must match src/components/generate/types.ts
 */
export const VALIDATION_LIMITS = {
  SOURCE_TEXT_MIN: 1000,
  SOURCE_TEXT_MAX: 10000,
  FRONT_MAX: 200,
  BACK_MAX: 500,
} as const;

/**
 * Page Object Model for the Generate (AI Flashcard Generation) page.
 * Implements the Page Object Model pattern for maintainable E2E tests.
 */
export class GeneratePage extends BasePage {
  // =============================================
  // Source Text Form Locators
  // =============================================
  readonly sourceTextInput: Locator;
  readonly characterCounter: Locator;
  readonly generateButton: Locator;
  readonly validationError: Locator;

  // =============================================
  // Loading State Locators
  // =============================================
  readonly generationLoader: Locator;
  readonly skeletonCards: Locator;

  // =============================================
  // Review Section Locators
  // =============================================
  readonly reviewSection: Locator;
  readonly reviewHeading: Locator;
  readonly sourceTextPreview: Locator;
  readonly proposalCards: Locator;

  // =============================================
  // Bulk Actions Locators
  // =============================================
  readonly bulkActionsBar: Locator;
  readonly saveButton: Locator;
  readonly rejectAllButton: Locator;
  readonly acceptedCountText: Locator;

  // =============================================
  // Success State Locators
  // =============================================
  readonly successAlert: Locator;
  readonly newGenerationButton: Locator;

  // =============================================
  // Error State Locators
  // =============================================
  readonly errorAlert: Locator;
  readonly errorDismissButton: Locator;

  constructor(page: Page) {
    super(page);

    // Source Text Form
    this.sourceTextInput = page.getByRole("textbox", {
      name: /tekst źródłowy|source text|wprowadź tekst/i,
    });
    // Fallback for textarea without label
    this.sourceTextInput = this.sourceTextInput.or(
      page.locator("textarea").first()
    );
    // Character counter shows format: "X / min-max" - find by pattern regardless of color class
    this.characterCounter = page.locator("span").filter({
      hasText: /\d[\d\s]*\/.*\d+.*-.*\d+/,
    });
    this.generateButton = page.getByRole("button", {
      name: /generuj|generate/i,
    });
    this.validationError = page.getByRole("alert").filter({
      hasText: /tekst musi|minimum|maksymalnie/i,
    });

    // Loading State
    this.generationLoader = page.locator('[data-testid="generation-loader"]');
    this.skeletonCards = page.locator('[class*="skeleton"], [class*="animate-pulse"]');

    // Review Section
    this.reviewSection = page.getByRole("region", { name: /recenzja|review/i });
    this.reviewHeading = page.getByRole("heading", {
      name: /propozycje fiszek/i,
    });
    this.sourceTextPreview = page.locator('[data-testid="source-text-preview"]').or(
      page.locator('button').filter({ hasText: /pokaż tekst źródłowy|tekst źródłowy/i })
    );
    // Proposals are listitem elements inside the proposals list
    this.proposalCards = page.getByRole("list", { name: /propozycji fiszek/i }).getByRole("listitem");

    // Bulk Actions Bar
    this.bulkActionsBar = page.locator('[class*="sticky"]').filter({
      has: page.getByRole("button", { name: /zapisz|save/i }),
    });
    this.saveButton = page.getByRole("button", { name: /zapisz|save/i });
    this.rejectAllButton = page.getByRole("button", {
      name: /odrzuć wszystkie|reject all/i,
    });
    // Find accepted count text by pattern - "X fiszek gotowych do zapisania"
    this.acceptedCountText = page.locator("*").filter({
      hasText: /^\d+\s+fiszek?\s+gotow/i,
    }).first();

    // Success State
    this.successAlert = page.getByRole("alert").filter({
      hasText: /zapisane pomyślnie|saved successfully/i,
    }).or(page.locator('[class*="alert"]').filter({
      hasText: /zapisane|saved/i,
    }));
    this.newGenerationButton = page.getByRole("button", {
      name: /wygeneruj kolejne|generate more|nowa generacja/i,
    });

    // Error State
    this.errorAlert = page.getByRole("alert").filter({
      hasText: /błąd|error|nie udało/i,
    });
    this.errorDismissButton = page.getByRole("button", {
      name: /zamknij|dismiss|×/i,
    });
  }

  async goto(): Promise<void> {
    await this.page.goto("/generate");
  }

  // =============================================
  // Source Text Form Actions
  // =============================================

  /**
   * Fill the source text input with the given text.
   * Uses pressSequentially which properly triggers React's controlled component updates.
   */
  async fillSourceText(text: string): Promise<void> {
    // First clear any existing text (including localStorage restored text)
    await this.sourceTextInput.click();
    await this.sourceTextInput.clear();
    await this.page.waitForTimeout(100);

    // pressSequentially triggers keyboard events that React handles properly
    // Use minimal delay - even 10000 chars at 0.5ms = 5 seconds
    await this.sourceTextInput.pressSequentially(text, { delay: 0.5 });

    // Wait for React state to sync
    await this.page.waitForTimeout(100);

    // Verify the value was set in DOM
    await expect(this.sourceTextInput).toHaveValue(text, { timeout: 5000 });
  }

  /**
   * Clear the source text input.
   */
  async clearSourceText(): Promise<void> {
    await this.sourceTextInput.clear();
  }

  /**
   * Get the current character count displayed.
   */
  async getCharacterCount(): Promise<{ current: number; max: number }> {
    const text = (await this.characterCounter.textContent()) ?? "";
    const numbers = text.match(/\d[\d\s]*/g)?.map((value) => parseInt(value.replace(/\D/g, ""), 10));

    if (numbers && numbers.length > 0) {
      const current = numbers[0] || 0;
      const max = numbers[numbers.length - 1] || VALIDATION_LIMITS.SOURCE_TEXT_MAX;
      return { current, max };
    }

    return { current: 0, max: VALIDATION_LIMITS.SOURCE_TEXT_MAX };
  }

  /**
   * Check if the generate button is enabled.
   */
  async isGenerateButtonEnabled(): Promise<boolean> {
    return this.generateButton.isEnabled();
  }

  /**
   * Click the generate button to start AI generation.
   */
  async clickGenerate(): Promise<void> {
    await expect(this.generateButton).toBeEnabled({ timeout: 5000 });
    await this.generateButton.click();
  }

  /**
   * Perform the full text input and generation action.
   */
  async generateFlashcards(sourceText: string): Promise<void> {
    await this.fillSourceText(sourceText);
    await this.clickGenerate();
  }

  // =============================================
  // Loading State Actions
  // =============================================

  /**
   * Wait for the generation to complete (loader disappears, proposals appear).
   */
  async waitForGenerationComplete(timeout = 60000): Promise<void> {
    // Wait for proposals to appear or error
    await Promise.race([
      this.reviewHeading.waitFor({ state: "visible", timeout }),
      this.errorAlert.waitFor({ state: "visible", timeout }),
    ]);
  }

  /**
   * Check if generation is in progress.
   */
  async isGenerating(): Promise<boolean> {
    const buttonText = await this.generateButton.textContent();
    return (
      buttonText?.toLowerCase().includes("generowanie") ||
      buttonText?.toLowerCase().includes("generating") ||
      (await this.skeletonCards.count()) > 0
    );
  }

  // =============================================
  // Review Section Actions
  // =============================================

  /**
   * Get the number of proposal cards displayed.
   */
  async getProposalCount(): Promise<number> {
    return this.proposalCards.count();
  }

  /**
   * Get a specific proposal card by index (0-based).
   */
  getProposalCard(index: number): Locator {
    return this.proposalCards.nth(index);
  }

  /**
   * Get the proposal card's front text.
   */
  async getProposalFront(index: number): Promise<string> {
    const card = this.getProposalCard(index);
    // Structure: <p>Przód (pytanie)</p><p>actual question</p>
    const frontLabel = card.getByText("Przód (pytanie)");
    const frontText = frontLabel.locator("xpath=following-sibling::p[1]");
    return (await frontText.textContent()) ?? "";
  }

  /**
   * Get the proposal card's back text.
   */
  async getProposalBack(index: number): Promise<string> {
    const card = this.getProposalCard(index);
    // Structure: <p>Tył (odpowiedź)</p><p>actual answer</p>
    const backLabel = card.getByText("Tył (odpowiedź)");
    const backText = backLabel.locator("xpath=following-sibling::p[1]");
    return (await backText.textContent()) ?? "";
  }

  /**
   * Check if a proposal is accepted (has "Zaakceptowana" text).
   */
  async isProposalAccepted(index: number): Promise<boolean> {
    const card = this.getProposalCard(index);
    // Look for badge text inside the card
    const acceptedBadge = card.getByText("Zaakceptowana");
    return acceptedBadge.isVisible();
  }

  /**
   * Check if a proposal is rejected (has "Odrzucona" text).
   */
  async isProposalRejected(index: number): Promise<boolean> {
    const card = this.getProposalCard(index);
    const rejectedBadge = card.getByText("Odrzucona");
    return rejectedBadge.isVisible();
  }

  /**
   * Click the edit button on a proposal card.
   */
  async editProposal(index: number): Promise<void> {
    const card = this.getProposalCard(index);
    await card.getByRole("button", { name: /edytuj|edit/i }).click();
  }

  /**
   * Edit the front text of a proposal (must be in edit mode).
   */
  async editProposalFront(index: number, newText: string): Promise<void> {
    const card = this.getProposalCard(index);
    const frontInput = card
      .locator('label:has-text("Przód")')
      .locator("..")
      .locator("textarea");
    await frontInput.click();
    await frontInput.clear();
    // Use pressSequentially for React controlled components
    await frontInput.pressSequentially(newText, { delay: 0.5 });
  }

  /**
   * Edit the back text of a proposal (must be in edit mode).
   */
  async editProposalBack(index: number, newText: string): Promise<void> {
    const card = this.getProposalCard(index);
    const backInput = card
      .locator('label:has-text("Tył")')
      .locator("..")
      .locator("textarea");
    await backInput.click();
    await backInput.clear();
    // Use pressSequentially for React controlled components
    await backInput.pressSequentially(newText, { delay: 0.5 });
  }

  /**
   * Save edited proposal.
   */
  async saveProposalEdit(index: number): Promise<void> {
    const card = this.getProposalCard(index);
    await card.getByRole("button", { name: /zapisz|save/i }).click();
  }

  /**
   * Cancel proposal edit.
   */
  async cancelProposalEdit(index: number): Promise<void> {
    const card = this.getProposalCard(index);
    await card.getByRole("button", { name: /anuluj|cancel/i }).click();
  }

  /**
   * Accept a proposal.
   */
  async acceptProposal(index: number): Promise<void> {
    const card = this.getProposalCard(index);
    await card.getByRole("button", { name: /akceptuj|accept/i }).click();
  }

  /**
   * Reject a proposal.
   */
  async rejectProposal(index: number): Promise<void> {
    const card = this.getProposalCard(index);
    await card.getByRole("button", { name: /odrzuć|reject/i }).click();
  }

  /**
   * Restore (undo reject) a proposal.
   */
  async restoreProposal(index: number): Promise<void> {
    const card = this.getProposalCard(index);
    await card.getByRole("button", { name: /przywróć|restore|undo/i }).click();
  }

  // =============================================
  // Bulk Actions
  // =============================================

  /**
   * Get the count of accepted flashcards ready to save.
   */
  async getAcceptedCount(): Promise<number> {
    const text = await this.acceptedCountText.textContent();
    const match = text?.match(/(\d+)/);
    return match ? parseInt(match[1], 10) : 0;
  }

  /**
   * Check if save button is enabled.
   */
  async isSaveButtonEnabled(): Promise<boolean> {
    return this.saveButton.isEnabled();
  }

  /**
   * Click save to save all accepted flashcards.
   */
  async saveAcceptedFlashcards(): Promise<void> {
    await this.saveButton.click();
  }

  /**
   * Click reject all to discard all proposals.
   */
  async rejectAllProposals(): Promise<void> {
    await this.rejectAllButton.click();
  }

  // =============================================
  // Success State Actions
  // =============================================

  /**
   * Wait for success state after saving.
   */
  async waitForSaveSuccess(timeout = 10000): Promise<void> {
    await this.successAlert.waitFor({ state: "visible", timeout });
  }

  /**
   * Get the number of saved flashcards from success message.
   */
  async getSavedCount(): Promise<number> {
    const text = await this.successAlert.textContent();
    const match = text?.match(/zapisano\s+(\d+)/i);
    return match ? parseInt(match[1], 10) : 0;
  }

  /**
   * Click to start a new generation after success.
   */
  async startNewGeneration(): Promise<void> {
    await this.newGenerationButton.click();
  }

  // =============================================
  // Error State Actions
  // =============================================

  /**
   * Check if error alert is visible.
   */
  async hasError(): Promise<boolean> {
    return this.errorAlert.isVisible();
  }

  /**
   * Get error message text.
   */
  async getErrorMessage(): Promise<string> {
    return (await this.errorAlert.textContent()) ?? "";
  }

  /**
   * Dismiss the error alert.
   */
  async dismissError(): Promise<void> {
    if (await this.errorDismissButton.isVisible()) {
      await this.errorDismissButton.click();
    }
  }

  // =============================================
  // Utility Methods
  // =============================================

  /**
   * Get the current view state based on visible elements.
   */
  async getCurrentViewState(): Promise<
    "idle" | "generating" | "review" | "saving" | "success" | "error"
  > {
    if (await this.successAlert.isVisible()) return "success";
    if (await this.errorAlert.isVisible()) return "error";
    if (await this.isGenerating()) return "generating";
    if (await this.reviewHeading.isVisible()) {
      const saveButtonText = await this.saveButton.textContent();
      if (saveButtonText?.includes("Zapisywanie")) return "saving";
      return "review";
    }
    return "idle";
  }

  /**
   * Wait for the page to be fully loaded and ready for interaction.
   */
  async waitForReady(): Promise<void> {
    await this.sourceTextInput.waitFor({ state: "visible" });
  }

  /**
   * Wait for text to be restored from localStorage after page reload.
   * @param expectedLength - Expected character count to wait for
   */
  async waitForLocalStorageRestore(expectedLength: number, timeout = 10000): Promise<void> {
    await this.sourceTextInput.waitFor({ state: "visible" });
    // Wait for the textarea to have content restored
    await this.page.waitForFunction(
      (expected) => {
        const textarea = document.querySelector("textarea");
        return textarea && textarea.value.length === expected;
      },
      expectedLength,
      { timeout }
    );
  }
}
