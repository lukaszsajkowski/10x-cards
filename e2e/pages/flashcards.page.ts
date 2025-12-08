import type { Locator } from "@playwright/test";
import { BasePage } from "./base.page";

/**
 * Page Object Model for the Flashcards page.
 */
export class FlashcardsPage extends BasePage {
  // Locators
  readonly heading: Locator;
  readonly createButton: Locator;
  readonly flashcardsList: Locator;
  readonly flashcardItems: Locator;
  readonly emptyState: Locator;
  readonly loadingState: Locator;

  constructor(page: Parameters<typeof BasePage.prototype.constructor>[0]) {
    super(page);

    // Initialize locators
    this.heading = this.getByRole("heading", { name: /fiszki|flashcards/i });
    this.createButton = this.getByRole("button", { name: /utwórz|create|dodaj|add/i });
    this.flashcardsList = this.page.locator('[data-testid="flashcards-list"]');
    this.flashcardItems = this.page.locator('[data-testid="flashcard-item"]');
    this.emptyState = this.page.locator('[data-testid="empty-state"]');
    this.loadingState = this.page.locator('[data-testid="loading-state"]');
  }

  async goto(): Promise<void> {
    await this.page.goto("/flashcards");
  }

  /**
   * Get the number of flashcard items displayed.
   */
  async getFlashcardCount(): Promise<number> {
    return this.flashcardItems.count();
  }

  /**
   * Check if the empty state is displayed.
   */
  async isEmptyStateVisible(): Promise<boolean> {
    return this.emptyState.isVisible();
  }

  /**
   * Wait for flashcards to load.
   */
  async waitForFlashcardsLoad(): Promise<void> {
    await this.loadingState.waitFor({ state: "hidden", timeout: 10000 }).catch(() => {
      // Loading state might not be visible if data loads quickly
    });
  }

  /**
   * Click the create flashcard button.
   */
  async clickCreate(): Promise<void> {
    await this.createButton.click();
  }
}
