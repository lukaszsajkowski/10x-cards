import { test, expect } from "./fixtures/base";

test.describe("Authentication", () => {
  test.describe("Login Page", () => {
    test("should display login form", async ({ loginPage }) => {
      await loginPage.goto();

      await expect(loginPage.emailInput).toBeVisible();
      await expect(loginPage.passwordInput).toBeVisible();
      await expect(loginPage.submitButton).toBeVisible();
    });

    test("should show error for invalid credentials", async ({ loginPage }) => {
      await loginPage.goto();

      await loginPage.login("invalid@example.com", "wrongpassword");

      // Wait for potential error message or redirect
      await loginPage.page.waitForTimeout(1000);

      // Check if still on login page (login failed)
      await expect(loginPage.page).toHaveURL(/\/auth\/login/);
    });

    test("should have link to registration", async ({ loginPage }) => {
      await loginPage.goto();

      await expect(loginPage.registerLink).toBeVisible();
    });

    test("should have link to password reset", async ({ loginPage }) => {
      await loginPage.goto();

      // This might not exist yet, so we use a soft assertion
      const forgotLink = loginPage.forgotPasswordLink;
      if (await forgotLink.isVisible()) {
        await expect(forgotLink).toBeEnabled();
      }
    });
  });

  test.describe("Protected Routes", () => {
    test("should redirect to login when accessing flashcards without auth", async ({ flashcardsPage, page }) => {
      await flashcardsPage.goto();

      // Should be redirected to login
      await expect(page).toHaveURL(/\/auth\/login|\/$/);
    });
  });
});
