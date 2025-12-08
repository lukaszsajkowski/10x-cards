import type { Page, Locator } from "@playwright/test";

/**
 * Base Page Object Model class.
 * All page objects should extend this class.
 */
export abstract class BasePage {
  protected readonly page: Page;

  constructor(page: Page) {
    this.page = page;
  }

  /**
   * Navigate to the page URL.
   */
  abstract goto(): Promise<void>;

  /**
   * Wait for the page to be fully loaded.
   */
  async waitForLoad(): Promise<void> {
    await this.page.waitForLoadState("networkidle");
  }

  /**
   * Get a locator for an element by test ID.
   */
  protected getByTestId(testId: string): Locator {
    return this.page.getByTestId(testId);
  }

  /**
   * Get a locator for an element by role.
   */
  protected getByRole(
    role: Parameters<Page["getByRole"]>[0],
    options?: Parameters<Page["getByRole"]>[1]
  ): Locator {
    return this.page.getByRole(role, options);
  }

  /**
   * Get a locator for an element by text.
   */
  protected getByText(
    text: string | RegExp,
    options?: Parameters<Page["getByText"]>[1]
  ): Locator {
    return this.page.getByText(text, options);
  }

  /**
   * Take a screenshot of the current page state.
   */
  async screenshot(name: string): Promise<Buffer> {
    return this.page.screenshot({ path: `screenshots/${name}.png` });
  }
}
