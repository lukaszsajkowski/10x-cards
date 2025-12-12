/**
 * Test data helpers for E2E tests.
 * Provides fixtures for various test scenarios.
 */

import { VALIDATION_LIMITS } from "../pages/generate.page";

/**
 * Generate a string of specified length with realistic content.
 */
export function generateText(length: number, baseContent?: string): string {
  const defaultContent = `
    Sztuczna inteligencja (AI) to dziedzina informatyki zajmująca się tworzeniem
    systemów zdolnych do wykonywania zadań wymagających ludzkiej inteligencji.
    Obejmuje to rozpoznawanie mowy, uczenie się, planowanie i rozwiązywanie problemów.
    Machine learning jest podzbiorem AI, który umożliwia systemom automatyczne uczenie
    się i doskonalenie na podstawie doświadczeń bez jawnego programowania.
    Deep learning to technika uczenia maszynowego wykorzystująca sztuczne sieci
    neuronowe o wielu warstwach do analizy różnych czynników danych.
    Sieci neuronowe są inspirowane strukturą ludzkiego mózgu i składają się z
    połączonych węzłów przetwarzających informacje. Przetwarzanie języka naturalnego
    (NLP) pozwala komputerom rozumieć, interpretować i generować ludzki język.
    Computer vision umożliwia maszynom interpretację i rozumienie informacji wizualnych
    ze świata rzeczywistego. Algorytmy uczenia ze wzmocnieniem uczą się poprzez
    interakcję ze środowiskiem, otrzymując nagrody lub kary za swoje działania.
    Transformery to architektura sieci neuronowych szczególnie skuteczna w zadaniach
    związanych z sekwencjami, jak tłumaczenie czy generowanie tekstu.
    GPT (Generative Pre-trained Transformer) to rodzina modeli językowych opracowanych
    przez OpenAI, zdolnych do generowania tekstu podobnego do ludzkiego.
    BERT (Bidirectional Encoder Representations from Transformers) to model stworzony
    przez Google, rewolucjonizujący rozumienie kontekstu w NLP.
    Etyka AI zajmuje się kwestiami moralnymi związanymi z rozwojem i zastosowaniem
    sztucznej inteligencji, w tym stronniczością algorytmów i prywatnością danych.
  `;

  const content = baseContent || defaultContent;
  const repeatedContent = content.repeat(Math.ceil(length / content.length));
  return repeatedContent.slice(0, length);
}

/**
 * Test data fixtures for various scenarios.
 */
export const TEST_DATA = {
  /**
   * Source text at minimum required length (1000 characters).
   */
  SOURCE_TEXT_MIN: generateText(VALIDATION_LIMITS.SOURCE_TEXT_MIN),

  /**
   * Source text at maximum allowed length (10000 characters).
   */
  SOURCE_TEXT_MAX: generateText(VALIDATION_LIMITS.SOURCE_TEXT_MAX),

  /**
   * Source text below minimum (should fail validation).
   */
  SOURCE_TEXT_TOO_SHORT: generateText(VALIDATION_LIMITS.SOURCE_TEXT_MIN - 1),

  /**
   * Source text above maximum (should fail validation).
   */
  SOURCE_TEXT_TOO_LONG: generateText(VALIDATION_LIMITS.SOURCE_TEXT_MAX + 1),

  /**
   * Standard source text for happy path tests (5000 characters).
   */
  SOURCE_TEXT_STANDARD: generateText(5000),

  /**
   * Empty source text.
   */
  SOURCE_TEXT_EMPTY: "",

  /**
   * Source text with special characters.
   */
  SOURCE_TEXT_SPECIAL_CHARS: generateText(
    1500,
    `
    Test z polskimi znakami: ąćęłńóśźż ĄĆĘŁŃÓŚŹŻ.
    Znaki specjalne: @#$%^&*()_+-=[]{}|;':",./<>?
    Emoji: 🎓📚✨🔥💡
    Formuły matematyczne: E=mc², ∑(i=1..n), √2, π, ∞
    Kod: function test() { return "hello"; }
    `
  ),

  /**
   * Flashcard front text at maximum length.
   */
  FLASHCARD_FRONT_MAX: "A".repeat(VALIDATION_LIMITS.FRONT_MAX),

  /**
   * Flashcard back text at maximum length.
   */
  FLASHCARD_BACK_MAX: "B".repeat(VALIDATION_LIMITS.BACK_MAX),

  /**
   * Flashcard front text exceeding maximum.
   */
  FLASHCARD_FRONT_TOO_LONG: "A".repeat(VALIDATION_LIMITS.FRONT_MAX + 1),

  /**
   * Flashcard back text exceeding maximum.
   */
  FLASHCARD_BACK_TOO_LONG: "B".repeat(VALIDATION_LIMITS.BACK_MAX + 1),

  /**
   * Valid edited flashcard content.
   */
  EDITED_FLASHCARD: {
    front: "Zmienione pytanie testowe?",
    back: "Zmieniona odpowiedź testowa.",
  },
} as const;

/**
 * Test user credentials.
 * These should match users in the test database.
 */
export const TEST_USERS = {
  /**
   * Standard test user for most scenarios.
   */
  STANDARD: {
    // Prefer explicit E2E_USERNAME/E2E_PASSWORD from .env.test; fall back to legacy vars
    email:
      process.env.E2E_USERNAME ||
      process.env.E2E_TEST_USER_EMAIL ||
      "e2e-test@example.com",
    password:
      process.env.E2E_PASSWORD ||
      process.env.E2E_TEST_USER_PASSWORD ||
      "TestPassword123!",
  },

  /**
   * User with existing flashcards.
   */
  WITH_FLASHCARDS: {
    email:
      process.env.E2E_TEST_USER_WITH_DATA_EMAIL ||
      process.env.E2E_USERNAME ||
      "e2e-test-data@example.com",
    password:
      process.env.E2E_TEST_USER_WITH_DATA_PASSWORD ||
      process.env.E2E_PASSWORD ||
      "TestPassword123!",
  },
} as const;

/**
 * Expected validation error messages (Polish).
 */
export const VALIDATION_MESSAGES = {
  SOURCE_TEXT_TOO_SHORT: `Tekst musi mieć minimum ${VALIDATION_LIMITS.SOURCE_TEXT_MIN} znaków`,
  SOURCE_TEXT_TOO_LONG: `Tekst może mieć maksymalnie ${VALIDATION_LIMITS.SOURCE_TEXT_MAX} znaków`,
  FRONT_REQUIRED: "Pole wymagane",
  BACK_REQUIRED: "Pole wymagane",
  FRONT_TOO_LONG: `Maksymalnie ${VALIDATION_LIMITS.FRONT_MAX} znaków`,
  BACK_TOO_LONG: `Maksymalnie ${VALIDATION_LIMITS.BACK_MAX} znaków`,
} as const;

/**
 * Timeouts for various operations.
 */
export const TIMEOUTS = {
  /**
   * AI generation can take up to 60 seconds.
   */
  AI_GENERATION: 60000,

  /**
   * Page navigation timeout.
   */
  NAVIGATION: 10000,

  /**
   * Form submission timeout.
   */
  FORM_SUBMIT: 10000,

  /**
   * Animation/transition timeout.
   */
  ANIMATION: 1000,
} as const;
