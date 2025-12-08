import { test as base } from "@playwright/test";
import { HomePage } from "../pages/home.page";
import { LoginPage } from "../pages/login.page";
import { FlashcardsPage } from "../pages/flashcards.page";

/**
 * Extended test fixtures with Page Object Model.
 *
 * Usage:
 * ```ts
 * import { test, expect } from './fixtures/base';
 *
 * test('example', async ({ homePage }) => {
 *   await homePage.goto();
 *   await expect(homePage.heading).toBeVisible();
 * });
 * ```
 */
type Fixtures = {
  homePage: HomePage;
  loginPage: LoginPage;
  flashcardsPage: FlashcardsPage;
};

export const test = base.extend<Fixtures>({
  homePage: async ({ page }, use) => {
    const homePage = new HomePage(page);
    await use(homePage);
  },
  loginPage: async ({ page }, use) => {
    const loginPage = new LoginPage(page);
    await use(loginPage);
  },
  flashcardsPage: async ({ page }, use) => {
    const flashcardsPage = new FlashcardsPage(page);
    await use(flashcardsPage);
  },
});

export { expect } from "@playwright/test";
