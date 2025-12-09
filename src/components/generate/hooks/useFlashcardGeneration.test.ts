import { renderHook, act, waitFor } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { useFlashcardGeneration } from "./useFlashcardGeneration";
import { VALIDATION_LIMITS } from "../types";

// Mock fetch globally
const mockFetch = vi.fn();
global.fetch = mockFetch;

// Mock crypto.randomUUID
const mockUUID = vi.fn();
Object.defineProperty(global.crypto, "randomUUID", {
  value: mockUUID,
  writable: true,
});

// Local storage mock
const localStorageMock = (() => {
  let store: Record<string, string> = {};
  return {
    getItem: vi.fn((key: string) => store[key] || null),
    setItem: vi.fn((key: string, value: string) => {
      store[key] = value;
    }),
    removeItem: vi.fn((key: string) => {
      delete store[key];
    }),
    clear: vi.fn(() => {
      store = {};
    }),
    get store() {
      return store;
    },
  };
})();

Object.defineProperty(window, "localStorage", {
  value: localStorageMock,
  writable: true,
});

// Helper function to create valid source text
const createValidSourceText = (length = VALIDATION_LIMITS.SOURCE_TEXT_MIN) => "a".repeat(length);

// Helper function to create mock generation response
const createMockGenerationResponse = (proposalsCount = 3) => ({
  generation_id: "gen-123",
  flashcards_proposals: Array.from({ length: proposalsCount }, (_, i) => ({
    front: `Question ${i + 1}`,
    back: `Answer ${i + 1}`,
    source: "ai-full",
  })),
  generated_count: proposalsCount,
});

// Helper function to create mock save response
const createMockSaveResponse = (count = 3) => ({
  flashcards: Array.from({ length: count }, (_, i) => ({
    id: `fc-${i + 1}`,
    front: `Question ${i + 1}`,
    back: `Answer ${i + 1}`,
    source: "ai-full",
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    generation_id: "gen-123",
  })),
});

describe("useFlashcardGeneration", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorageMock.clear();
    mockUUID.mockReturnValue("mock-uuid-1");
    mockFetch.mockReset();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  // =========================================
  // Initial State Tests
  // =========================================
  describe("Initial State", () => {
    it("should initialize with default values", () => {
      const { result } = renderHook(() => useFlashcardGeneration());

      expect(result.current.sourceText).toBe("");
      expect(result.current.viewState).toEqual({ status: "idle" });
      expect(result.current.proposals).toEqual([]);
      expect(result.current.generationId).toBeNull();
      expect(result.current.error).toBeNull();
      expect(result.current.isGenerating).toBe(false);
      expect(result.current.isSaving).toBe(false);
      expect(result.current.acceptedCount).toBe(0);
      expect(result.current.hasValidationErrors).toBe(false);
    });

    it("should load draft from localStorage on mount", async () => {
      const savedDraft = "Saved draft text from previous session";
      localStorageMock.store["flashcard-generator-draft"] = savedDraft;

      const { result } = renderHook(() => useFlashcardGeneration());

      await waitFor(() => {
        expect(result.current.sourceText).toBe(savedDraft);
      });
    });

    it("should handle localStorage read errors gracefully", () => {
      localStorageMock.getItem.mockImplementationOnce(() => {
        throw new Error("Storage error");
      });

      const { result } = renderHook(() => useFlashcardGeneration());

      expect(result.current.sourceText).toBe("");
    });
  });

  // =========================================
  // Source Text Management Tests
  // =========================================
  describe("Source Text Management", () => {
    it("should update source text and save to localStorage", () => {
      const { result } = renderHook(() => useFlashcardGeneration());

      act(() => {
        result.current.setSourceText("New text content");
      });

      expect(result.current.sourceText).toBe("New text content");
      expect(localStorageMock.setItem).toHaveBeenCalledWith(
        "flashcard-generator-draft",
        "New text content"
      );
    });

    it("should handle localStorage write errors gracefully", () => {
      localStorageMock.setItem.mockImplementationOnce(() => {
        throw new Error("Storage full");
      });

      const { result } = renderHook(() => useFlashcardGeneration());

      // Should not throw
      act(() => {
        result.current.setSourceText("Some text");
      });

      expect(result.current.sourceText).toBe("Some text");
    });
  });

  // =========================================
  // Source Text Validation Tests
  // =========================================
  describe("Source Text Validation", () => {
    it("should return valid=false and no error for empty text", () => {
      const { result } = renderHook(() => useFlashcardGeneration());

      expect(result.current.sourceTextValidation).toEqual({
        isValid: false,
        error: null,
        characterCount: 0,
      });
    });

    it("should return error when text is below minimum length", () => {
      const { result } = renderHook(() => useFlashcardGeneration());

      act(() => {
        result.current.setSourceText("a".repeat(VALIDATION_LIMITS.SOURCE_TEXT_MIN - 1));
      });

      expect(result.current.sourceTextValidation.isValid).toBe(false);
      expect(result.current.sourceTextValidation.error).toBe(
        `Tekst musi mieć minimum ${VALIDATION_LIMITS.SOURCE_TEXT_MIN} znaków`
      );
      expect(result.current.sourceTextValidation.characterCount).toBe(
        VALIDATION_LIMITS.SOURCE_TEXT_MIN - 1
      );
    });

    it("should return valid=true for text at minimum length", () => {
      const { result } = renderHook(() => useFlashcardGeneration());

      act(() => {
        result.current.setSourceText(createValidSourceText(VALIDATION_LIMITS.SOURCE_TEXT_MIN));
      });

      expect(result.current.sourceTextValidation.isValid).toBe(true);
      expect(result.current.sourceTextValidation.error).toBeNull();
    });

    it("should return valid=true for text at maximum length", () => {
      const { result } = renderHook(() => useFlashcardGeneration());

      act(() => {
        result.current.setSourceText(createValidSourceText(VALIDATION_LIMITS.SOURCE_TEXT_MAX));
      });

      expect(result.current.sourceTextValidation.isValid).toBe(true);
      expect(result.current.sourceTextValidation.error).toBeNull();
    });

    it("should return error when text exceeds maximum length", () => {
      const { result } = renderHook(() => useFlashcardGeneration());

      act(() => {
        result.current.setSourceText(createValidSourceText(VALIDATION_LIMITS.SOURCE_TEXT_MAX + 1));
      });

      expect(result.current.sourceTextValidation.isValid).toBe(false);
      expect(result.current.sourceTextValidation.error).toBe(
        `Tekst może mieć maksymalnie ${VALIDATION_LIMITS.SOURCE_TEXT_MAX} znaków`
      );
    });

    it("should correctly count characters including whitespace", () => {
      const { result } = renderHook(() => useFlashcardGeneration());

      act(() => {
        result.current.setSourceText("a b c");
      });

      expect(result.current.sourceTextValidation.characterCount).toBe(5);
    });
  });

  // =========================================
  // Flashcard Generation Flow Tests
  // =========================================
  describe("Flashcard Generation Flow", () => {
    it("should not generate when validation fails", async () => {
      const { result } = renderHook(() => useFlashcardGeneration());

      await act(async () => {
        await result.current.generateFlashcards();
      });

      expect(mockFetch).not.toHaveBeenCalled();
      expect(result.current.viewState.status).toBe("idle");
    });

    it("should transition to generating state and then to review on success", async () => {
      const mockResponse = createMockGenerationResponse();
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockResponse),
      });

      mockUUID
        .mockReturnValueOnce("uuid-1")
        .mockReturnValueOnce("uuid-2")
        .mockReturnValueOnce("uuid-3");

      const { result } = renderHook(() => useFlashcardGeneration());

      act(() => {
        result.current.setSourceText(createValidSourceText());
      });

      // Start generation
      let generatePromise: Promise<void>;
      act(() => {
        generatePromise = result.current.generateFlashcards();
      });

      // Should be in generating state
      expect(result.current.viewState.status).toBe("generating");
      expect(result.current.isGenerating).toBe(true);

      await act(async () => {
        await generatePromise;
      });

      // Should transition to review
      expect(result.current.viewState).toEqual({
        status: "review",
        generationId: "gen-123",
      });
      expect(result.current.isGenerating).toBe(false);
      expect(result.current.generationId).toBe("gen-123");
      expect(result.current.proposals).toHaveLength(3);
    });

    it("should create proposals with correct initial state", async () => {
      const mockResponse = createMockGenerationResponse(1);
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockResponse),
      });

      mockUUID.mockReturnValueOnce("proposal-uuid");

      const { result } = renderHook(() => useFlashcardGeneration());

      act(() => {
        result.current.setSourceText(createValidSourceText());
      });

      await act(async () => {
        await result.current.generateFlashcards();
      });

      expect(result.current.proposals[0]).toEqual({
        id: "proposal-uuid",
        front: "Question 1",
        back: "Answer 1",
        originalFront: "Question 1",
        originalBack: "Answer 1",
        isAccepted: true, // Default accepted
        isRejected: false,
        isEditing: false,
        validationErrors: {},
      });
    });

    it("should handle server error response", async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 500,
        json: () => Promise.resolve({ message: "Internal server error" }),
      });

      const { result } = renderHook(() => useFlashcardGeneration());

      act(() => {
        result.current.setSourceText(createValidSourceText());
      });

      await act(async () => {
        await result.current.generateFlashcards();
      });

      expect(result.current.viewState).toEqual({
        status: "error",
        message: "Internal server error",
      });
      expect(result.current.error).toBe("Internal server error");
    });

    it("should handle server error without message", async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 503,
        json: () => Promise.reject(new Error("JSON parse error")),
      });

      const { result } = renderHook(() => useFlashcardGeneration());

      act(() => {
        result.current.setSourceText(createValidSourceText());
      });

      await act(async () => {
        await result.current.generateFlashcards();
      });

      expect(result.current.viewState).toEqual({
        status: "error",
        message: "Błąd serwera (503)",
      });
    });

    it("should handle network error", async () => {
      mockFetch.mockRejectedValueOnce(new Error("Network error"));

      const { result } = renderHook(() => useFlashcardGeneration());

      act(() => {
        result.current.setSourceText(createValidSourceText());
      });

      await act(async () => {
        await result.current.generateFlashcards();
      });

      expect(result.current.viewState).toEqual({
        status: "error",
        message: "Network error",
      });
      expect(result.current.error).toBe("Network error");
    });

    it("should handle non-Error exceptions", async () => {
      mockFetch.mockRejectedValueOnce("String error");

      const { result } = renderHook(() => useFlashcardGeneration());

      act(() => {
        result.current.setSourceText(createValidSourceText());
      });

      await act(async () => {
        await result.current.generateFlashcards();
      });

      expect(result.current.error).toBe("Wystąpił nieoczekiwany błąd podczas generowania");
    });

    it("should send correct request payload", async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(createMockGenerationResponse()),
      });

      const sourceText = createValidSourceText();
      const { result } = renderHook(() => useFlashcardGeneration());

      act(() => {
        result.current.setSourceText(sourceText);
      });

      await act(async () => {
        await result.current.generateFlashcards();
      });

      expect(mockFetch).toHaveBeenCalledWith("/api/generations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ source_text: sourceText }),
      });
    });

    it("should clear error before generating", async () => {
      const { result } = renderHook(() => useFlashcardGeneration());

      // Set up initial error state
      mockFetch.mockRejectedValueOnce(new Error("First error"));
      act(() => {
        result.current.setSourceText(createValidSourceText());
      });
      await act(async () => {
        await result.current.generateFlashcards();
      });

      expect(result.current.error).toBe("First error");

      // Try again - error should be cleared during generation
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(createMockGenerationResponse()),
      });

      await act(async () => {
        await result.current.generateFlashcards();
      });

      expect(result.current.error).toBeNull();
    });
  });

  // =========================================
  // Proposal Management Tests
  // =========================================
  describe("Proposal Management", () => {
    const setupWithProposals = async () => {
      const mockResponse = createMockGenerationResponse(2);
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockResponse),
      });

      mockUUID.mockReturnValueOnce("proposal-1").mockReturnValueOnce("proposal-2");

      const { result } = renderHook(() => useFlashcardGeneration());

      act(() => {
        result.current.setSourceText(createValidSourceText());
      });

      await act(async () => {
        await result.current.generateFlashcards();
      });

      return result;
    };

    describe("updateProposal", () => {
      it("should update proposal fields", async () => {
        const result = await setupWithProposals();

        act(() => {
          result.current.updateProposal("proposal-1", { front: "Updated question" });
        });

        expect(result.current.proposals[0].front).toBe("Updated question");
      });

      it("should not modify other proposals", async () => {
        const result = await setupWithProposals();

        act(() => {
          result.current.updateProposal("proposal-1", { front: "Updated question" });
        });

        expect(result.current.proposals[1].front).toBe("Question 2");
      });

      it("should validate empty front field", async () => {
        const result = await setupWithProposals();

        act(() => {
          result.current.updateProposal("proposal-1", { front: "   " });
        });

        expect(result.current.proposals[0].validationErrors.front).toBe("Pole wymagane");
      });

      it("should validate empty back field", async () => {
        const result = await setupWithProposals();

        act(() => {
          result.current.updateProposal("proposal-1", { back: "" });
        });

        expect(result.current.proposals[0].validationErrors.back).toBe("Pole wymagane");
      });

      it("should validate front field max length", async () => {
        const result = await setupWithProposals();

        act(() => {
          result.current.updateProposal("proposal-1", {
            front: "x".repeat(VALIDATION_LIMITS.FRONT_MAX + 1),
          });
        });

        expect(result.current.proposals[0].validationErrors.front).toBe(
          `Maksymalnie ${VALIDATION_LIMITS.FRONT_MAX} znaków`
        );
      });

      it("should validate back field max length", async () => {
        const result = await setupWithProposals();

        act(() => {
          result.current.updateProposal("proposal-1", {
            back: "x".repeat(VALIDATION_LIMITS.BACK_MAX + 1),
          });
        });

        expect(result.current.proposals[0].validationErrors.back).toBe(
          `Maksymalnie ${VALIDATION_LIMITS.BACK_MAX} znaków`
        );
      });

      it("should clear validation errors when fields become valid", async () => {
        const result = await setupWithProposals();

        act(() => {
          result.current.updateProposal("proposal-1", { front: "" });
        });

        expect(result.current.proposals[0].validationErrors.front).toBe("Pole wymagane");

        act(() => {
          result.current.updateProposal("proposal-1", { front: "Valid question" });
        });

        expect(result.current.proposals[0].validationErrors.front).toBeUndefined();
      });

      it("should update isEditing flag", async () => {
        const result = await setupWithProposals();

        act(() => {
          result.current.updateProposal("proposal-1", { isEditing: true });
        });

        expect(result.current.proposals[0].isEditing).toBe(true);
      });

      it("should ignore updates for non-existent proposal id", async () => {
        const result = await setupWithProposals();
        const proposalsBefore = [...result.current.proposals];

        act(() => {
          result.current.updateProposal("non-existent", { front: "New front" });
        });

        expect(result.current.proposals).toEqual(proposalsBefore);
      });
    });

    describe("acceptProposal", () => {
      it("should accept a rejected proposal", async () => {
        const result = await setupWithProposals();

        act(() => {
          result.current.rejectProposal("proposal-1");
        });

        expect(result.current.proposals[0].isRejected).toBe(true);

        act(() => {
          result.current.acceptProposal("proposal-1");
        });

        expect(result.current.proposals[0].isAccepted).toBe(true);
        expect(result.current.proposals[0].isRejected).toBe(false);
      });
    });

    describe("rejectProposal", () => {
      it("should reject an accepted proposal", async () => {
        const result = await setupWithProposals();

        act(() => {
          result.current.rejectProposal("proposal-1");
        });

        expect(result.current.proposals[0].isRejected).toBe(true);
        expect(result.current.proposals[0].isAccepted).toBe(false);
      });

      it("should exit editing mode when rejecting", async () => {
        const result = await setupWithProposals();

        act(() => {
          result.current.updateProposal("proposal-1", { isEditing: true });
        });

        act(() => {
          result.current.rejectProposal("proposal-1");
        });

        expect(result.current.proposals[0].isEditing).toBe(false);
      });
    });

    describe("rejectAllProposals", () => {
      it("should clear all proposals and reset to idle", async () => {
        const result = await setupWithProposals();

        act(() => {
          result.current.rejectAllProposals();
        });

        expect(result.current.proposals).toEqual([]);
        expect(result.current.generationId).toBeNull();
        expect(result.current.viewState.status).toBe("idle");
      });
    });
  });

  // =========================================
  // Computed Properties Tests
  // =========================================
  describe("Computed Properties", () => {
    const setupWithProposals = async () => {
      const mockResponse = createMockGenerationResponse(3);
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockResponse),
      });

      mockUUID
        .mockReturnValueOnce("proposal-1")
        .mockReturnValueOnce("proposal-2")
        .mockReturnValueOnce("proposal-3");

      const { result } = renderHook(() => useFlashcardGeneration());

      act(() => {
        result.current.setSourceText(createValidSourceText());
      });

      await act(async () => {
        await result.current.generateFlashcards();
      });

      return result;
    };

    describe("acceptedCount", () => {
      it("should count only accepted and not rejected proposals", async () => {
        const result = await setupWithProposals();

        // All 3 are accepted by default
        expect(result.current.acceptedCount).toBe(3);

        act(() => {
          result.current.rejectProposal("proposal-1");
        });

        expect(result.current.acceptedCount).toBe(2);

        act(() => {
          result.current.rejectProposal("proposal-2");
        });

        expect(result.current.acceptedCount).toBe(1);
      });

      it("should return 0 when all proposals are rejected", async () => {
        const result = await setupWithProposals();

        act(() => {
          result.current.rejectProposal("proposal-1");
          result.current.rejectProposal("proposal-2");
          result.current.rejectProposal("proposal-3");
        });

        expect(result.current.acceptedCount).toBe(0);
      });
    });

    describe("hasValidationErrors", () => {
      it("should return false when no validation errors exist", async () => {
        const result = await setupWithProposals();

        expect(result.current.hasValidationErrors).toBe(false);
      });

      it("should return true when accepted proposal has validation error", async () => {
        const result = await setupWithProposals();

        act(() => {
          result.current.updateProposal("proposal-1", { front: "" });
        });

        expect(result.current.hasValidationErrors).toBe(true);
      });

      it("should return false when rejected proposal has validation error", async () => {
        const result = await setupWithProposals();

        act(() => {
          result.current.updateProposal("proposal-1", { front: "" });
        });

        act(() => {
          result.current.rejectProposal("proposal-1");
        });

        expect(result.current.hasValidationErrors).toBe(false);
      });
    });
  });

  // =========================================
  // Saving Flashcards Tests
  // =========================================
  describe("Saving Flashcards", () => {
    const setupWithProposals = async () => {
      const mockResponse = createMockGenerationResponse(2);
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockResponse),
      });

      mockUUID.mockReturnValueOnce("proposal-1").mockReturnValueOnce("proposal-2");

      const { result } = renderHook(() => useFlashcardGeneration());

      act(() => {
        result.current.setSourceText(createValidSourceText());
      });

      await act(async () => {
        await result.current.generateFlashcards();
      });

      return result;
    };

    it("should not save when no accepted flashcards", async () => {
      const result = await setupWithProposals();

      act(() => {
        result.current.rejectProposal("proposal-1");
        result.current.rejectProposal("proposal-2");
      });

      mockFetch.mockClear();

      await act(async () => {
        await result.current.saveAcceptedFlashcards();
      });

      expect(mockFetch).not.toHaveBeenCalled();
    });

    it("should not save when validation errors exist", async () => {
      const result = await setupWithProposals();

      act(() => {
        result.current.updateProposal("proposal-1", { front: "" });
      });

      mockFetch.mockClear();

      await act(async () => {
        await result.current.saveAcceptedFlashcards();
      });

      expect(mockFetch).not.toHaveBeenCalled();
    });

    it("should not save when generationId is null", async () => {
      const { result } = renderHook(() => useFlashcardGeneration());

      mockFetch.mockClear();

      await act(async () => {
        await result.current.saveAcceptedFlashcards();
      });

      expect(mockFetch).not.toHaveBeenCalled();
    });

    it("should transition to saving state and then to success", async () => {
      const result = await setupWithProposals();

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(createMockSaveResponse(2)),
      });

      let savePromise: Promise<void>;
      act(() => {
        savePromise = result.current.saveAcceptedFlashcards();
      });

      expect(result.current.viewState.status).toBe("saving");
      expect(result.current.isSaving).toBe(true);

      await act(async () => {
        await savePromise;
      });

      expect(result.current.viewState).toEqual({
        status: "success",
        savedCount: 2,
      });
      expect(result.current.isSaving).toBe(false);
    });

    it("should clear state after successful save", async () => {
      const result = await setupWithProposals();

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(createMockSaveResponse(2)),
      });

      await act(async () => {
        await result.current.saveAcceptedFlashcards();
      });

      expect(result.current.proposals).toEqual([]);
      expect(result.current.generationId).toBeNull();
      expect(result.current.sourceText).toBe("");
    });

    it("should remove localStorage draft after successful save", async () => {
      const result = await setupWithProposals();

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(createMockSaveResponse(2)),
      });

      await act(async () => {
        await result.current.saveAcceptedFlashcards();
      });

      expect(localStorageMock.removeItem).toHaveBeenCalledWith("flashcard-generator-draft");
    });

    it("should handle localStorage removal errors gracefully", async () => {
      const result = await setupWithProposals();

      localStorageMock.removeItem.mockImplementationOnce(() => {
        throw new Error("Storage error");
      });

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(createMockSaveResponse(2)),
      });

      // Should not throw
      await act(async () => {
        await result.current.saveAcceptedFlashcards();
      });

      expect(result.current.viewState.status).toBe("success");
    });

    it("should only save accepted (not rejected) flashcards", async () => {
      const result = await setupWithProposals();

      act(() => {
        result.current.rejectProposal("proposal-2");
      });

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(createMockSaveResponse(1)),
      });

      await act(async () => {
        await result.current.saveAcceptedFlashcards();
      });

      const [, requestOptions] = mockFetch.mock.calls[1]; // Second call is save
      const body = JSON.parse(requestOptions.body);

      expect(body.flashcards).toHaveLength(1);
      expect(body.flashcards[0].front).toBe("Question 1");
    });

    it("should set source as ai-full for unedited flashcards", async () => {
      const result = await setupWithProposals();

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(createMockSaveResponse(1)),
      });

      await act(async () => {
        await result.current.saveAcceptedFlashcards();
      });

      const [, requestOptions] = mockFetch.mock.calls[1];
      const body = JSON.parse(requestOptions.body);

      expect(body.flashcards[0].source).toBe("ai-full");
    });

    it("should set source as ai-edited for edited flashcards", async () => {
      const result = await setupWithProposals();

      act(() => {
        result.current.updateProposal("proposal-1", { front: "Edited question" });
      });

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(createMockSaveResponse(1)),
      });

      await act(async () => {
        await result.current.saveAcceptedFlashcards();
      });

      const [, requestOptions] = mockFetch.mock.calls[1];
      const body = JSON.parse(requestOptions.body);

      const editedFlashcard = body.flashcards.find(
        (f: { front: string }) => f.front === "Edited question"
      );
      expect(editedFlashcard.source).toBe("ai-edited");
    });

    it("should handle server error during save", async () => {
      const result = await setupWithProposals();

      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 500,
        json: () => Promise.resolve({ message: "Save failed" }),
      });

      await act(async () => {
        await result.current.saveAcceptedFlashcards();
      });

      expect(result.current.viewState).toEqual({
        status: "error",
        message: "Save failed",
      });
      expect(result.current.error).toBe("Save failed");
    });

    it("should handle network error during save", async () => {
      const result = await setupWithProposals();

      mockFetch.mockRejectedValueOnce(new Error("Network error"));

      await act(async () => {
        await result.current.saveAcceptedFlashcards();
      });

      expect(result.current.viewState).toEqual({
        status: "error",
        message: "Network error",
      });
    });

    it("should include generation_id in request payload", async () => {
      const result = await setupWithProposals();

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(createMockSaveResponse(2)),
      });

      await act(async () => {
        await result.current.saveAcceptedFlashcards();
      });

      const [, requestOptions] = mockFetch.mock.calls[1];
      const body = JSON.parse(requestOptions.body);

      expect(body.flashcards[0].generation_id).toBe("gen-123");
    });
  });

  // =========================================
  // Error Handling Tests
  // =========================================
  describe("Error Handling", () => {
    it("should clear error and return to idle when no proposals", async () => {
      const { result } = renderHook(() => useFlashcardGeneration());

      mockFetch.mockRejectedValueOnce(new Error("Test error"));

      act(() => {
        result.current.setSourceText(createValidSourceText());
      });

      await act(async () => {
        await result.current.generateFlashcards();
      });

      expect(result.current.viewState.status).toBe("error");
      expect(result.current.error).toBe("Test error");

      act(() => {
        result.current.clearError();
      });

      expect(result.current.error).toBeNull();
      expect(result.current.viewState.status).toBe("idle");
    });

    it("should clear error and return to review when proposals exist", async () => {
      mockFetch
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve(createMockGenerationResponse(2)),
        })
        .mockRejectedValueOnce(new Error("Save error"));

      mockUUID.mockReturnValueOnce("proposal-1").mockReturnValueOnce("proposal-2");

      const { result } = renderHook(() => useFlashcardGeneration());

      act(() => {
        result.current.setSourceText(createValidSourceText());
      });

      await act(async () => {
        await result.current.generateFlashcards();
      });

      await act(async () => {
        await result.current.saveAcceptedFlashcards();
      });

      expect(result.current.viewState.status).toBe("error");

      act(() => {
        result.current.clearError();
      });

      expect(result.current.error).toBeNull();
      expect(result.current.viewState.status).toBe("review");
    });

    it("should not change state when clearError is called on non-error state", async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(createMockGenerationResponse()),
      });

      const { result } = renderHook(() => useFlashcardGeneration());

      act(() => {
        result.current.setSourceText(createValidSourceText());
      });

      await act(async () => {
        await result.current.generateFlashcards();
      });

      expect(result.current.viewState.status).toBe("review");

      act(() => {
        result.current.clearError();
      });

      expect(result.current.viewState.status).toBe("review");
    });
  });

  // =========================================
  // Reset Functionality Tests
  // =========================================
  describe("Reset Functionality", () => {
    it("should reset to initial state", async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(createMockGenerationResponse()),
      });

      const { result } = renderHook(() => useFlashcardGeneration());

      act(() => {
        result.current.setSourceText(createValidSourceText());
      });

      await act(async () => {
        await result.current.generateFlashcards();
      });

      expect(result.current.viewState.status).toBe("review");
      expect(result.current.proposals.length).toBeGreaterThan(0);

      act(() => {
        result.current.resetToInitial();
      });

      expect(result.current.viewState).toEqual({ status: "idle" });
      expect(result.current.proposals).toEqual([]);
      expect(result.current.generationId).toBeNull();
      expect(result.current.error).toBeNull();
    });

    it("should reset from error state", async () => {
      mockFetch.mockRejectedValueOnce(new Error("Test error"));

      const { result } = renderHook(() => useFlashcardGeneration());

      act(() => {
        result.current.setSourceText(createValidSourceText());
      });

      await act(async () => {
        await result.current.generateFlashcards();
      });

      expect(result.current.viewState.status).toBe("error");

      act(() => {
        result.current.resetToInitial();
      });

      expect(result.current.viewState).toEqual({ status: "idle" });
      expect(result.current.error).toBeNull();
    });

    it("should reset from success state", async () => {
      mockFetch
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve(createMockGenerationResponse()),
        })
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve(createMockSaveResponse(3)),
        });

      const { result } = renderHook(() => useFlashcardGeneration());

      act(() => {
        result.current.setSourceText(createValidSourceText());
      });

      await act(async () => {
        await result.current.generateFlashcards();
      });

      await act(async () => {
        await result.current.saveAcceptedFlashcards();
      });

      expect(result.current.viewState.status).toBe("success");

      act(() => {
        result.current.resetToInitial();
      });

      expect(result.current.viewState).toEqual({ status: "idle" });
    });
  });

  // =========================================
  // State Machine Transitions Tests
  // =========================================
  describe("State Machine Transitions", () => {
    it("should follow idle -> generating -> review flow", async () => {
      // Use a delayed response to capture intermediate state
      let resolveResponse: (value: unknown) => void;
      const responsePromise = new Promise((resolve) => {
        resolveResponse = resolve;
      });

      mockFetch.mockImplementationOnce(() =>
        responsePromise.then(() => ({
          ok: true,
          json: () => Promise.resolve(createMockGenerationResponse()),
        }))
      );

      const { result } = renderHook(() => useFlashcardGeneration());

      expect(result.current.viewState.status).toBe("idle");

      act(() => {
        result.current.setSourceText(createValidSourceText());
      });

      // Start generation without awaiting
      let generatePromise: Promise<void>;
      act(() => {
        generatePromise = result.current.generateFlashcards();
      });

      // Should be in generating state while waiting for response
      expect(result.current.viewState.status).toBe("generating");

      // Now resolve the fetch and wait for completion
      await act(async () => {
        resolveResponse!(undefined);
        await generatePromise!;
      });

      expect(result.current.viewState.status).toBe("review");
    });

    it("should follow idle -> generating -> error flow", async () => {
      mockFetch.mockRejectedValueOnce(new Error("Error"));

      const { result } = renderHook(() => useFlashcardGeneration());

      expect(result.current.viewState.status).toBe("idle");

      act(() => {
        result.current.setSourceText(createValidSourceText());
      });

      await act(async () => {
        await result.current.generateFlashcards();
      });

      expect(result.current.viewState.status).toBe("error");
    });

    it("should follow review -> saving -> success flow", async () => {
      // Use a delayed response to capture intermediate state
      let resolveSaveResponse: (value: unknown) => void;
      const saveResponsePromise = new Promise((resolve) => {
        resolveSaveResponse = resolve;
      });

      mockFetch
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve(createMockGenerationResponse()),
        })
        .mockImplementationOnce(() =>
          saveResponsePromise.then(() => ({
            ok: true,
            json: () => Promise.resolve(createMockSaveResponse(3)),
          }))
        );

      const { result } = renderHook(() => useFlashcardGeneration());

      act(() => {
        result.current.setSourceText(createValidSourceText());
      });

      await act(async () => {
        await result.current.generateFlashcards();
      });

      expect(result.current.viewState.status).toBe("review");

      // Start save without awaiting
      let savePromise: Promise<void>;
      act(() => {
        savePromise = result.current.saveAcceptedFlashcards();
      });

      // Should be in saving state while waiting for response
      expect(result.current.viewState.status).toBe("saving");

      // Now resolve the fetch and wait for completion
      await act(async () => {
        resolveSaveResponse!(undefined);
        await savePromise!;
      });

      expect(result.current.viewState.status).toBe("success");
    });

    it("should follow review -> saving -> error flow", async () => {
      mockFetch
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve(createMockGenerationResponse()),
        })
        .mockRejectedValueOnce(new Error("Save error"));

      const { result } = renderHook(() => useFlashcardGeneration());

      act(() => {
        result.current.setSourceText(createValidSourceText());
      });

      await act(async () => {
        await result.current.generateFlashcards();
      });

      expect(result.current.viewState.status).toBe("review");

      await act(async () => {
        await result.current.saveAcceptedFlashcards();
      });

      expect(result.current.viewState.status).toBe("error");
    });

    it("should follow review -> idle flow via rejectAllProposals", async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(createMockGenerationResponse()),
      });

      const { result } = renderHook(() => useFlashcardGeneration());

      act(() => {
        result.current.setSourceText(createValidSourceText());
      });

      await act(async () => {
        await result.current.generateFlashcards();
      });

      expect(result.current.viewState.status).toBe("review");

      act(() => {
        result.current.rejectAllProposals();
      });

      expect(result.current.viewState.status).toBe("idle");
    });

    it("should follow error -> idle/review flow via clearError", async () => {
      mockFetch.mockRejectedValueOnce(new Error("Error"));

      const { result } = renderHook(() => useFlashcardGeneration());

      act(() => {
        result.current.setSourceText(createValidSourceText());
      });

      await act(async () => {
        await result.current.generateFlashcards();
      });

      expect(result.current.viewState.status).toBe("error");

      act(() => {
        result.current.clearError();
      });

      expect(result.current.viewState.status).toBe("idle");
    });
  });

  // =========================================
  // Edge Cases Tests
  // =========================================
  describe("Edge Cases", () => {
    it("should handle rapid sequential source text updates", () => {
      const { result } = renderHook(() => useFlashcardGeneration());

      act(() => {
        result.current.setSourceText("a");
        result.current.setSourceText("ab");
        result.current.setSourceText("abc");
      });

      expect(result.current.sourceText).toBe("abc");
    });

    it("should handle special characters in source text", () => {
      const { result } = renderHook(() => useFlashcardGeneration());

      const specialText = "Test with émojis 🎉 and spëcial chàracters: <>&\"'";

      act(() => {
        result.current.setSourceText(specialText);
      });

      expect(result.current.sourceText).toBe(specialText);
    });

    it("should handle proposals with special characters", async () => {
      const mockResponse = {
        generation_id: "gen-123",
        flashcards_proposals: [
          {
            front: "What is 2 + 2?",
            back: "4 (čtyři, четыре, 四)",
            source: "ai-full",
          },
        ],
        generated_count: 1,
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockResponse),
      });

      const { result } = renderHook(() => useFlashcardGeneration());

      act(() => {
        result.current.setSourceText(createValidSourceText());
      });

      await act(async () => {
        await result.current.generateFlashcards();
      });

      expect(result.current.proposals[0].front).toBe("What is 2 + 2?");
      expect(result.current.proposals[0].back).toBe("4 (čtyři, четыре, 四)");
    });

    it("should handle empty proposals array from API", async () => {
      const mockResponse = {
        generation_id: "gen-123",
        flashcards_proposals: [],
        generated_count: 0,
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockResponse),
      });

      const { result } = renderHook(() => useFlashcardGeneration());

      act(() => {
        result.current.setSourceText(createValidSourceText());
      });

      await act(async () => {
        await result.current.generateFlashcards();
      });

      expect(result.current.proposals).toEqual([]);
      expect(result.current.viewState.status).toBe("review");
    });

    it("should detect edit when only front is changed", async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(createMockGenerationResponse(1)),
      });

      mockUUID.mockReturnValueOnce("proposal-1");

      const { result } = renderHook(() => useFlashcardGeneration());

      act(() => {
        result.current.setSourceText(createValidSourceText());
      });

      await act(async () => {
        await result.current.generateFlashcards();
      });

      act(() => {
        result.current.updateProposal("proposal-1", { front: "Changed front" });
      });

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(createMockSaveResponse(1)),
      });

      await act(async () => {
        await result.current.saveAcceptedFlashcards();
      });

      const [, requestOptions] = mockFetch.mock.calls[1];
      const body = JSON.parse(requestOptions.body);

      expect(body.flashcards[0].source).toBe("ai-edited");
    });

    it("should detect edit when only back is changed", async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(createMockGenerationResponse(1)),
      });

      mockUUID.mockReturnValueOnce("proposal-1");

      const { result } = renderHook(() => useFlashcardGeneration());

      act(() => {
        result.current.setSourceText(createValidSourceText());
      });

      await act(async () => {
        await result.current.generateFlashcards();
      });

      act(() => {
        result.current.updateProposal("proposal-1", { back: "Changed back" });
      });

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(createMockSaveResponse(1)),
      });

      await act(async () => {
        await result.current.saveAcceptedFlashcards();
      });

      const [, requestOptions] = mockFetch.mock.calls[1];
      const body = JSON.parse(requestOptions.body);

      expect(body.flashcards[0].source).toBe("ai-edited");
    });

    it("should keep source as ai-full when edited back to original", async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(createMockGenerationResponse(1)),
      });

      mockUUID.mockReturnValueOnce("proposal-1");

      const { result } = renderHook(() => useFlashcardGeneration());

      act(() => {
        result.current.setSourceText(createValidSourceText());
      });

      await act(async () => {
        await result.current.generateFlashcards();
      });

      // Edit and then restore original
      act(() => {
        result.current.updateProposal("proposal-1", { front: "Changed" });
      });

      act(() => {
        result.current.updateProposal("proposal-1", { front: "Question 1" });
      });

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(createMockSaveResponse(1)),
      });

      await act(async () => {
        await result.current.saveAcceptedFlashcards();
      });

      const [, requestOptions] = mockFetch.mock.calls[1];
      const body = JSON.parse(requestOptions.body);

      expect(body.flashcards[0].source).toBe("ai-full");
    });
  });
});
