import type { Locator } from "@playwright/test";
import { BasePage } from "./base.page";

/**
 * Page Object Model for the Login page.
 */
export class LoginPage extends BasePage {
  // Locators
  readonly emailInput: Locator;
  readonly passwordInput: Locator;
  readonly submitButton: Locator;
  readonly errorMessage: Locator;
  readonly registerLink: Locator;
  readonly forgotPasswordLink: Locator;

  constructor(page: Parameters<typeof BasePage.prototype.constructor>[0]) {
    super(page);

    // Initialize locators - use more specific selectors
    this.emailInput = this.page.locator('input[type="email"]');
    this.passwordInput = this.page.locator('input[type="password"]');
    this.submitButton = this.getByRole("button", { name: /zaloguj|login|sign in/i });
    this.errorMessage = this.getByRole("alert");
    this.registerLink = this.getByRole("link", { name: /zarejestruj|register|sign up/i });
    this.forgotPasswordLink = this.getByRole("link", { name: /zapomniałem|forgot|reset/i });
  }

  async goto(): Promise<void> {
    await this.page.goto("/auth/login");
  }

  /**
   * Fill in the login form and submit.
   */
  async login(email: string, password: string): Promise<void> {
    // Use pressSequentially to trigger React onChange for each character
    await this.emailInput.click();
    await this.emailInput.clear();
    await this.emailInput.pressSequentially(email, { delay: 10 });

    await this.passwordInput.click();
    await this.passwordInput.clear();
    await this.passwordInput.pressSequentially(password, { delay: 10 });

    // Wait for React state to update and button to become enabled
    await this.submitButton.waitFor({ state: "visible" });
    await this.submitButton.click({ timeout: 10000 });
  }

  /**
   * Check if there's an error message displayed.
   */
  async hasError(): Promise<boolean> {
    return this.errorMessage.isVisible();
  }

  /**
   * Get the error message text.
   */
  async getErrorText(): Promise<string> {
    const text = await this.errorMessage.textContent();
    return text ?? "";
  }
}
