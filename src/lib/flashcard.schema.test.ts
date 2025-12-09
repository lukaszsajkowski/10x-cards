import { describe, it, expect } from "vitest";
import {
  flashcardDraftSchema,
  createFlashcardsCommandSchema,
  flashcardListQuerySchema,
  flashcardIdParamSchema,
  updateFlashcardCommandSchema,
} from "./flashcard.schema";

// Test data constants
const VALID_UUID = "550e8400-e29b-41d4-a716-446655440000";
const INVALID_UUID = "not-a-uuid";
const FRONT_MAX_LENGTH = 200;
const BACK_MAX_LENGTH = 500;
const MAX_BATCH_SIZE = 100;

// Helper to create valid flashcard draft
const createValidDraft = (overrides = {}) => ({
  front: "What is TypeScript?",
  back: "TypeScript is a typed superset of JavaScript.",
  source: "manual" as const,
  generation_id: null,
  ...overrides,
});

// Helper to create valid AI draft
const createValidAiDraft = (overrides = {}) => ({
  front: "What is TypeScript?",
  back: "TypeScript is a typed superset of JavaScript.",
  source: "ai-full" as const,
  generation_id: VALID_UUID,
  ...overrides,
});

describe("flashcardDraftSchema", () => {
  describe("valid inputs", () => {
    it("should accept valid manual flashcard with null generation_id", () => {
      const input = createValidDraft();
      const result = flashcardDraftSchema.safeParse(input);

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data).toEqual(input);
      }
    });

    it("should accept valid ai-full flashcard with generation_id", () => {
      const input = createValidAiDraft({ source: "ai-full" });
      const result = flashcardDraftSchema.safeParse(input);

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.source).toBe("ai-full");
        expect(result.data.generation_id).toBe(VALID_UUID);
      }
    });

    it("should accept valid ai-edited flashcard with generation_id", () => {
      const input = createValidAiDraft({ source: "ai-edited" });
      const result = flashcardDraftSchema.safeParse(input);

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.source).toBe("ai-edited");
      }
    });

    it("should accept front with exactly 1 character", () => {
      const input = createValidDraft({ front: "A" });
      const result = flashcardDraftSchema.safeParse(input);

      expect(result.success).toBe(true);
    });

    it("should accept front with exactly max length characters", () => {
      const input = createValidDraft({ front: "A".repeat(FRONT_MAX_LENGTH) });
      const result = flashcardDraftSchema.safeParse(input);

      expect(result.success).toBe(true);
    });

    it("should accept back with exactly max length characters", () => {
      const input = createValidDraft({ back: "A".repeat(BACK_MAX_LENGTH) });
      const result = flashcardDraftSchema.safeParse(input);

      expect(result.success).toBe(true);
    });
  });

  describe("front field validation", () => {
    it("should reject empty front", () => {
      const input = createValidDraft({ front: "" });
      const result = flashcardDraftSchema.safeParse(input);

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.flatten().fieldErrors.front).toContain("front is required");
      }
    });

    it("should reject front exceeding max length", () => {
      const input = createValidDraft({ front: "A".repeat(FRONT_MAX_LENGTH + 1) });
      const result = flashcardDraftSchema.safeParse(input);

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.flatten().fieldErrors.front).toContain(
          `front must be at most ${FRONT_MAX_LENGTH} characters long`
        );
      }
    });

    it("should reject non-string front", () => {
      const input = createValidDraft({ front: 123 });
      const result = flashcardDraftSchema.safeParse(input);

      expect(result.success).toBe(false);
    });
  });

  describe("back field validation", () => {
    it("should reject empty back", () => {
      const input = createValidDraft({ back: "" });
      const result = flashcardDraftSchema.safeParse(input);

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.flatten().fieldErrors.back).toContain("back is required");
      }
    });

    it("should reject back exceeding max length", () => {
      const input = createValidDraft({ back: "A".repeat(BACK_MAX_LENGTH + 1) });
      const result = flashcardDraftSchema.safeParse(input);

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.flatten().fieldErrors.back).toContain(
          `back must be at most ${BACK_MAX_LENGTH} characters long`
        );
      }
    });
  });

  describe("source field validation", () => {
    it("should reject invalid source value", () => {
      const input = createValidDraft({ source: "invalid" });
      const result = flashcardDraftSchema.safeParse(input);

      expect(result.success).toBe(false);
    });

    it("should accept all valid source values", () => {
      const sources = ["ai-full", "ai-edited", "manual"] as const;

      sources.forEach((source) => {
        const input =
          source === "manual"
            ? createValidDraft({ source })
            : createValidAiDraft({ source });
        const result = flashcardDraftSchema.safeParse(input);

        expect(result.success).toBe(true);
      });
    });
  });

  describe("source and generation_id business rules", () => {
    it("should reject manual source with non-null generation_id", () => {
      const input = createValidDraft({
        source: "manual",
        generation_id: VALID_UUID,
      });
      const result = flashcardDraftSchema.safeParse(input);

      expect(result.success).toBe(false);
      if (!result.success) {
        const errors = result.error.flatten().fieldErrors;
        expect(errors.generation_id).toContain(
          "generation_id must be null when source is manual"
        );
      }
    });

    it("should reject ai-full source with null generation_id", () => {
      const input = createValidAiDraft({
        source: "ai-full",
        generation_id: null,
      });
      const result = flashcardDraftSchema.safeParse(input);

      expect(result.success).toBe(false);
      if (!result.success) {
        const errors = result.error.flatten().fieldErrors;
        expect(errors.generation_id).toContain("generation_id is required for AI sources");
      }
    });

    it("should reject ai-edited source with null generation_id", () => {
      const input = createValidAiDraft({
        source: "ai-edited",
        generation_id: null,
      });
      const result = flashcardDraftSchema.safeParse(input);

      expect(result.success).toBe(false);
      if (!result.success) {
        const errors = result.error.flatten().fieldErrors;
        expect(errors.generation_id).toContain("generation_id is required for AI sources");
      }
    });

    it("should reject ai-full source with invalid UUID", () => {
      const input = createValidAiDraft({
        source: "ai-full",
        generation_id: INVALID_UUID,
      });
      const result = flashcardDraftSchema.safeParse(input);

      expect(result.success).toBe(false);
    });
  });
});

describe("createFlashcardsCommandSchema", () => {
  describe("valid inputs", () => {
    it("should accept array with single flashcard", () => {
      const input = { flashcards: [createValidDraft()] };
      const result = createFlashcardsCommandSchema.safeParse(input);

      expect(result.success).toBe(true);
    });

    it("should accept array with multiple flashcards", () => {
      const input = {
        flashcards: [
          createValidDraft({ front: "Question 1" }),
          createValidAiDraft({ front: "Question 2" }),
        ],
      };
      const result = createFlashcardsCommandSchema.safeParse(input);

      expect(result.success).toBe(true);
    });

    it("should accept array with max batch size", () => {
      const flashcards = Array.from({ length: MAX_BATCH_SIZE }, (_, i) =>
        createValidDraft({ front: `Question ${i + 1}` })
      );
      const input = { flashcards };
      const result = createFlashcardsCommandSchema.safeParse(input);

      expect(result.success).toBe(true);
    });
  });

  describe("invalid inputs", () => {
    it("should reject empty flashcards array", () => {
      const input = { flashcards: [] };
      const result = createFlashcardsCommandSchema.safeParse(input);

      expect(result.success).toBe(false);
    });

    it("should reject array exceeding max batch size", () => {
      const flashcards = Array.from({ length: MAX_BATCH_SIZE + 1 }, (_, i) =>
        createValidDraft({ front: `Question ${i + 1}` })
      );
      const input = { flashcards };
      const result = createFlashcardsCommandSchema.safeParse(input);

      expect(result.success).toBe(false);
    });

    it("should reject missing flashcards property", () => {
      const input = {};
      const result = createFlashcardsCommandSchema.safeParse(input);

      expect(result.success).toBe(false);
    });

    it("should reject invalid flashcard in array", () => {
      const input = {
        flashcards: [createValidDraft(), { front: "", back: "Valid", source: "manual", generation_id: null }],
      };
      const result = createFlashcardsCommandSchema.safeParse(input);

      expect(result.success).toBe(false);
    });
  });
});

describe("flashcardListQuerySchema", () => {
  describe("default values", () => {
    it("should apply default values for empty object", () => {
      const result = flashcardListQuerySchema.safeParse({});

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data).toEqual({
          page: 1,
          limit: 10,
          sort: "created_at",
          order: "desc",
        });
      }
    });
  });

  describe("page validation", () => {
    it("should coerce string to number", () => {
      const result = flashcardListQuerySchema.safeParse({ page: "5" });

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.page).toBe(5);
      }
    });

    it("should reject page less than 1", () => {
      const result = flashcardListQuerySchema.safeParse({ page: 0 });

      expect(result.success).toBe(false);
    });

    it("should reject negative page", () => {
      const result = flashcardListQuerySchema.safeParse({ page: -1 });

      expect(result.success).toBe(false);
    });

    it("should reject non-integer page", () => {
      const result = flashcardListQuerySchema.safeParse({ page: 1.5 });

      expect(result.success).toBe(false);
    });
  });

  describe("limit validation", () => {
    it("should coerce string to number", () => {
      const result = flashcardListQuerySchema.safeParse({ limit: "50" });

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.limit).toBe(50);
      }
    });

    it("should reject limit less than 1", () => {
      const result = flashcardListQuerySchema.safeParse({ limit: 0 });

      expect(result.success).toBe(false);
    });

    it("should reject limit greater than 100", () => {
      const result = flashcardListQuerySchema.safeParse({ limit: 101 });

      expect(result.success).toBe(false);
    });

    it("should accept limit at boundary (1 and 100)", () => {
      expect(flashcardListQuerySchema.safeParse({ limit: 1 }).success).toBe(true);
      expect(flashcardListQuerySchema.safeParse({ limit: 100 }).success).toBe(true);
    });
  });

  describe("sort validation", () => {
    it("should accept created_at", () => {
      const result = flashcardListQuerySchema.safeParse({ sort: "created_at" });

      expect(result.success).toBe(true);
    });

    it("should reject invalid sort value", () => {
      const result = flashcardListQuerySchema.safeParse({ sort: "invalid" });

      expect(result.success).toBe(false);
    });
  });

  describe("order validation", () => {
    it("should accept asc", () => {
      const result = flashcardListQuerySchema.safeParse({ order: "asc" });

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.order).toBe("asc");
      }
    });

    it("should accept desc", () => {
      const result = flashcardListQuerySchema.safeParse({ order: "desc" });

      expect(result.success).toBe(true);
    });

    it("should reject invalid order value", () => {
      const result = flashcardListQuerySchema.safeParse({ order: "random" });

      expect(result.success).toBe(false);
    });
  });

  describe("optional filters", () => {
    it("should accept valid source filter", () => {
      const result = flashcardListQuerySchema.safeParse({ source: "ai-full" });

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.source).toBe("ai-full");
      }
    });

    it("should accept valid generation_id filter", () => {
      const result = flashcardListQuerySchema.safeParse({ generation_id: VALID_UUID });

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.generation_id).toBe(VALID_UUID);
      }
    });

    it("should reject invalid generation_id format", () => {
      const result = flashcardListQuerySchema.safeParse({ generation_id: INVALID_UUID });

      expect(result.success).toBe(false);
    });
  });
});

describe("flashcardIdParamSchema", () => {
  it("should accept valid UUID", () => {
    const result = flashcardIdParamSchema.safeParse({ id: VALID_UUID });

    expect(result.success).toBe(true);
  });

  it("should reject invalid UUID", () => {
    const result = flashcardIdParamSchema.safeParse({ id: INVALID_UUID });

    expect(result.success).toBe(false);
  });

  it("should reject missing id", () => {
    const result = flashcardIdParamSchema.safeParse({});

    expect(result.success).toBe(false);
  });

  it("should reject empty string", () => {
    const result = flashcardIdParamSchema.safeParse({ id: "" });

    expect(result.success).toBe(false);
  });
});

describe("updateFlashcardCommandSchema", () => {
  describe("partial update validation", () => {
    it("should accept update with only front", () => {
      const result = updateFlashcardCommandSchema.safeParse({ front: "New question" });

      expect(result.success).toBe(true);
    });

    it("should accept update with only back", () => {
      const result = updateFlashcardCommandSchema.safeParse({ back: "New answer" });

      expect(result.success).toBe(true);
    });

    it("should accept update with both front and back", () => {
      const result = updateFlashcardCommandSchema.safeParse({
        front: "New question",
        back: "New answer",
      });

      expect(result.success).toBe(true);
    });

    it("should reject empty update (no fields)", () => {
      const result = updateFlashcardCommandSchema.safeParse({});

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.flatten().formErrors).toContain("No fields to update");
      }
    });
  });

  describe("front and back field validation", () => {
    it("should reject empty front when provided", () => {
      const result = updateFlashcardCommandSchema.safeParse({ front: "" });

      expect(result.success).toBe(false);
    });

    it("should reject front exceeding max length", () => {
      const result = updateFlashcardCommandSchema.safeParse({
        front: "A".repeat(FRONT_MAX_LENGTH + 1),
      });

      expect(result.success).toBe(false);
    });

    it("should reject empty back when provided", () => {
      const result = updateFlashcardCommandSchema.safeParse({ back: "" });

      expect(result.success).toBe(false);
    });

    it("should reject back exceeding max length", () => {
      const result = updateFlashcardCommandSchema.safeParse({
        back: "A".repeat(BACK_MAX_LENGTH + 1),
      });

      expect(result.success).toBe(false);
    });
  });

  describe("source change to manual", () => {
    it("should accept changing to manual with null generation_id", () => {
      const result = updateFlashcardCommandSchema.safeParse({
        source: "manual",
        generation_id: null,
      });

      expect(result.success).toBe(true);
    });

    it("should accept changing to manual without generation_id", () => {
      const result = updateFlashcardCommandSchema.safeParse({
        source: "manual",
      });

      expect(result.success).toBe(true);
    });

    it("should reject changing to manual with non-null generation_id", () => {
      const result = updateFlashcardCommandSchema.safeParse({
        source: "manual",
        generation_id: VALID_UUID,
      });

      expect(result.success).toBe(false);
      if (!result.success) {
        const errors = result.error.flatten().fieldErrors;
        expect(errors.generation_id).toContain(
          "generation_id must be null when source is manual"
        );
      }
    });
  });

  describe("source change to AI", () => {
    it("should accept changing to ai-full with valid generation_id", () => {
      const result = updateFlashcardCommandSchema.safeParse({
        source: "ai-full",
        generation_id: VALID_UUID,
      });

      expect(result.success).toBe(true);
    });

    it("should accept changing to ai-edited with valid generation_id", () => {
      const result = updateFlashcardCommandSchema.safeParse({
        source: "ai-edited",
        generation_id: VALID_UUID,
      });

      expect(result.success).toBe(true);
    });

    it("should reject changing to ai-full without generation_id", () => {
      const result = updateFlashcardCommandSchema.safeParse({
        source: "ai-full",
      });

      expect(result.success).toBe(false);
      if (!result.success) {
        const errors = result.error.flatten().fieldErrors;
        expect(errors.generation_id).toContain(
          "generation_id is required when updating source to AI"
        );
      }
    });

    it("should reject changing to ai-edited without generation_id", () => {
      const result = updateFlashcardCommandSchema.safeParse({
        source: "ai-edited",
      });

      expect(result.success).toBe(false);
      if (!result.success) {
        const errors = result.error.flatten().fieldErrors;
        expect(errors.generation_id).toContain(
          "generation_id is required when updating source to AI"
        );
      }
    });

    it("should reject changing to ai-full with null generation_id", () => {
      const result = updateFlashcardCommandSchema.safeParse({
        source: "ai-full",
        generation_id: null,
      });

      expect(result.success).toBe(false);
      if (!result.success) {
        const errors = result.error.flatten().fieldErrors;
        expect(errors.generation_id).toContain("generation_id is required for AI sources");
      }
    });
  });

  describe("generation_id only update", () => {
    it("should accept updating only generation_id with valid UUID", () => {
      const result = updateFlashcardCommandSchema.safeParse({
        generation_id: VALID_UUID,
      });

      expect(result.success).toBe(true);
    });

    it("should accept updating only generation_id to null", () => {
      const result = updateFlashcardCommandSchema.safeParse({
        generation_id: null,
      });

      expect(result.success).toBe(true);
    });

    it("should reject invalid generation_id format", () => {
      const result = updateFlashcardCommandSchema.safeParse({
        generation_id: INVALID_UUID,
      });

      expect(result.success).toBe(false);
    });
  });

  describe("combined field updates", () => {
    it("should accept updating front, back, and source together", () => {
      const result = updateFlashcardCommandSchema.safeParse({
        front: "New question",
        back: "New answer",
        source: "manual",
        generation_id: null,
      });

      expect(result.success).toBe(true);
    });

    it("should accept updating content while changing to AI source", () => {
      const result = updateFlashcardCommandSchema.safeParse({
        front: "AI generated question",
        back: "AI generated answer",
        source: "ai-full",
        generation_id: VALID_UUID,
      });

      expect(result.success).toBe(true);
    });
  });
});
