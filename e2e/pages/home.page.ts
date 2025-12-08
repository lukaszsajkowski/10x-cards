import type { Locator } from "@playwright/test";
import { BasePage } from "./base.page";

/**
 * Page Object Model for the Home page.
 */
export class HomePage extends BasePage {
  // Locators
  readonly heading: Locator;
  readonly loginLink: Locator;
  readonly registerLink: Locator;

  constructor(page: Parameters<typeof BasePage.prototype.constructor>[0]) {
    super(page);

    // Initialize locators
    this.heading = this.getByRole("heading", { level: 1 });
    this.loginLink = this.getByRole("link", { name: /zaloguj|login/i });
    this.registerLink = this.getByRole("link", { name: /zarejestruj|register/i });
  }

  async goto(): Promise<void> {
    await this.page.goto("/");
  }

  async clickLogin(): Promise<void> {
    await this.loginLink.click();
  }

  async clickRegister(): Promise<void> {
    await this.registerLink.click();
  }
}
