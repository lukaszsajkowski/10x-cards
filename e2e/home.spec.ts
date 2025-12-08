import { test, expect } from "./fixtures/base";

test.describe("Home Page", () => {
  test("should display the home page or redirect to login", async ({ homePage, page }) => {
    await homePage.goto();

    // Home page redirects to login when not authenticated
    // This is expected behavior - verify we land on a valid page
    await expect(page).toHaveURL(/\/(auth\/login)?$/);
  });

  test("should navigate to login page", async ({ page }) => {
    await page.goto("/");

    // Should redirect to login when not authenticated
    await expect(page).toHaveURL(/\/auth\/login/);
  });

  test("should be responsive on mobile", async ({ page }) => {
    // Test mobile viewport
    await page.setViewportSize({ width: 375, height: 667 });
    await page.goto("/");

    // Page should still be functional on mobile
    await expect(page.locator("body")).toBeVisible();
  });
});
