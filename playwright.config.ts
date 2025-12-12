import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { defineConfig, devices } from "@playwright/test";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const envFile = process.env.PLAYWRIGHT_ENV_FILE ?? ".env.test";
const envPath = path.resolve(__dirname, envFile);

if (!fs.existsSync(envPath)) {
  throw new Error(
    `Missing Playwright env file at ${envPath}. Provide ${envFile} before running E2E tests.`,
  );
}

const parsedEnv = fs
  .readFileSync(envPath, "utf8")
  .split("\n")
  .map((line) => line.trim())
  .filter((line) => line && !line.startsWith("#"))
  .reduce<Record<string, string>>((acc, line) => {
    const delimiterIndex = line.indexOf("=");
    if (delimiterIndex === -1) {
      return acc;
    }

    const key = line.slice(0, delimiterIndex).trim();
    const value = line.slice(delimiterIndex + 1).trim().replace(/^['"]|['"]$/g, "");

    if (key && !(key in acc)) {
      acc[key] = value;
    }

    return acc;
  }, {});

for (const [key, value] of Object.entries(parsedEnv)) {
  if (process.env[key] === undefined) {
    process.env[key] = value;
  }
}

/**
 * Playwright configuration for E2E testing.
 * See https://playwright.dev/docs/test-configuration
 */
export default defineConfig({
  // Test directory
  testDir: "./e2e",

  // Global teardown to clean Supabase test data after the suite finishes
  globalTeardown: "./e2e/playwright.teardown.ts",

  // Run tests in files in parallel
  fullyParallel: true,

  // Fail the build on CI if you accidentally left test.only in the source code
  forbidOnly: !!process.env.CI,

  // Retry on CI only
  retries: process.env.CI ? 2 : 0,

  // Opt out of parallel tests on CI
  workers: process.env.CI ? 1 : undefined,

  // Reporter to use
  reporter: [
    ["html", { outputFolder: "playwright-report" }],
    ["list"],
    ...(process.env.CI ? [["github" as const]] : []),
  ],

  // Shared settings for all the projects below
  use: {
    // Base URL to use in actions like `await page.goto('/')`
    baseURL: process.env.PLAYWRIGHT_BASE_URL || "http://localhost:3000",

    // Collect trace when retrying the failed test
    trace: "on-first-retry",

    // Capture screenshot on failure
    screenshot: "only-on-failure",

    // Record video on failure
    video: "on-first-retry",

    // Set viewport size
    viewport: { width: 1280, height: 720 },
  },

  // Configure projects for major browsers - only Chromium as per guidelines
  projects: [
    {
      name: "chromium",
      use: { ...devices["Desktop Chrome"] },
    },
    // Mobile viewport testing
    {
      name: "mobile-chrome",
      use: { ...devices["Pixel 5"] },
    },
  ],

  // Run your local dev server before starting the tests
  webServer: {
    command: "npm run dev",
    url: "http://localhost:3000",
    reuseExistingServer: true,
    timeout: 120 * 1000,
  },

  // Test timeout
  timeout: 30 * 1000,

  // Expect timeout
  expect: {
    timeout: 5 * 1000,
  },

  // Output folder for test artifacts
  outputDir: "test-results",
});
