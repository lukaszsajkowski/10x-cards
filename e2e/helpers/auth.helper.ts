import type { Page, BrowserContext, APIResponse } from "@playwright/test";
import { TEST_USERS } from "./test-data";

/**
 * Authentication helper for E2E tests.
 * Provides methods for programmatic login to speed up tests.
 */

/**
 * Try to log in; if user does not exist, register and retry.
 */
async function ensureTestUser(
  page: Page,
  email: string,
  password: string
): Promise<APIResponse> {
  const doLogin = () =>
    page.request.post("/api/auth/login", {
      data: { email, password },
    });

  let response = await doLogin();

  if (response.status() === 400 || response.status() === 401) {
    // Attempt to register then login again
    await page.request.post("/api/auth/register", {
      data: { email, password },
    });
    response = await doLogin();
  }

  if (!response.ok()) {
    throw new Error(`Login failed: ${response.status()} ${await response.text()}`);
  }

  return response;
}

/**
 * Helper to fill input and trigger React onChange properly.
 */
async function fillInputWithReactSupport(
  page: Page,
  selector: string,
  value: string
): Promise<void> {
  const input = page.locator(selector);
  await input.click();
  await input.clear();
  await input.pressSequentially(value, { delay: 5 });
}

/**
 * Login via UI (slower but more realistic).
 */
export async function loginViaUI(
  page: Page,
  email: string = TEST_USERS.STANDARD.email,
  password: string = TEST_USERS.STANDARD.password
): Promise<void> {
  // Ensure the user exists before UI flow
  await ensureTestUser(page, email, password);

  await page.goto("/auth/login");

  // If the user is already authenticated, /auth/login will redirect – in that
  // case skip the form and keep the existing session.
  if (!page.url().includes("/auth/login")) {
    return;
  }

  const emailInput = page.locator('input[type="email"]');
  await emailInput.waitFor({ state: "visible", timeout: 5000 });

  // Use pressSequentially to properly trigger React's controlled component updates
  await fillInputWithReactSupport(page, 'input[type="email"]', email);
  await fillInputWithReactSupport(page, 'input[type="password"]', password);

  await page.getByRole("button", { name: /zaloguj|login/i }).click();

  // Wait for redirect to authenticated area
  await page.waitForURL(/\/(generate|flashcards|generations)/, {
    timeout: 10000,
  });
}

/**
 * Login via API (faster, for tests that don't test login flow).
 */
export async function loginViaAPI(
  page: Page,
  email: string = TEST_USERS.STANDARD.email,
  password: string = TEST_USERS.STANDARD.password
): Promise<void> {
  await ensureTestUser(page, email, password);
}

/**
 * Logout via API.
 */
export async function logout(page: Page): Promise<void> {
  await page.request.post("/api/auth/logout");
}

/**
 * Check if user is authenticated by trying to access a protected page.
 */
export async function isAuthenticated(page: Page): Promise<boolean> {
  const response = await page.request.get("/api/flashcards");
  return response.status() !== 401;
}

/**
 * Setup authenticated state that can be reused across tests.
 * Use this in globalSetup to create a storageState file.
 */
export async function setupAuthenticatedState(
  page: Page,
  storageStatePath: string
): Promise<void> {
  await loginViaUI(page);
  await page.context().storageState({ path: storageStatePath });
}

/**
 * Create a new browser context with pre-authenticated state.
 */
export async function createAuthenticatedContext(
  context: BrowserContext,
  storageStatePath: string
): Promise<BrowserContext> {
  // This would be used if we had pre-saved storage state
  // For now, we'll login fresh in each test suite
  return context;
}
