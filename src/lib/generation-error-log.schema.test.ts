import { describe, it, expect } from "vitest";
import { errorLogListQuerySchema } from "./generation-error-log.schema";

// Test data constants
const VALID_UUID = "550e8400-e29b-41d4-a716-446655440000";
const INVALID_UUID = "not-a-uuid";

describe("errorLogListQuerySchema", () => {
  describe("default values", () => {
    it("should apply default values for empty object", () => {
      const result = errorLogListQuerySchema.safeParse({});

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data).toEqual({
          page: 1,
          limit: 10,
          order: "desc",
        });
      }
    });

    it("should not include user_id in defaults", () => {
      const result = errorLogListQuerySchema.safeParse({});

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.user_id).toBeUndefined();
      }
    });
  });

  describe("page validation", () => {
    it("should coerce string to number", () => {
      const result = errorLogListQuerySchema.safeParse({ page: "7" });

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.page).toBe(7);
      }
    });

    it("should accept page = 1 (minimum)", () => {
      const result = errorLogListQuerySchema.safeParse({ page: 1 });

      expect(result.success).toBe(true);
    });

    it("should reject page = 0", () => {
      const result = errorLogListQuerySchema.safeParse({ page: 0 });

      expect(result.success).toBe(false);
    });

    it("should reject negative page", () => {
      const result = errorLogListQuerySchema.safeParse({ page: -1 });

      expect(result.success).toBe(false);
    });

    it("should reject non-integer page", () => {
      const result = errorLogListQuerySchema.safeParse({ page: 1.5 });

      expect(result.success).toBe(false);
    });

    it("should accept large page numbers", () => {
      const result = errorLogListQuerySchema.safeParse({ page: 10000 });

      expect(result.success).toBe(true);
    });
  });

  describe("limit validation", () => {
    it("should coerce string to number", () => {
      const result = errorLogListQuerySchema.safeParse({ limit: "20" });

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.limit).toBe(20);
      }
    });

    it("should accept limit = 1 (minimum)", () => {
      const result = errorLogListQuerySchema.safeParse({ limit: 1 });

      expect(result.success).toBe(true);
    });

    it("should accept limit = 50 (maximum)", () => {
      const result = errorLogListQuerySchema.safeParse({ limit: 50 });

      expect(result.success).toBe(true);
    });

    it("should reject limit = 0", () => {
      const result = errorLogListQuerySchema.safeParse({ limit: 0 });

      expect(result.success).toBe(false);
    });

    it("should reject limit > 50", () => {
      const result = errorLogListQuerySchema.safeParse({ limit: 51 });

      expect(result.success).toBe(false);
    });

    it("should reject negative limit", () => {
      const result = errorLogListQuerySchema.safeParse({ limit: -5 });

      expect(result.success).toBe(false);
    });

    it("should reject non-integer limit", () => {
      const result = errorLogListQuerySchema.safeParse({ limit: 25.5 });

      expect(result.success).toBe(false);
    });
  });

  describe("order validation", () => {
    it("should accept order = asc", () => {
      const result = errorLogListQuerySchema.safeParse({ order: "asc" });

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.order).toBe("asc");
      }
    });

    it("should accept order = desc", () => {
      const result = errorLogListQuerySchema.safeParse({ order: "desc" });

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.order).toBe("desc");
      }
    });

    it("should reject invalid order value", () => {
      const result = errorLogListQuerySchema.safeParse({ order: "invalid" });

      expect(result.success).toBe(false);
    });

    it("should reject uppercase order", () => {
      const result = errorLogListQuerySchema.safeParse({ order: "DESC" });

      expect(result.success).toBe(false);
    });

    it("should reject mixed case order", () => {
      const result = errorLogListQuerySchema.safeParse({ order: "Asc" });

      expect(result.success).toBe(false);
    });
  });

  describe("user_id validation (optional)", () => {
    it("should accept valid UUID for user_id", () => {
      const result = errorLogListQuerySchema.safeParse({ user_id: VALID_UUID });

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.user_id).toBe(VALID_UUID);
      }
    });

    it("should accept missing user_id (optional field)", () => {
      const result = errorLogListQuerySchema.safeParse({
        page: 1,
        limit: 10,
        order: "desc",
      });

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.user_id).toBeUndefined();
      }
    });

    it("should reject invalid UUID for user_id", () => {
      const result = errorLogListQuerySchema.safeParse({ user_id: INVALID_UUID });

      expect(result.success).toBe(false);
    });

    it("should reject empty string for user_id", () => {
      const result = errorLogListQuerySchema.safeParse({ user_id: "" });

      expect(result.success).toBe(false);
    });

    it("should reject numeric user_id", () => {
      const result = errorLogListQuerySchema.safeParse({ user_id: 12345 });

      expect(result.success).toBe(false);
    });
  });

  describe("combined parameters", () => {
    it("should accept all valid parameters together", () => {
      const result = errorLogListQuerySchema.safeParse({
        page: 3,
        limit: 25,
        order: "asc",
        user_id: VALID_UUID,
      });

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data).toEqual({
          page: 3,
          limit: 25,
          order: "asc",
          user_id: VALID_UUID,
        });
      }
    });

    it("should apply defaults and accept optional user_id", () => {
      const result = errorLogListQuerySchema.safeParse({ user_id: VALID_UUID });

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.page).toBe(1);
        expect(result.data.limit).toBe(10);
        expect(result.data.order).toBe("desc");
        expect(result.data.user_id).toBe(VALID_UUID);
      }
    });

    it("should handle partial parameters with valid user_id", () => {
      const result = errorLogListQuerySchema.safeParse({
        page: 2,
        user_id: VALID_UUID,
      });

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.page).toBe(2);
        expect(result.data.limit).toBe(10); // default
        expect(result.data.order).toBe("desc"); // default
        expect(result.data.user_id).toBe(VALID_UUID);
      }
    });
  });

  describe("boundary conditions", () => {
    it("should accept page at boundary (1)", () => {
      const result = errorLogListQuerySchema.safeParse({ page: 1 });

      expect(result.success).toBe(true);
    });

    it("should accept limit at lower boundary (1)", () => {
      const result = errorLogListQuerySchema.safeParse({ limit: 1 });

      expect(result.success).toBe(true);
    });

    it("should accept limit at upper boundary (50)", () => {
      const result = errorLogListQuerySchema.safeParse({ limit: 50 });

      expect(result.success).toBe(true);
    });

    it("should reject limit just above upper boundary (51)", () => {
      const result = errorLogListQuerySchema.safeParse({ limit: 51 });

      expect(result.success).toBe(false);
    });
  });

  describe("type coercion edge cases", () => {
    it("should coerce numeric strings for page", () => {
      const result = errorLogListQuerySchema.safeParse({ page: "100" });

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.page).toBe(100);
        expect(typeof result.data.page).toBe("number");
      }
    });

    it("should coerce numeric strings for limit", () => {
      const result = errorLogListQuerySchema.safeParse({ limit: "50" });

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.limit).toBe(50);
        expect(typeof result.data.limit).toBe("number");
      }
    });

    it("should reject non-numeric strings for page", () => {
      const result = errorLogListQuerySchema.safeParse({ page: "abc" });

      expect(result.success).toBe(false);
    });

    it("should reject non-numeric strings for limit", () => {
      const result = errorLogListQuerySchema.safeParse({ limit: "xyz" });

      expect(result.success).toBe(false);
    });
  });
});
