import { describe, it, expect } from "vitest";
import {
  createGenerationCommandSchema,
  generationListQuerySchema,
  generationIdParamSchema,
} from "./generation.schema";

// Test data constants
const VALID_UUID = "550e8400-e29b-41d4-a716-446655440000";
const INVALID_UUID = "not-a-uuid";
const SOURCE_TEXT_MIN_LENGTH = 1000;
const SOURCE_TEXT_MAX_LENGTH = 10000;

// Helper to create valid source text
const createSourceText = (length: number): string => "A".repeat(length);

describe("createGenerationCommandSchema", () => {
  describe("valid inputs", () => {
    it("should accept source_text with minimum length", () => {
      const input = { source_text: createSourceText(SOURCE_TEXT_MIN_LENGTH) };
      const result = createGenerationCommandSchema.safeParse(input);

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.source_text.length).toBe(SOURCE_TEXT_MIN_LENGTH);
      }
    });

    it("should accept source_text with maximum length", () => {
      const input = { source_text: createSourceText(SOURCE_TEXT_MAX_LENGTH) };
      const result = createGenerationCommandSchema.safeParse(input);

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.source_text.length).toBe(SOURCE_TEXT_MAX_LENGTH);
      }
    });

    it("should accept source_text with length between min and max", () => {
      const middleLength = Math.floor((SOURCE_TEXT_MIN_LENGTH + SOURCE_TEXT_MAX_LENGTH) / 2);
      const input = { source_text: createSourceText(middleLength) };
      const result = createGenerationCommandSchema.safeParse(input);

      expect(result.success).toBe(true);
    });

    it("should accept source_text with mixed content", () => {
      const mixedContent = `
        # Introduction to TypeScript
        
        TypeScript is a strongly typed programming language that builds on JavaScript.
        It provides optional static typing and class-based object-oriented programming.
        
        ## Key Features
        
        1. Static Type Checking
        2. Enhanced IDE Support
        3. ECMAScript Compatibility
        
        TypeScript code compiles to plain JavaScript that runs in any browser.
      `.padEnd(SOURCE_TEXT_MIN_LENGTH, " ");
      
      const input = { source_text: mixedContent };
      const result = createGenerationCommandSchema.safeParse(input);

      expect(result.success).toBe(true);
    });
  });

  describe("source_text length validation", () => {
    it("should reject source_text below minimum length", () => {
      const input = { source_text: createSourceText(SOURCE_TEXT_MIN_LENGTH - 1) };
      const result = createGenerationCommandSchema.safeParse(input);

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.flatten().fieldErrors.source_text).toContain(
          `source_text must be at least ${SOURCE_TEXT_MIN_LENGTH} characters long`
        );
      }
    });

    it("should reject source_text above maximum length", () => {
      const input = { source_text: createSourceText(SOURCE_TEXT_MAX_LENGTH + 1) };
      const result = createGenerationCommandSchema.safeParse(input);

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.flatten().fieldErrors.source_text).toContain(
          `source_text must be at most ${SOURCE_TEXT_MAX_LENGTH} characters long`
        );
      }
    });

    it("should reject empty source_text", () => {
      const input = { source_text: "" };
      const result = createGenerationCommandSchema.safeParse(input);

      expect(result.success).toBe(false);
    });

    it("should reject very short source_text", () => {
      const input = { source_text: "Short text" };
      const result = createGenerationCommandSchema.safeParse(input);

      expect(result.success).toBe(false);
    });
  });

  describe("source_text type validation", () => {
    it("should reject missing source_text", () => {
      const input = {};
      const result = createGenerationCommandSchema.safeParse(input);

      expect(result.success).toBe(false);
    });

    it("should reject null source_text", () => {
      const input = { source_text: null };
      const result = createGenerationCommandSchema.safeParse(input);

      expect(result.success).toBe(false);
    });

    it("should reject numeric source_text", () => {
      const input = { source_text: 12345 };
      const result = createGenerationCommandSchema.safeParse(input);

      expect(result.success).toBe(false);
    });

    it("should reject array source_text", () => {
      const input = { source_text: ["text", "array"] };
      const result = createGenerationCommandSchema.safeParse(input);

      expect(result.success).toBe(false);
    });
  });

  describe("boundary conditions", () => {
    it("should accept source_text at exact minimum boundary", () => {
      const input = { source_text: createSourceText(SOURCE_TEXT_MIN_LENGTH) };
      const result = createGenerationCommandSchema.safeParse(input);

      expect(result.success).toBe(true);
    });

    it("should reject source_text one character below minimum", () => {
      const input = { source_text: createSourceText(SOURCE_TEXT_MIN_LENGTH - 1) };
      const result = createGenerationCommandSchema.safeParse(input);

      expect(result.success).toBe(false);
    });

    it("should accept source_text at exact maximum boundary", () => {
      const input = { source_text: createSourceText(SOURCE_TEXT_MAX_LENGTH) };
      const result = createGenerationCommandSchema.safeParse(input);

      expect(result.success).toBe(true);
    });

    it("should reject source_text one character above maximum", () => {
      const input = { source_text: createSourceText(SOURCE_TEXT_MAX_LENGTH + 1) };
      const result = createGenerationCommandSchema.safeParse(input);

      expect(result.success).toBe(false);
    });
  });
});

describe("generationListQuerySchema", () => {
  describe("default values", () => {
    it("should apply default values for empty object", () => {
      const result = generationListQuerySchema.safeParse({});

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data).toEqual({
          page: 1,
          limit: 10,
          order: "desc",
        });
      }
    });
  });

  describe("page validation", () => {
    it("should coerce string to number", () => {
      const result = generationListQuerySchema.safeParse({ page: "3" });

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.page).toBe(3);
      }
    });

    it("should accept page = 1", () => {
      const result = generationListQuerySchema.safeParse({ page: 1 });

      expect(result.success).toBe(true);
    });

    it("should reject page = 0", () => {
      const result = generationListQuerySchema.safeParse({ page: 0 });

      expect(result.success).toBe(false);
    });

    it("should reject negative page", () => {
      const result = generationListQuerySchema.safeParse({ page: -5 });

      expect(result.success).toBe(false);
    });

    it("should reject non-integer page", () => {
      const result = generationListQuerySchema.safeParse({ page: 2.5 });

      expect(result.success).toBe(false);
    });

    it("should accept large page number", () => {
      const result = generationListQuerySchema.safeParse({ page: 9999 });

      expect(result.success).toBe(true);
    });
  });

  describe("limit validation", () => {
    it("should coerce string to number", () => {
      const result = generationListQuerySchema.safeParse({ limit: "25" });

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.limit).toBe(25);
      }
    });

    it("should accept limit = 1 (minimum)", () => {
      const result = generationListQuerySchema.safeParse({ limit: 1 });

      expect(result.success).toBe(true);
    });

    it("should accept limit = 50 (maximum)", () => {
      const result = generationListQuerySchema.safeParse({ limit: 50 });

      expect(result.success).toBe(true);
    });

    it("should reject limit = 0", () => {
      const result = generationListQuerySchema.safeParse({ limit: 0 });

      expect(result.success).toBe(false);
    });

    it("should reject limit > 50", () => {
      const result = generationListQuerySchema.safeParse({ limit: 51 });

      expect(result.success).toBe(false);
    });

    it("should reject negative limit", () => {
      const result = generationListQuerySchema.safeParse({ limit: -10 });

      expect(result.success).toBe(false);
    });

    it("should reject non-integer limit", () => {
      const result = generationListQuerySchema.safeParse({ limit: 10.5 });

      expect(result.success).toBe(false);
    });
  });

  describe("order validation", () => {
    it("should accept order = asc", () => {
      const result = generationListQuerySchema.safeParse({ order: "asc" });

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.order).toBe("asc");
      }
    });

    it("should accept order = desc", () => {
      const result = generationListQuerySchema.safeParse({ order: "desc" });

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.order).toBe("desc");
      }
    });

    it("should reject invalid order value", () => {
      const result = generationListQuerySchema.safeParse({ order: "random" });

      expect(result.success).toBe(false);
    });

    it("should reject uppercase order values", () => {
      const result = generationListQuerySchema.safeParse({ order: "ASC" });

      expect(result.success).toBe(false);
    });
  });

  describe("combined parameters", () => {
    it("should accept all valid parameters together", () => {
      const result = generationListQuerySchema.safeParse({
        page: 2,
        limit: 25,
        order: "asc",
      });

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data).toEqual({
          page: 2,
          limit: 25,
          order: "asc",
        });
      }
    });

    it("should apply defaults only for missing parameters", () => {
      const result = generationListQuerySchema.safeParse({ page: 5 });

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.page).toBe(5);
        expect(result.data.limit).toBe(10); // default
        expect(result.data.order).toBe("desc"); // default
      }
    });
  });
});

describe("generationIdParamSchema", () => {
  describe("valid UUIDs", () => {
    it("should accept valid UUID v4", () => {
      const result = generationIdParamSchema.safeParse({ id: VALID_UUID });

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.id).toBe(VALID_UUID);
      }
    });

    it("should accept lowercase UUID", () => {
      const result = generationIdParamSchema.safeParse({
        id: "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
      });

      expect(result.success).toBe(true);
    });

    it("should accept uppercase UUID", () => {
      const result = generationIdParamSchema.safeParse({
        id: "A1B2C3D4-E5F6-7890-ABCD-EF1234567890",
      });

      expect(result.success).toBe(true);
    });
  });

  describe("invalid UUIDs", () => {
    it("should reject non-UUID string", () => {
      const result = generationIdParamSchema.safeParse({ id: INVALID_UUID });

      expect(result.success).toBe(false);
    });

    it("should reject empty string", () => {
      const result = generationIdParamSchema.safeParse({ id: "" });

      expect(result.success).toBe(false);
    });

    it("should reject UUID without hyphens", () => {
      const result = generationIdParamSchema.safeParse({
        id: "550e8400e29b41d4a716446655440000",
      });

      expect(result.success).toBe(false);
    });

    it("should reject UUID with wrong format", () => {
      const result = generationIdParamSchema.safeParse({
        id: "550e8400-e29b-41d4-a716-44665544000", // one character short
      });

      expect(result.success).toBe(false);
    });

    it("should reject missing id", () => {
      const result = generationIdParamSchema.safeParse({});

      expect(result.success).toBe(false);
    });

    it("should reject null id", () => {
      const result = generationIdParamSchema.safeParse({ id: null });

      expect(result.success).toBe(false);
    });

    it("should reject numeric id", () => {
      const result = generationIdParamSchema.safeParse({ id: 12345 });

      expect(result.success).toBe(false);
    });
  });
});
