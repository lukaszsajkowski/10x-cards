import { describe, it, expect, vi, beforeEach } from "vitest";
import { FlashcardService, FlashcardServiceError } from "./flashcard.service";
import type { SupabaseClient } from "../db/supabase.client";
import type { FlashcardDraftCommand, FlashcardListQueryDto } from "../types";

// Test data constants
const VALID_UUID = "550e8400-e29b-41d4-a716-446655440000";
const VALID_UUID_2 = "550e8400-e29b-41d4-a716-446655440002";
const VALID_GENERATION_ID = "660e8400-e29b-41d4-a716-446655440001";
const ANOTHER_GENERATION_ID = "770e8400-e29b-41d4-a716-446655440002";
const USER_ID = "user-123";
const DIFFERENT_USER_ID = "user-456";

// Types for mock builder
type MockQueryBuilder = {
  select: ReturnType<typeof vi.fn>;
  eq: ReturnType<typeof vi.fn>;
  in: ReturnType<typeof vi.fn>;
  maybeSingle: ReturnType<typeof vi.fn>;
  single: ReturnType<typeof vi.fn>;
  update: ReturnType<typeof vi.fn>;
  insert: ReturnType<typeof vi.fn>;
  delete: ReturnType<typeof vi.fn>;
  order: ReturnType<typeof vi.fn>;
  range: ReturnType<typeof vi.fn>;
};

// Helper to create mock Supabase client with full query builder
const createMockSupabase = () => {
  const createMockBuilder = (): MockQueryBuilder => ({
    select: vi.fn().mockReturnThis(),
    eq: vi.fn().mockReturnThis(),
    in: vi.fn().mockReturnThis(),
    maybeSingle: vi.fn(),
    single: vi.fn(),
    update: vi.fn().mockReturnThis(),
    insert: vi.fn().mockReturnThis(),
    delete: vi.fn().mockReturnThis(),
    order: vi.fn().mockReturnThis(),
    range: vi.fn().mockReturnThis(),
  });

  const mockFlashcardsBuilder = createMockBuilder();
  const mockGenerationsBuilder = createMockBuilder();

  const mockSupabase = {
    from: vi.fn((table: string) => {
      if (table === "flashcards") {
        return mockFlashcardsBuilder;
      }
      if (table === "generations") {
        return mockGenerationsBuilder;
      }
      return mockFlashcardsBuilder;
    }),
  } as unknown as SupabaseClient;

  return {
    supabase: mockSupabase,
    flashcardsBuilder: mockFlashcardsBuilder,
    generationsBuilder: mockGenerationsBuilder,
  };
};

// Helper to create existing flashcard data
const createExistingFlashcard = (overrides = {}) => ({
  id: VALID_UUID,
  source: "manual" as const,
  generation_id: null as string | null,
  front: "Original front",
  back: "Original back",
  created_at: "2024-01-01T00:00:00Z",
  updated_at: "2024-01-01T00:00:00Z",
  ...overrides,
});

// Helper to create AI flashcard
const createAiFlashcard = (overrides = {}) =>
  createExistingFlashcard({
    source: "ai-full",
    generation_id: VALID_GENERATION_ID,
    ...overrides,
  });

describe("FlashcardService.updateFlashcard", () => {
  let service: FlashcardService;

  beforeEach(() => {
    service = new FlashcardService();
    vi.clearAllMocks();
  });

  describe("empty update validation", () => {
    it("should throw INVALID_UPDATE_PAYLOAD when no fields provided", async () => {
      const { supabase } = createMockSupabase();

      await expect(
        service.updateFlashcard({
          supabase,
          userId: USER_ID,
          flashcardId: VALID_UUID,
          command: {},
        })
      ).rejects.toThrow(FlashcardServiceError);

      await expect(
        service.updateFlashcard({
          supabase,
          userId: USER_ID,
          flashcardId: VALID_UUID,
          command: {},
        })
      ).rejects.toMatchObject({
        code: "INVALID_UPDATE_PAYLOAD",
        message: "No fields to update",
      });
    });

    it("should not call database when no fields provided", async () => {
      const { supabase } = createMockSupabase();

      try {
        await service.updateFlashcard({
          supabase,
          userId: USER_ID,
          flashcardId: VALID_UUID,
          command: {},
        });
      } catch {
        // Expected to throw
      }

      expect(supabase.from).not.toHaveBeenCalled();
    });
  });

  describe("flashcard not found", () => {
    it("should return null when flashcard does not exist", async () => {
      const { supabase, flashcardsBuilder } = createMockSupabase();

      flashcardsBuilder.maybeSingle.mockResolvedValueOnce({
        data: null,
        error: null,
      });

      const result = await service.updateFlashcard({
        supabase,
        userId: USER_ID,
        flashcardId: VALID_UUID,
        command: { front: "New front" },
      });

      expect(result).toBeNull();
    });

    it("should return null when flashcard belongs to different user", async () => {
      const { supabase, flashcardsBuilder } = createMockSupabase();

      // First select returns null (RLS filtering)
      flashcardsBuilder.maybeSingle.mockResolvedValueOnce({
        data: null,
        error: null,
      });

      const result = await service.updateFlashcard({
        supabase,
        userId: "different-user",
        flashcardId: VALID_UUID,
        command: { front: "New front" },
      });

      expect(result).toBeNull();
    });
  });

  describe("simple field updates (front/back only)", () => {
    it("should update only front field", async () => {
      const { supabase, flashcardsBuilder } = createMockSupabase();
      const existingFlashcard = createExistingFlashcard();

      // First call: fetch current flashcard
      flashcardsBuilder.maybeSingle.mockResolvedValueOnce({
        data: existingFlashcard,
        error: null,
      });

      // Second call: update
      flashcardsBuilder.maybeSingle.mockResolvedValueOnce({
        data: { ...existingFlashcard, front: "Updated front" },
        error: null,
      });

      const result = await service.updateFlashcard({
        supabase,
        userId: USER_ID,
        flashcardId: VALID_UUID,
        command: { front: "Updated front" },
      });

      expect(result).toMatchObject({
        front: "Updated front",
        back: "Original back",
        source: "manual",
      });
    });

    it("should update only back field", async () => {
      const { supabase, flashcardsBuilder } = createMockSupabase();
      const existingFlashcard = createExistingFlashcard();

      flashcardsBuilder.maybeSingle.mockResolvedValueOnce({
        data: existingFlashcard,
        error: null,
      });

      flashcardsBuilder.maybeSingle.mockResolvedValueOnce({
        data: { ...existingFlashcard, back: "Updated back" },
        error: null,
      });

      const result = await service.updateFlashcard({
        supabase,
        userId: USER_ID,
        flashcardId: VALID_UUID,
        command: { back: "Updated back" },
      });

      expect(result).toMatchObject({
        front: "Original front",
        back: "Updated back",
      });
    });

    it("should update both front and back fields", async () => {
      const { supabase, flashcardsBuilder } = createMockSupabase();
      const existingFlashcard = createExistingFlashcard();

      flashcardsBuilder.maybeSingle.mockResolvedValueOnce({
        data: existingFlashcard,
        error: null,
      });

      flashcardsBuilder.maybeSingle.mockResolvedValueOnce({
        data: { ...existingFlashcard, front: "New front", back: "New back" },
        error: null,
      });

      const result = await service.updateFlashcard({
        supabase,
        userId: USER_ID,
        flashcardId: VALID_UUID,
        command: { front: "New front", back: "New back" },
      });

      expect(result).toMatchObject({
        front: "New front",
        back: "New back",
      });
    });
  });

  describe("source change: manual → AI", () => {
    it("should allow changing from manual to ai-full with generation_id", async () => {
      const { supabase, flashcardsBuilder, generationsBuilder } = createMockSupabase();
      const existingFlashcard = createExistingFlashcard({ source: "manual" });

      // Fetch current flashcard
      flashcardsBuilder.maybeSingle.mockResolvedValueOnce({
        data: existingFlashcard,
        error: null,
      });

      // Verify generation exists
      generationsBuilder.maybeSingle.mockResolvedValueOnce({
        data: { id: VALID_GENERATION_ID },
        error: null,
      });

      // Update flashcard
      flashcardsBuilder.maybeSingle.mockResolvedValueOnce({
        data: {
          ...existingFlashcard,
          source: "ai-full",
          generation_id: VALID_GENERATION_ID,
        },
        error: null,
      });

      const result = await service.updateFlashcard({
        supabase,
        userId: USER_ID,
        flashcardId: VALID_UUID,
        command: {
          source: "ai-full",
          generation_id: VALID_GENERATION_ID,
        },
      });

      expect(result).toMatchObject({
        source: "ai-full",
        generation_id: VALID_GENERATION_ID,
      });
    });

    it("should allow changing from manual to ai-edited with generation_id", async () => {
      const { supabase, flashcardsBuilder, generationsBuilder } = createMockSupabase();
      const existingFlashcard = createExistingFlashcard({ source: "manual" });

      flashcardsBuilder.maybeSingle.mockResolvedValueOnce({
        data: existingFlashcard,
        error: null,
      });

      generationsBuilder.maybeSingle.mockResolvedValueOnce({
        data: { id: VALID_GENERATION_ID },
        error: null,
      });

      flashcardsBuilder.maybeSingle.mockResolvedValueOnce({
        data: {
          ...existingFlashcard,
          source: "ai-edited",
          generation_id: VALID_GENERATION_ID,
        },
        error: null,
      });

      const result = await service.updateFlashcard({
        supabase,
        userId: USER_ID,
        flashcardId: VALID_UUID,
        command: {
          source: "ai-edited",
          generation_id: VALID_GENERATION_ID,
        },
      });

      expect(result).toMatchObject({
        source: "ai-edited",
        generation_id: VALID_GENERATION_ID,
      });
    });

    it("should throw INVALID_GENERATION_LINK when changing to AI without generation_id", async () => {
      const { supabase, flashcardsBuilder } = createMockSupabase();
      const existingFlashcard = createExistingFlashcard({ source: "manual" });

      flashcardsBuilder.maybeSingle.mockResolvedValueOnce({
        data: existingFlashcard,
        error: null,
      });

      await expect(
        service.updateFlashcard({
          supabase,
          userId: USER_ID,
          flashcardId: VALID_UUID,
          command: { source: "ai-full" },
        })
      ).rejects.toMatchObject({
        code: "INVALID_GENERATION_LINK",
        message: "generation_id is required for AI sources",
      });
    });

    it("should throw INVALID_GENERATION_LINK when changing to AI with null generation_id", async () => {
      const { supabase, flashcardsBuilder } = createMockSupabase();
      const existingFlashcard = createExistingFlashcard({ source: "manual" });

      flashcardsBuilder.maybeSingle.mockResolvedValueOnce({
        data: existingFlashcard,
        error: null,
      });

      await expect(
        service.updateFlashcard({
          supabase,
          userId: USER_ID,
          flashcardId: VALID_UUID,
          command: { source: "ai-full", generation_id: null },
        })
      ).rejects.toMatchObject({
        code: "INVALID_GENERATION_LINK",
      });
    });
  });

  describe("source change: AI → manual", () => {
    it("should allow changing from ai-full to manual (clears generation_id)", async () => {
      const { supabase, flashcardsBuilder } = createMockSupabase();
      const existingFlashcard = createAiFlashcard({ source: "ai-full" });

      flashcardsBuilder.maybeSingle.mockResolvedValueOnce({
        data: existingFlashcard,
        error: null,
      });

      flashcardsBuilder.maybeSingle.mockResolvedValueOnce({
        data: {
          ...existingFlashcard,
          source: "manual",
          generation_id: null,
        },
        error: null,
      });

      const result = await service.updateFlashcard({
        supabase,
        userId: USER_ID,
        flashcardId: VALID_UUID,
        command: { source: "manual" },
      });

      expect(result).toMatchObject({
        source: "manual",
        generation_id: null,
      });
    });

    it("should allow changing from ai-edited to manual", async () => {
      const { supabase, flashcardsBuilder } = createMockSupabase();
      const existingFlashcard = createAiFlashcard({ source: "ai-edited" });

      flashcardsBuilder.maybeSingle.mockResolvedValueOnce({
        data: existingFlashcard,
        error: null,
      });

      flashcardsBuilder.maybeSingle.mockResolvedValueOnce({
        data: {
          ...existingFlashcard,
          source: "manual",
          generation_id: null,
        },
        error: null,
      });

      const result = await service.updateFlashcard({
        supabase,
        userId: USER_ID,
        flashcardId: VALID_UUID,
        command: { source: "manual" },
      });

      expect(result).toMatchObject({
        source: "manual",
        generation_id: null,
      });
    });

    it("should ignore provided generation_id when changing to manual", async () => {
      const { supabase, flashcardsBuilder } = createMockSupabase();
      const existingFlashcard = createAiFlashcard();

      flashcardsBuilder.maybeSingle.mockResolvedValueOnce({
        data: existingFlashcard,
        error: null,
      });

      // Note: generation_id should become null regardless of what was provided
      flashcardsBuilder.maybeSingle.mockResolvedValueOnce({
        data: {
          ...existingFlashcard,
          source: "manual",
          generation_id: null,
        },
        error: null,
      });

      const result = await service.updateFlashcard({
        supabase,
        userId: USER_ID,
        flashcardId: VALID_UUID,
        command: {
          source: "manual",
          generation_id: null, // explicitly null
        },
      });

      expect(result?.generation_id).toBeNull();
      expect(result?.source).toBe("manual");
    });
  });

  describe("source change: AI → AI (different type)", () => {
    it("should allow changing from ai-full to ai-edited (keeps generation_id)", async () => {
      const { supabase, flashcardsBuilder, generationsBuilder } = createMockSupabase();
      const existingFlashcard = createAiFlashcard({ source: "ai-full" });

      flashcardsBuilder.maybeSingle.mockResolvedValueOnce({
        data: existingFlashcard,
        error: null,
      });

      // Need to verify generation still exists
      generationsBuilder.maybeSingle.mockResolvedValueOnce({
        data: { id: VALID_GENERATION_ID },
        error: null,
      });

      flashcardsBuilder.maybeSingle.mockResolvedValueOnce({
        data: {
          ...existingFlashcard,
          source: "ai-edited",
        },
        error: null,
      });

      const result = await service.updateFlashcard({
        supabase,
        userId: USER_ID,
        flashcardId: VALID_UUID,
        command: {
          source: "ai-edited",
          generation_id: VALID_GENERATION_ID,
        },
      });

      expect(result).toMatchObject({
        source: "ai-edited",
        generation_id: VALID_GENERATION_ID,
      });
    });

    it("should allow changing generation_id when staying as AI source", async () => {
      const { supabase, flashcardsBuilder, generationsBuilder } = createMockSupabase();
      const existingFlashcard = createAiFlashcard();

      flashcardsBuilder.maybeSingle.mockResolvedValueOnce({
        data: existingFlashcard,
        error: null,
      });

      generationsBuilder.maybeSingle.mockResolvedValueOnce({
        data: { id: ANOTHER_GENERATION_ID },
        error: null,
      });

      flashcardsBuilder.maybeSingle.mockResolvedValueOnce({
        data: {
          ...existingFlashcard,
          source: "ai-full",
          generation_id: ANOTHER_GENERATION_ID,
        },
        error: null,
      });

      const result = await service.updateFlashcard({
        supabase,
        userId: USER_ID,
        flashcardId: VALID_UUID,
        command: {
          source: "ai-full",
          generation_id: ANOTHER_GENERATION_ID,
        },
      });

      expect(result).toMatchObject({
        generation_id: ANOTHER_GENERATION_ID,
      });
    });
  });

  describe("generation_id only update (no source change)", () => {
    it("should allow updating generation_id for AI flashcard", async () => {
      const { supabase, flashcardsBuilder, generationsBuilder } = createMockSupabase();
      const existingFlashcard = createAiFlashcard();

      flashcardsBuilder.maybeSingle.mockResolvedValueOnce({
        data: existingFlashcard,
        error: null,
      });

      generationsBuilder.maybeSingle.mockResolvedValueOnce({
        data: { id: ANOTHER_GENERATION_ID },
        error: null,
      });

      flashcardsBuilder.maybeSingle.mockResolvedValueOnce({
        data: {
          ...existingFlashcard,
          generation_id: ANOTHER_GENERATION_ID,
        },
        error: null,
      });

      const result = await service.updateFlashcard({
        supabase,
        userId: USER_ID,
        flashcardId: VALID_UUID,
        command: { generation_id: ANOTHER_GENERATION_ID },
      });

      expect(result?.generation_id).toBe(ANOTHER_GENERATION_ID);
    });

    it("should throw INVALID_GENERATION_LINK when setting generation_id on manual flashcard", async () => {
      const { supabase, flashcardsBuilder } = createMockSupabase();
      const existingFlashcard = createExistingFlashcard({ source: "manual" });

      flashcardsBuilder.maybeSingle.mockResolvedValueOnce({
        data: existingFlashcard,
        error: null,
      });

      await expect(
        service.updateFlashcard({
          supabase,
          userId: USER_ID,
          flashcardId: VALID_UUID,
          command: { generation_id: VALID_GENERATION_ID },
        })
      ).rejects.toMatchObject({
        code: "INVALID_GENERATION_LINK",
        message: "Cannot set generation_id when source is manual",
      });
    });

    it("should throw INVALID_GENERATION_LINK when trying to null generation_id on AI flashcard", async () => {
      const { supabase, flashcardsBuilder } = createMockSupabase();
      const existingFlashcard = createAiFlashcard();

      flashcardsBuilder.maybeSingle.mockResolvedValueOnce({
        data: existingFlashcard,
        error: null,
      });

      await expect(
        service.updateFlashcard({
          supabase,
          userId: USER_ID,
          flashcardId: VALID_UUID,
          command: { generation_id: null },
        })
      ).rejects.toMatchObject({
        code: "INVALID_GENERATION_LINK",
        message: "generation_id is required for AI sources",
      });
    });
  });

  describe("generation ownership verification", () => {
    it("should throw GENERATION_NOT_FOUND when generation does not exist", async () => {
      const { supabase, flashcardsBuilder, generationsBuilder } = createMockSupabase();
      const existingFlashcard = createExistingFlashcard({ source: "manual" });

      flashcardsBuilder.maybeSingle.mockResolvedValueOnce({
        data: existingFlashcard,
        error: null,
      });

      // Generation not found
      generationsBuilder.maybeSingle.mockResolvedValueOnce({
        data: null,
        error: null,
      });

      await expect(
        service.updateFlashcard({
          supabase,
          userId: USER_ID,
          flashcardId: VALID_UUID,
          command: {
            source: "ai-full",
            generation_id: "non-existent-generation-id",
          },
        })
      ).rejects.toMatchObject({
        code: "GENERATION_NOT_FOUND",
        message: "Generation not found",
      });
    });

    it("should throw GENERATION_NOT_FOUND when generation belongs to different user", async () => {
      const { supabase, flashcardsBuilder, generationsBuilder } = createMockSupabase();
      const existingFlashcard = createExistingFlashcard({ source: "manual" });

      flashcardsBuilder.maybeSingle.mockResolvedValueOnce({
        data: existingFlashcard,
        error: null,
      });

      // Generation query returns null (filtered by user_id)
      generationsBuilder.maybeSingle.mockResolvedValueOnce({
        data: null,
        error: null,
      });

      await expect(
        service.updateFlashcard({
          supabase,
          userId: USER_ID,
          flashcardId: VALID_UUID,
          command: {
            source: "ai-full",
            generation_id: VALID_GENERATION_ID,
          },
        })
      ).rejects.toMatchObject({
        code: "GENERATION_NOT_FOUND",
      });
    });

    it("should throw GENERATION_NOT_FOUND on database error when verifying generation", async () => {
      const { supabase, flashcardsBuilder, generationsBuilder } = createMockSupabase();
      const existingFlashcard = createExistingFlashcard({ source: "manual" });

      flashcardsBuilder.maybeSingle.mockResolvedValueOnce({
        data: existingFlashcard,
        error: null,
      });

      // Database error
      generationsBuilder.maybeSingle.mockResolvedValueOnce({
        data: null,
        error: { message: "Database connection failed" },
      });

      await expect(
        service.updateFlashcard({
          supabase,
          userId: USER_ID,
          flashcardId: VALID_UUID,
          command: {
            source: "ai-full",
            generation_id: VALID_GENERATION_ID,
          },
        })
      ).rejects.toMatchObject({
        code: "GENERATION_NOT_FOUND",
        message: "Failed to verify generation ownership",
      });
    });

    it("should not verify generation when source is changing to manual", async () => {
      const { supabase, flashcardsBuilder, generationsBuilder } = createMockSupabase();
      const existingFlashcard = createAiFlashcard();

      flashcardsBuilder.maybeSingle.mockResolvedValueOnce({
        data: existingFlashcard,
        error: null,
      });

      flashcardsBuilder.maybeSingle.mockResolvedValueOnce({
        data: {
          ...existingFlashcard,
          source: "manual",
          generation_id: null,
        },
        error: null,
      });

      await service.updateFlashcard({
        supabase,
        userId: USER_ID,
        flashcardId: VALID_UUID,
        command: { source: "manual" },
      });

      // Generations table should not be queried
      expect(generationsBuilder.maybeSingle).not.toHaveBeenCalled();
    });
  });

  describe("database error handling", () => {
    it("should throw FLASHCARDS_PERSISTENCE_FAILED when fetching flashcard fails", async () => {
      const { supabase, flashcardsBuilder } = createMockSupabase();

      flashcardsBuilder.maybeSingle.mockResolvedValueOnce({
        data: null,
        error: { message: "Database error" },
      });

      await expect(
        service.updateFlashcard({
          supabase,
          userId: USER_ID,
          flashcardId: VALID_UUID,
          command: { front: "New front" },
        })
      ).rejects.toMatchObject({
        code: "FLASHCARDS_PERSISTENCE_FAILED",
        message: "Failed to fetch flashcard",
      });
    });

    it("should throw FLASHCARDS_PERSISTENCE_FAILED when update operation fails", async () => {
      const { supabase, flashcardsBuilder } = createMockSupabase();
      const existingFlashcard = createExistingFlashcard();

      flashcardsBuilder.maybeSingle.mockResolvedValueOnce({
        data: existingFlashcard,
        error: null,
      });

      flashcardsBuilder.maybeSingle.mockResolvedValueOnce({
        data: null,
        error: { message: "Update failed" },
      });

      await expect(
        service.updateFlashcard({
          supabase,
          userId: USER_ID,
          flashcardId: VALID_UUID,
          command: { front: "New front" },
        })
      ).rejects.toMatchObject({
        code: "FLASHCARDS_PERSISTENCE_FAILED",
        message: "Failed to update flashcard",
      });
    });

    it("should return null when update returns no data (concurrent delete)", async () => {
      const { supabase, flashcardsBuilder } = createMockSupabase();
      const existingFlashcard = createExistingFlashcard();

      flashcardsBuilder.maybeSingle.mockResolvedValueOnce({
        data: existingFlashcard,
        error: null,
      });

      // Update returns null (flashcard was deleted between fetch and update)
      flashcardsBuilder.maybeSingle.mockResolvedValueOnce({
        data: null,
        error: null,
      });

      const result = await service.updateFlashcard({
        supabase,
        userId: USER_ID,
        flashcardId: VALID_UUID,
        command: { front: "New front" },
      });

      expect(result).toBeNull();
    });
  });

  describe("combined updates", () => {
    it("should update front, back, and source together", async () => {
      const { supabase, flashcardsBuilder, generationsBuilder } = createMockSupabase();
      const existingFlashcard = createExistingFlashcard();

      flashcardsBuilder.maybeSingle.mockResolvedValueOnce({
        data: existingFlashcard,
        error: null,
      });

      generationsBuilder.maybeSingle.mockResolvedValueOnce({
        data: { id: VALID_GENERATION_ID },
        error: null,
      });

      flashcardsBuilder.maybeSingle.mockResolvedValueOnce({
        data: {
          ...existingFlashcard,
          front: "AI Generated Question",
          back: "AI Generated Answer",
          source: "ai-full",
          generation_id: VALID_GENERATION_ID,
        },
        error: null,
      });

      const result = await service.updateFlashcard({
        supabase,
        userId: USER_ID,
        flashcardId: VALID_UUID,
        command: {
          front: "AI Generated Question",
          back: "AI Generated Answer",
          source: "ai-full",
          generation_id: VALID_GENERATION_ID,
        },
      });

      expect(result).toMatchObject({
        front: "AI Generated Question",
        back: "AI Generated Answer",
        source: "ai-full",
        generation_id: VALID_GENERATION_ID,
      });
    });

    it("should update content while keeping source as AI", async () => {
      const { supabase, flashcardsBuilder, generationsBuilder } = createMockSupabase();
      const existingFlashcard = createAiFlashcard();

      flashcardsBuilder.maybeSingle.mockResolvedValueOnce({
        data: existingFlashcard,
        error: null,
      });

      // Generation verification is always performed if generation_id is set
      generationsBuilder.maybeSingle.mockResolvedValueOnce({
        data: { id: VALID_GENERATION_ID },
        error: null,
      });

      flashcardsBuilder.maybeSingle.mockResolvedValueOnce({
        data: {
          ...existingFlashcard,
          front: "Edited front",
          back: "Edited back",
        },
        error: null,
      });

      const result = await service.updateFlashcard({
        supabase,
        userId: USER_ID,
        flashcardId: VALID_UUID,
        command: {
          front: "Edited front",
          back: "Edited back",
        },
      });

      expect(result).toMatchObject({
        front: "Edited front",
        back: "Edited back",
        source: "ai-full",
        generation_id: VALID_GENERATION_ID,
      });
    });
  });

  describe("response format", () => {
    it("should return complete FlashcardDetailDto", async () => {
      const { supabase, flashcardsBuilder } = createMockSupabase();
      const existingFlashcard = createExistingFlashcard();
      const updatedData = {
        ...existingFlashcard,
        front: "Updated",
        updated_at: "2024-01-02T00:00:00Z",
      };

      flashcardsBuilder.maybeSingle.mockResolvedValueOnce({
        data: existingFlashcard,
        error: null,
      });

      flashcardsBuilder.maybeSingle.mockResolvedValueOnce({
        data: updatedData,
        error: null,
      });

      const result = await service.updateFlashcard({
        supabase,
        userId: USER_ID,
        flashcardId: VALID_UUID,
        command: { front: "Updated" },
      });

      expect(result).toEqual({
        id: VALID_UUID,
        front: "Updated",
        back: "Original back",
        source: "manual",
        generation_id: null,
        created_at: "2024-01-01T00:00:00Z",
        updated_at: "2024-01-02T00:00:00Z",
      });
    });
  });
});

// =========================================
// createFlashcards Tests
// =========================================
describe("FlashcardService.createFlashcards", () => {
  let service: FlashcardService;

  beforeEach(() => {
    service = new FlashcardService();
    vi.clearAllMocks();
  });

  describe("successful creation", () => {
    it("should create single manual flashcard", async () => {
      const { supabase, flashcardsBuilder } = createMockSupabase();
      const flashcard: FlashcardDraftCommand = {
        front: "Question 1",
        back: "Answer 1",
        source: "manual",
        generation_id: null,
      };

      flashcardsBuilder.select.mockResolvedValueOnce({
        data: [
          {
            id: VALID_UUID,
            front: "Question 1",
            back: "Answer 1",
            source: "manual",
            generation_id: null,
            created_at: "2024-01-01T00:00:00Z",
            updated_at: "2024-01-01T00:00:00Z",
          },
        ],
        error: null,
      });

      const result = await service.createFlashcards({
        supabase,
        userId: USER_ID,
        flashcards: [flashcard],
      });

      expect(result.flashcards).toHaveLength(1);
      expect(result.flashcards[0]).toMatchObject({
        front: "Question 1",
        back: "Answer 1",
        source: "manual",
        generation_id: null,
      });
    });

    it("should create multiple flashcards in batch", async () => {
      const { supabase, flashcardsBuilder } = createMockSupabase();
      const flashcards: FlashcardDraftCommand[] = [
        { front: "Q1", back: "A1", source: "manual", generation_id: null },
        { front: "Q2", back: "A2", source: "manual", generation_id: null },
        { front: "Q3", back: "A3", source: "manual", generation_id: null },
      ];

      flashcardsBuilder.select.mockResolvedValueOnce({
        data: flashcards.map((fc, idx) => ({
          id: `uuid-${idx}`,
          ...fc,
          created_at: "2024-01-01T00:00:00Z",
          updated_at: "2024-01-01T00:00:00Z",
        })),
        error: null,
      });

      const result = await service.createFlashcards({
        supabase,
        userId: USER_ID,
        flashcards,
      });

      expect(result.flashcards).toHaveLength(3);
      expect(flashcardsBuilder.insert).toHaveBeenCalledWith(
        expect.arrayContaining([
          expect.objectContaining({ user_id: USER_ID, front: "Q1" }),
          expect.objectContaining({ user_id: USER_ID, front: "Q2" }),
          expect.objectContaining({ user_id: USER_ID, front: "Q3" }),
        ])
      );
    });

    it("should create ai-full flashcard with valid generation_id", async () => {
      const { supabase, flashcardsBuilder, generationsBuilder } = createMockSupabase();
      const flashcard: FlashcardDraftCommand = {
        front: "AI Question",
        back: "AI Answer",
        source: "ai-full",
        generation_id: VALID_GENERATION_ID,
      };

      // Verify generation ownership
      generationsBuilder.select.mockReturnThis();
      generationsBuilder.eq.mockReturnThis();
      generationsBuilder.in.mockResolvedValueOnce({
        data: [{ id: VALID_GENERATION_ID }],
        error: null,
      });

      // Create flashcard
      flashcardsBuilder.select.mockResolvedValueOnce({
        data: [
          {
            id: VALID_UUID,
            ...flashcard,
            created_at: "2024-01-01T00:00:00Z",
            updated_at: "2024-01-01T00:00:00Z",
          },
        ],
        error: null,
      });

      const result = await service.createFlashcards({
        supabase,
        userId: USER_ID,
        flashcards: [flashcard],
      });

      expect(result.flashcards[0]).toMatchObject({
        source: "ai-full",
        generation_id: VALID_GENERATION_ID,
      });
    });

    it("should create mixed source flashcards in single batch", async () => {
      const { supabase, flashcardsBuilder, generationsBuilder } = createMockSupabase();
      const flashcards: FlashcardDraftCommand[] = [
        { front: "Manual Q", back: "Manual A", source: "manual", generation_id: null },
        { front: "AI Q", back: "AI A", source: "ai-full", generation_id: VALID_GENERATION_ID },
        { front: "AI Edited Q", back: "AI Edited A", source: "ai-edited", generation_id: VALID_GENERATION_ID },
      ];

      generationsBuilder.in.mockResolvedValueOnce({
        data: [{ id: VALID_GENERATION_ID }],
        error: null,
      });

      flashcardsBuilder.select.mockResolvedValueOnce({
        data: flashcards.map((fc, idx) => ({
          id: `uuid-${idx}`,
          ...fc,
          created_at: "2024-01-01T00:00:00Z",
          updated_at: "2024-01-01T00:00:00Z",
        })),
        error: null,
      });

      const result = await service.createFlashcards({
        supabase,
        userId: USER_ID,
        flashcards,
      });

      expect(result.flashcards).toHaveLength(3);
    });
  });

  describe("generation ownership verification", () => {
    it("should throw GENERATION_NOT_FOUND when generation does not exist", async () => {
      const { supabase, generationsBuilder } = createMockSupabase();
      const flashcard: FlashcardDraftCommand = {
        front: "Q",
        back: "A",
        source: "ai-full",
        generation_id: "non-existent-id",
      };

      generationsBuilder.in.mockResolvedValueOnce({
        data: [],
        error: null,
      });

      await expect(
        service.createFlashcards({
          supabase,
          userId: USER_ID,
          flashcards: [flashcard],
        })
      ).rejects.toMatchObject({
        code: "GENERATION_NOT_FOUND",
        message: "Generation not found",
      });
    });

    it("should throw GENERATION_NOT_FOUND when generation belongs to different user", async () => {
      const { supabase, generationsBuilder } = createMockSupabase();
      const flashcard: FlashcardDraftCommand = {
        front: "Q",
        back: "A",
        source: "ai-full",
        generation_id: VALID_GENERATION_ID,
      };

      // RLS filters out generation owned by different user
      generationsBuilder.in.mockResolvedValueOnce({
        data: [],
        error: null,
      });

      await expect(
        service.createFlashcards({
          supabase,
          userId: DIFFERENT_USER_ID,
          flashcards: [flashcard],
        })
      ).rejects.toMatchObject({
        code: "GENERATION_NOT_FOUND",
      });
    });

    it("should throw GENERATION_NOT_FOUND on database error during verification", async () => {
      const { supabase, generationsBuilder } = createMockSupabase();
      const flashcard: FlashcardDraftCommand = {
        front: "Q",
        back: "A",
        source: "ai-full",
        generation_id: VALID_GENERATION_ID,
      };

      generationsBuilder.in.mockResolvedValueOnce({
        data: null,
        error: { message: "Database connection failed" },
      });

      await expect(
        service.createFlashcards({
          supabase,
          userId: USER_ID,
          flashcards: [flashcard],
        })
      ).rejects.toMatchObject({
        code: "GENERATION_NOT_FOUND",
        message: "Failed to verify generation ownership",
      });
    });

    it("should skip generation verification for manual flashcards only", async () => {
      const { supabase, flashcardsBuilder, generationsBuilder } = createMockSupabase();
      const flashcard: FlashcardDraftCommand = {
        front: "Q",
        back: "A",
        source: "manual",
        generation_id: null,
      };

      flashcardsBuilder.select.mockResolvedValueOnce({
        data: [
          {
            id: VALID_UUID,
            ...flashcard,
            created_at: "2024-01-01T00:00:00Z",
            updated_at: "2024-01-01T00:00:00Z",
          },
        ],
        error: null,
      });

      await service.createFlashcards({
        supabase,
        userId: USER_ID,
        flashcards: [flashcard],
      });

      expect(generationsBuilder.in).not.toHaveBeenCalled();
    });

    it("should verify all unique generation_ids from batch", async () => {
      const { supabase, flashcardsBuilder, generationsBuilder } = createMockSupabase();
      const flashcards: FlashcardDraftCommand[] = [
        { front: "Q1", back: "A1", source: "ai-full", generation_id: VALID_GENERATION_ID },
        { front: "Q2", back: "A2", source: "ai-edited", generation_id: VALID_GENERATION_ID },
        { front: "Q3", back: "A3", source: "ai-full", generation_id: ANOTHER_GENERATION_ID },
      ];

      generationsBuilder.in.mockResolvedValueOnce({
        data: [{ id: VALID_GENERATION_ID }, { id: ANOTHER_GENERATION_ID }],
        error: null,
      });

      flashcardsBuilder.select.mockResolvedValueOnce({
        data: flashcards.map((fc, idx) => ({
          id: `uuid-${idx}`,
          ...fc,
          created_at: "2024-01-01T00:00:00Z",
          updated_at: "2024-01-01T00:00:00Z",
        })),
        error: null,
      });

      await service.createFlashcards({
        supabase,
        userId: USER_ID,
        flashcards,
      });

      expect(generationsBuilder.in).toHaveBeenCalledWith(
        "id",
        expect.arrayContaining([VALID_GENERATION_ID, ANOTHER_GENERATION_ID])
      );
    });
  });

  describe("database error handling", () => {
    it("should throw FLASHCARDS_PERSISTENCE_FAILED when insert fails", async () => {
      const { supabase, flashcardsBuilder } = createMockSupabase();
      const flashcard: FlashcardDraftCommand = {
        front: "Q",
        back: "A",
        source: "manual",
        generation_id: null,
      };

      flashcardsBuilder.select.mockResolvedValueOnce({
        data: null,
        error: { message: "Insert failed" },
      });

      await expect(
        service.createFlashcards({
          supabase,
          userId: USER_ID,
          flashcards: [flashcard],
        })
      ).rejects.toMatchObject({
        code: "FLASHCARDS_PERSISTENCE_FAILED",
        message: "Failed to create flashcards",
      });
    });

    it("should throw FLASHCARDS_PERSISTENCE_FAILED when insert returns empty data", async () => {
      const { supabase, flashcardsBuilder } = createMockSupabase();
      const flashcard: FlashcardDraftCommand = {
        front: "Q",
        back: "A",
        source: "manual",
        generation_id: null,
      };

      flashcardsBuilder.select.mockResolvedValueOnce({
        data: [],
        error: null,
      });

      await expect(
        service.createFlashcards({
          supabase,
          userId: USER_ID,
          flashcards: [flashcard],
        })
      ).rejects.toMatchObject({
        code: "FLASHCARDS_PERSISTENCE_FAILED",
      });
    });
  });

  describe("response format", () => {
    it("should return complete FlashcardDetailDto for each flashcard", async () => {
      const { supabase, flashcardsBuilder } = createMockSupabase();
      const flashcard: FlashcardDraftCommand = {
        front: "Question",
        back: "Answer",
        source: "manual",
        generation_id: null,
      };

      const dbResponse = {
        id: VALID_UUID,
        front: "Question",
        back: "Answer",
        source: "manual",
        generation_id: null,
        created_at: "2024-01-01T00:00:00Z",
        updated_at: "2024-01-01T00:00:00Z",
      };

      flashcardsBuilder.select.mockResolvedValueOnce({
        data: [dbResponse],
        error: null,
      });

      const result = await service.createFlashcards({
        supabase,
        userId: USER_ID,
        flashcards: [flashcard],
      });

      expect(result.flashcards[0]).toEqual(dbResponse);
    });
  });
});

// =========================================
// listFlashcards Tests
// =========================================
describe("FlashcardService.listFlashcards", () => {
  let service: FlashcardService;

  beforeEach(() => {
    service = new FlashcardService();
    vi.clearAllMocks();
  });

  describe("successful listing", () => {
    it("should return flashcards with default pagination", async () => {
      const { supabase, flashcardsBuilder } = createMockSupabase();
      const mockData = [
        { id: VALID_UUID, front: "Q1", back: "A1", source: "manual", created_at: "2024-01-01", updated_at: "2024-01-01" },
        { id: VALID_UUID_2, front: "Q2", back: "A2", source: "ai-full", created_at: "2024-01-02", updated_at: "2024-01-02" },
      ];

      flashcardsBuilder.range.mockResolvedValueOnce({
        data: mockData,
        error: null,
        count: 2,
      });

      const result = await service.listFlashcards({
        supabase,
        userId: USER_ID,
        query: {},
      });

      expect(result.data).toHaveLength(2);
      expect(result.pagination).toEqual({
        page: 1,
        limit: 10,
        total: 2,
      });
    });

    it("should respect custom page and limit", async () => {
      const { supabase, flashcardsBuilder } = createMockSupabase();

      flashcardsBuilder.range.mockResolvedValueOnce({
        data: [],
        error: null,
        count: 50,
      });

      const query: FlashcardListQueryDto = { page: 3, limit: 20 };
      const result = await service.listFlashcards({
        supabase,
        userId: USER_ID,
        query,
      });

      expect(result.pagination).toEqual({
        page: 3,
        limit: 20,
        total: 50,
      });
      // Verify correct range calculation: (page-1)*limit to (page-1)*limit + limit - 1
      // page=3, limit=20: offset=40, range(40, 59)
      expect(flashcardsBuilder.range).toHaveBeenCalledWith(40, 59);
    });

    it("should apply source filter", async () => {
      const { supabase, flashcardsBuilder } = createMockSupabase();

      flashcardsBuilder.range.mockResolvedValueOnce({
        data: [{ id: VALID_UUID, front: "Q", back: "A", source: "manual", created_at: "2024-01-01", updated_at: "2024-01-01" }],
        error: null,
        count: 1,
      });

      await service.listFlashcards({
        supabase,
        userId: USER_ID,
        query: { source: "manual" },
      });

      expect(flashcardsBuilder.eq).toHaveBeenCalledWith("source", "manual");
    });

    it("should apply generation_id filter", async () => {
      const { supabase, flashcardsBuilder } = createMockSupabase();

      flashcardsBuilder.range.mockResolvedValueOnce({
        data: [],
        error: null,
        count: 0,
      });

      await service.listFlashcards({
        supabase,
        userId: USER_ID,
        query: { generation_id: VALID_GENERATION_ID },
      });

      expect(flashcardsBuilder.eq).toHaveBeenCalledWith("generation_id", VALID_GENERATION_ID);
    });

    it("should apply ascending order", async () => {
      const { supabase, flashcardsBuilder } = createMockSupabase();

      flashcardsBuilder.range.mockResolvedValueOnce({
        data: [],
        error: null,
        count: 0,
      });

      await service.listFlashcards({
        supabase,
        userId: USER_ID,
        query: { order: "asc" },
      });

      expect(flashcardsBuilder.order).toHaveBeenCalledWith("created_at", { ascending: true });
    });

    it("should apply descending order by default", async () => {
      const { supabase, flashcardsBuilder } = createMockSupabase();

      flashcardsBuilder.range.mockResolvedValueOnce({
        data: [],
        error: null,
        count: 0,
      });

      await service.listFlashcards({
        supabase,
        userId: USER_ID,
        query: {},
      });

      expect(flashcardsBuilder.order).toHaveBeenCalledWith("created_at", { ascending: false });
    });
  });

  describe("edge cases", () => {
    it("should return empty array when no flashcards exist", async () => {
      const { supabase, flashcardsBuilder } = createMockSupabase();

      flashcardsBuilder.range.mockResolvedValueOnce({
        data: [],
        error: null,
        count: 0,
      });

      const result = await service.listFlashcards({
        supabase,
        userId: USER_ID,
        query: {},
      });

      expect(result.data).toEqual([]);
      expect(result.pagination.total).toBe(0);
    });

    it("should filter by user_id", async () => {
      const { supabase, flashcardsBuilder } = createMockSupabase();

      flashcardsBuilder.range.mockResolvedValueOnce({
        data: [],
        error: null,
        count: 0,
      });

      await service.listFlashcards({
        supabase,
        userId: USER_ID,
        query: {},
      });

      expect(flashcardsBuilder.eq).toHaveBeenCalledWith("user_id", USER_ID);
    });
  });

  describe("database error handling", () => {
    it("should throw error when database query fails", async () => {
      const { supabase, flashcardsBuilder } = createMockSupabase();

      flashcardsBuilder.range.mockResolvedValueOnce({
        data: null,
        error: { message: "Connection failed" },
        count: null,
      });

      await expect(
        service.listFlashcards({
          supabase,
          userId: USER_ID,
          query: {},
        })
      ).rejects.toThrow("Failed to list flashcards");
    });

    it("should throw error when count is not returned", async () => {
      const { supabase, flashcardsBuilder } = createMockSupabase();

      flashcardsBuilder.range.mockResolvedValueOnce({
        data: [],
        error: null,
        count: null,
      });

      await expect(
        service.listFlashcards({
          supabase,
          userId: USER_ID,
          query: {},
        })
      ).rejects.toThrow("Failed to list flashcards");
    });
  });

  describe("response format", () => {
    it("should map database rows to FlashcardListItemDto", async () => {
      const { supabase, flashcardsBuilder } = createMockSupabase();
      const dbRow = {
        id: VALID_UUID,
        front: "Question",
        back: "Answer",
        source: "manual",
        generation_id: null, // This should NOT be included in list item
        created_at: "2024-01-01T00:00:00Z",
        updated_at: "2024-01-01T00:00:00Z",
      };

      flashcardsBuilder.range.mockResolvedValueOnce({
        data: [dbRow],
        error: null,
        count: 1,
      });

      const result = await service.listFlashcards({
        supabase,
        userId: USER_ID,
        query: {},
      });

      expect(result.data[0]).toEqual({
        id: VALID_UUID,
        front: "Question",
        back: "Answer",
        source: "manual",
        created_at: "2024-01-01T00:00:00Z",
        updated_at: "2024-01-01T00:00:00Z",
      });
    });
  });
});

// =========================================
// getFlashcardDetail Tests
// =========================================
describe("FlashcardService.getFlashcardDetail", () => {
  let service: FlashcardService;

  beforeEach(() => {
    service = new FlashcardService();
    vi.clearAllMocks();
  });

  describe("successful retrieval", () => {
    it("should return flashcard detail when found", async () => {
      const { supabase, flashcardsBuilder } = createMockSupabase();
      const dbRow = {
        id: VALID_UUID,
        front: "Question",
        back: "Answer",
        source: "manual",
        generation_id: null,
        created_at: "2024-01-01T00:00:00Z",
        updated_at: "2024-01-01T00:00:00Z",
      };

      flashcardsBuilder.maybeSingle.mockResolvedValueOnce({
        data: dbRow,
        error: null,
      });

      const result = await service.getFlashcardDetail({
        supabase,
        userId: USER_ID,
        flashcardId: VALID_UUID,
      });

      expect(result).toEqual(dbRow);
    });

    it("should return AI flashcard with generation_id", async () => {
      const { supabase, flashcardsBuilder } = createMockSupabase();
      const dbRow = {
        id: VALID_UUID,
        front: "AI Question",
        back: "AI Answer",
        source: "ai-full",
        generation_id: VALID_GENERATION_ID,
        created_at: "2024-01-01T00:00:00Z",
        updated_at: "2024-01-01T00:00:00Z",
      };

      flashcardsBuilder.maybeSingle.mockResolvedValueOnce({
        data: dbRow,
        error: null,
      });

      const result = await service.getFlashcardDetail({
        supabase,
        userId: USER_ID,
        flashcardId: VALID_UUID,
      });

      expect(result?.generation_id).toBe(VALID_GENERATION_ID);
    });
  });

  describe("flashcard not found", () => {
    it("should return null when flashcard does not exist", async () => {
      const { supabase, flashcardsBuilder } = createMockSupabase();

      flashcardsBuilder.maybeSingle.mockResolvedValueOnce({
        data: null,
        error: null,
      });

      const result = await service.getFlashcardDetail({
        supabase,
        userId: USER_ID,
        flashcardId: "non-existent-id",
      });

      expect(result).toBeNull();
    });

    it("should return null when flashcard belongs to different user", async () => {
      const { supabase, flashcardsBuilder } = createMockSupabase();

      // RLS filters out flashcard
      flashcardsBuilder.maybeSingle.mockResolvedValueOnce({
        data: null,
        error: null,
      });

      const result = await service.getFlashcardDetail({
        supabase,
        userId: DIFFERENT_USER_ID,
        flashcardId: VALID_UUID,
      });

      expect(result).toBeNull();
    });
  });

  describe("database error handling", () => {
    it("should throw error when database query fails", async () => {
      const { supabase, flashcardsBuilder } = createMockSupabase();

      flashcardsBuilder.maybeSingle.mockResolvedValueOnce({
        data: null,
        error: { message: "Database error" },
      });

      await expect(
        service.getFlashcardDetail({
          supabase,
          userId: USER_ID,
          flashcardId: VALID_UUID,
        })
      ).rejects.toThrow("Failed to fetch flashcard");
    });
  });

  describe("query construction", () => {
    it("should query by flashcard_id and user_id", async () => {
      const { supabase, flashcardsBuilder } = createMockSupabase();

      flashcardsBuilder.maybeSingle.mockResolvedValueOnce({
        data: null,
        error: null,
      });

      await service.getFlashcardDetail({
        supabase,
        userId: USER_ID,
        flashcardId: VALID_UUID,
      });

      expect(flashcardsBuilder.eq).toHaveBeenCalledWith("id", VALID_UUID);
      expect(flashcardsBuilder.eq).toHaveBeenCalledWith("user_id", USER_ID);
    });
  });
});

// =========================================
// deleteFlashcard Tests
// =========================================
describe("FlashcardService.deleteFlashcard", () => {
  let service: FlashcardService;

  beforeEach(() => {
    service = new FlashcardService();
    vi.clearAllMocks();
  });

  describe("successful deletion", () => {
    it("should return true when flashcard is deleted", async () => {
      const { supabase, flashcardsBuilder } = createMockSupabase();

      flashcardsBuilder.maybeSingle.mockResolvedValueOnce({
        data: { id: VALID_UUID },
        error: null,
      });

      const result = await service.deleteFlashcard({
        supabase,
        userId: USER_ID,
        flashcardId: VALID_UUID,
      });

      expect(result).toBe(true);
    });

    it("should call delete with correct parameters", async () => {
      const { supabase, flashcardsBuilder } = createMockSupabase();

      flashcardsBuilder.maybeSingle.mockResolvedValueOnce({
        data: { id: VALID_UUID },
        error: null,
      });

      await service.deleteFlashcard({
        supabase,
        userId: USER_ID,
        flashcardId: VALID_UUID,
      });

      expect(flashcardsBuilder.delete).toHaveBeenCalled();
      expect(flashcardsBuilder.eq).toHaveBeenCalledWith("id", VALID_UUID);
      expect(flashcardsBuilder.eq).toHaveBeenCalledWith("user_id", USER_ID);
    });
  });

  describe("flashcard not found", () => {
    it("should return false when flashcard does not exist", async () => {
      const { supabase, flashcardsBuilder } = createMockSupabase();

      flashcardsBuilder.maybeSingle.mockResolvedValueOnce({
        data: null,
        error: null,
      });

      const result = await service.deleteFlashcard({
        supabase,
        userId: USER_ID,
        flashcardId: "non-existent-id",
      });

      expect(result).toBe(false);
    });

    it("should return false when flashcard belongs to different user", async () => {
      const { supabase, flashcardsBuilder } = createMockSupabase();

      // RLS prevents deletion
      flashcardsBuilder.maybeSingle.mockResolvedValueOnce({
        data: null,
        error: null,
      });

      const result = await service.deleteFlashcard({
        supabase,
        userId: DIFFERENT_USER_ID,
        flashcardId: VALID_UUID,
      });

      expect(result).toBe(false);
    });
  });

  describe("database error handling", () => {
    it("should throw FLASHCARDS_PERSISTENCE_FAILED when delete fails", async () => {
      const { supabase, flashcardsBuilder } = createMockSupabase();

      flashcardsBuilder.maybeSingle.mockResolvedValueOnce({
        data: null,
        error: { message: "Delete failed" },
      });

      await expect(
        service.deleteFlashcard({
          supabase,
          userId: USER_ID,
          flashcardId: VALID_UUID,
        })
      ).rejects.toMatchObject({
        code: "FLASHCARDS_PERSISTENCE_FAILED",
        message: "Failed to delete flashcard",
      });
    });
  });

  describe("idempotency", () => {
    it("should return false for already deleted flashcard", async () => {
      const { supabase, flashcardsBuilder } = createMockSupabase();

      // First delete succeeds
      flashcardsBuilder.maybeSingle.mockResolvedValueOnce({
        data: { id: VALID_UUID },
        error: null,
      });

      const firstResult = await service.deleteFlashcard({
        supabase,
        userId: USER_ID,
        flashcardId: VALID_UUID,
      });

      expect(firstResult).toBe(true);

      // Second delete returns null (already deleted)
      flashcardsBuilder.maybeSingle.mockResolvedValueOnce({
        data: null,
        error: null,
      });

      const secondResult = await service.deleteFlashcard({
        supabase,
        userId: USER_ID,
        flashcardId: VALID_UUID,
      });

      expect(secondResult).toBe(false);
    });
  });
});

describe("FlashcardServiceError", () => {
  it("should store message and code", () => {
    const error = new FlashcardServiceError(
      "Test error",
      "INVALID_UPDATE_PAYLOAD"
    );

    expect(error.message).toBe("Test error");
    expect(error.code).toBe("INVALID_UPDATE_PAYLOAD");
    expect(error.name).toBe("FlashcardServiceError");
  });

  it("should store cause when provided", () => {
    const cause = new Error("Original error");
    const error = new FlashcardServiceError(
      "Wrapped error",
      "FLASHCARDS_PERSISTENCE_FAILED",
      cause
    );

    expect(error.cause).toBe(cause);
  });

  it("should be instanceof Error", () => {
    const error = new FlashcardServiceError("Test", "GENERATION_NOT_FOUND");
    expect(error).toBeInstanceOf(Error);
  });

  it("should support all error codes", () => {
    const codes: Array<FlashcardServiceError["code"]> = [
      "GENERATION_NOT_FOUND",
      "FLASHCARDS_PERSISTENCE_FAILED",
      "FLASHCARD_NOT_FOUND",
      "INVALID_UPDATE_PAYLOAD",
      "INVALID_GENERATION_LINK",
    ];

    codes.forEach((code) => {
      const error = new FlashcardServiceError("Test", code);
      expect(error.code).toBe(code);
    });
  });
});
