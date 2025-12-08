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

    // Initialize locators
    this.emailInput = this.getByRole("textbox", { name: /email/i });
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
    await this.emailInput.fill(email);
    await this.passwordInput.fill(password);
    await this.submitButton.click();
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
    return this.errorMessage.textContent() ?? "";
  }
}
