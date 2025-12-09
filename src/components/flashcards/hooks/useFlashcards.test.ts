import { renderHook, act, waitFor } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { useFlashcards } from "./useFlashcards";
import type { FlashcardListResponseDto, FlashcardDetailDto } from "@/types";

// Mock fetch globally
const mockFetch = vi.fn();
global.fetch = mockFetch;

// Helper to create mock flashcard list response
const createMockListResponse = (
  count: number,
  page: number = 1,
  total: number = count
): FlashcardListResponseDto => ({
  data: Array.from({ length: count }, (_, i) => ({
    id: `fc-${page}-${i + 1}`,
    front: `Question ${page}-${i + 1}`,
    back: `Answer ${page}-${i + 1}`,
    source: "manual" as const,
    created_at: new Date(2024, 0, 1 + i).toISOString(),
    updated_at: new Date(2024, 0, 1 + i).toISOString(),
  })),
  pagination: {
    page,
    limit: 20,
    total,
  },
});

// Helper to create mock flashcard detail response
const createMockFlashcardDetail = (
  id: string,
  front: string,
  back: string
): FlashcardDetailDto => ({
  id,
  front,
  back,
  source: "manual",
  created_at: new Date().toISOString(),
  updated_at: new Date().toISOString(),
  generation_id: null,
});

// Helper to wait for initial fetch
const waitForInitialFetch = async () => {
  await waitFor(() => {
    expect(mockFetch).toHaveBeenCalled();
  });
};

describe("useFlashcards", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockFetch.mockReset();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  // =========================================
  // Initial State Tests
  // =========================================
  describe("Initial State", () => {
    it("should initialize with loading state and empty flashcards", () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(createMockListResponse(0)),
      });

      const { result } = renderHook(() => useFlashcards());

      expect(result.current.isLoading).toBe(true);
      expect(result.current.flashcards).toEqual([]);
      expect(result.current.error).toBeNull();
      expect(result.current.hasMore).toBe(true);
      expect(result.current.totalCount).toBe(0);
      expect(result.current.isLoadingMore).toBe(false);
    });

    it("should fetch flashcards automatically on mount", async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(createMockListResponse(5)),
      });

      const { result } = renderHook(() => useFlashcards());

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(mockFetch).toHaveBeenCalledTimes(1);
      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining("/api/flashcards?")
      );
      expect(result.current.flashcards).toHaveLength(5);
    });
  });

  // =========================================
  // fetchFlashcards Tests
  // =========================================
  describe("fetchFlashcards", () => {
    it("should fetch flashcards with correct query parameters", async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(createMockListResponse(10)),
      });

      const { result } = renderHook(() => useFlashcards());

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      const callUrl = mockFetch.mock.calls[0][0];
      expect(callUrl).toContain("page=1");
      expect(callUrl).toContain("limit=20");
      expect(callUrl).toContain("sort=created_at");
      expect(callUrl).toContain("order=desc");
    });

    it("should map API response to view models correctly", async () => {
      const mockResponse = createMockListResponse(1);
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockResponse),
      });

      const { result } = renderHook(() => useFlashcards());

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      const flashcard = result.current.flashcards[0];
      expect(flashcard).toEqual({
        id: mockResponse.data[0].id,
        front: mockResponse.data[0].front,
        back: mockResponse.data[0].back,
        source: mockResponse.data[0].source,
        createdAt: expect.any(Date),
        updatedAt: expect.any(Date),
      });
    });

    it("should update totalCount from response", async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(createMockListResponse(10, 1, 50)),
      });

      const { result } = renderHook(() => useFlashcards());

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(result.current.totalCount).toBe(50);
    });

    it("should set hasMore=true when more pages exist", async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(createMockListResponse(20, 1, 50)),
      });

      const { result } = renderHook(() => useFlashcards());

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(result.current.hasMore).toBe(true);
    });

    it("should set hasMore=false when all items loaded", async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(createMockListResponse(5, 1, 5)),
      });

      const { result } = renderHook(() => useFlashcards());

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(result.current.hasMore).toBe(false);
    });

    it("should set hasMore=false when less than limit items returned", async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(createMockListResponse(15, 1, 30)),
      });

      const { result } = renderHook(() => useFlashcards());

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(result.current.hasMore).toBe(false);
    });

    it("should handle 401 unauthorized error", async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 401,
        json: () => Promise.resolve({}),
      });

      const { result } = renderHook(() => useFlashcards());

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(result.current.error).toBe("Sesja wygasła. Zaloguj się ponownie.");
    });

    it("should handle server error with message", async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 500,
        json: () => Promise.resolve({ message: "Database connection failed" }),
      });

      const { result } = renderHook(() => useFlashcards());

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(result.current.error).toBe("Database connection failed");
    });

    it("should handle server error without message", async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 503,
        json: () => Promise.reject(new Error("JSON parse error")),
      });

      const { result } = renderHook(() => useFlashcards());

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(result.current.error).toBe("Błąd serwera (503)");
    });

    it("should handle network error", async () => {
      mockFetch.mockRejectedValueOnce(new Error("Network error"));

      const { result } = renderHook(() => useFlashcards());

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(result.current.error).toBe("Network error");
    });

    it("should handle non-Error exceptions", async () => {
      mockFetch.mockRejectedValueOnce("String error");

      const { result } = renderHook(() => useFlashcards());

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(result.current.error).toBe("Nie udało się pobrać fiszek. Spróbuj ponownie.");
    });

    it("should reset page to 1 after fetch", async () => {
      // First load
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(createMockListResponse(20, 1, 50)),
      });

      const { result } = renderHook(() => useFlashcards());

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      // Load more to advance page
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(createMockListResponse(20, 2, 50)),
      });

      await act(async () => {
        await result.current.fetchMoreFlashcards();
      });

      // Now refresh - should reset to page 1
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(createMockListResponse(20, 1, 50)),
      });

      await act(async () => {
        await result.current.fetchFlashcards();
      });

      // Verify the third call used page=1
      const lastCallUrl = mockFetch.mock.calls[2][0];
      expect(lastCallUrl).toContain("page=1");
    });
  });

  // =========================================
  // fetchMoreFlashcards (Infinite Scroll) Tests
  // =========================================
  describe("fetchMoreFlashcards", () => {
    it("should fetch next page and append to existing flashcards", async () => {
      // Initial fetch
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(createMockListResponse(20, 1, 50)),
      });

      const { result } = renderHook(() => useFlashcards());

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(result.current.flashcards).toHaveLength(20);

      // Fetch more
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(createMockListResponse(20, 2, 50)),
      });

      await act(async () => {
        await result.current.fetchMoreFlashcards();
      });

      expect(result.current.flashcards).toHaveLength(40);
    });

    it("should increment page number", async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(createMockListResponse(20, 1, 60)),
      });

      const { result } = renderHook(() => useFlashcards());

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      // First fetchMore
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(createMockListResponse(20, 2, 60)),
      });

      await act(async () => {
        await result.current.fetchMoreFlashcards();
      });

      expect(mockFetch.mock.calls[1][0]).toContain("page=2");

      // Second fetchMore
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(createMockListResponse(20, 3, 60)),
      });

      await act(async () => {
        await result.current.fetchMoreFlashcards();
      });

      expect(mockFetch.mock.calls[2][0]).toContain("page=3");
    });

    it("should not fetch when isLoadingMore is true", async () => {
      // Use a delayed response
      let resolveFirstMore: () => void;
      const firstMorePromise = new Promise<void>((resolve) => {
        resolveFirstMore = resolve;
      });

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(createMockListResponse(20, 1, 100)),
      });

      const { result } = renderHook(() => useFlashcards());

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      // Start first fetchMore
      mockFetch.mockImplementationOnce(() =>
        firstMorePromise.then(() => ({
          ok: true,
          json: () => Promise.resolve(createMockListResponse(20, 2, 100)),
        }))
      );

      act(() => {
        result.current.fetchMoreFlashcards();
      });

      expect(result.current.isLoadingMore).toBe(true);

      // Try to fetch more while loading
      await act(async () => {
        await result.current.fetchMoreFlashcards();
      });

      // Should not have made additional fetch call
      expect(mockFetch).toHaveBeenCalledTimes(2);

      // Complete the first request
      await act(async () => {
        resolveFirstMore!();
        await firstMorePromise;
      });
    });

    it("should not fetch when hasMore is false", async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(createMockListResponse(5, 1, 5)),
      });

      const { result } = renderHook(() => useFlashcards());

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(result.current.hasMore).toBe(false);

      await act(async () => {
        await result.current.fetchMoreFlashcards();
      });

      // Should not have made additional fetch call
      expect(mockFetch).toHaveBeenCalledTimes(1);
    });

    it("should update hasMore correctly after fetching more", async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(createMockListResponse(20, 1, 35)),
      });

      const { result } = renderHook(() => useFlashcards());

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(result.current.hasMore).toBe(true);

      // Fetch last page (15 items)
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(createMockListResponse(15, 2, 35)),
      });

      await act(async () => {
        await result.current.fetchMoreFlashcards();
      });

      // 2 * 20 = 40 >= 35, so hasMore should be false
      expect(result.current.hasMore).toBe(false);
    });

    it("should handle error during fetchMore", async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(createMockListResponse(20, 1, 50)),
      });

      const { result } = renderHook(() => useFlashcards());

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 500,
        json: () => Promise.resolve({ message: "Server error" }),
      });

      await act(async () => {
        await result.current.fetchMoreFlashcards();
      });

      expect(result.current.error).toBe("Server error");
      expect(result.current.isLoadingMore).toBe(false);
    });

    it("should set isLoadingMore during fetch", async () => {
      let resolveMore: () => void;
      const morePromise = new Promise<void>((resolve) => {
        resolveMore = resolve;
      });

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(createMockListResponse(20, 1, 50)),
      });

      const { result } = renderHook(() => useFlashcards());

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      mockFetch.mockImplementationOnce(() =>
        morePromise.then(() => ({
          ok: true,
          json: () => Promise.resolve(createMockListResponse(20, 2, 50)),
        }))
      );

      act(() => {
        result.current.fetchMoreFlashcards();
      });

      expect(result.current.isLoadingMore).toBe(true);

      await act(async () => {
        resolveMore!();
        await morePromise;
      });

      expect(result.current.isLoadingMore).toBe(false);
    });
  });

  // =========================================
  // refreshFlashcards Tests
  // =========================================
  describe("refreshFlashcards", () => {
    it("should call fetchFlashcards", async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(createMockListResponse(5)),
      });

      const { result } = renderHook(() => useFlashcards());

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(createMockListResponse(10)),
      });

      await act(async () => {
        await result.current.refreshFlashcards();
      });

      expect(mockFetch).toHaveBeenCalledTimes(2);
      expect(result.current.flashcards).toHaveLength(10);
    });
  });

  // =========================================
  // createFlashcard Tests
  // =========================================
  describe("createFlashcard", () => {
    it("should create flashcard and add to beginning of list", async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(createMockListResponse(3)),
      });

      const { result } = renderHook(() => useFlashcards());

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      const newFlashcard = createMockFlashcardDetail("new-fc", "New Question", "New Answer");
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ flashcards: [newFlashcard] }),
      });

      let createdFlashcard;
      await act(async () => {
        createdFlashcard = await result.current.createFlashcard({
          front: "New Question",
          back: "New Answer",
        });
      });

      expect(result.current.flashcards[0].id).toBe("new-fc");
      expect(result.current.flashcards).toHaveLength(4);
      expect(createdFlashcard).toEqual(expect.objectContaining({
        id: "new-fc",
        front: "New Question",
        back: "New Answer",
      }));
    });

    it("should increment totalCount after create", async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(createMockListResponse(3, 1, 3)),
      });

      const { result } = renderHook(() => useFlashcards());

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(result.current.totalCount).toBe(3);

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () =>
          Promise.resolve({
            flashcards: [createMockFlashcardDetail("new-fc", "Q", "A")],
          }),
      });

      await act(async () => {
        await result.current.createFlashcard({ front: "Q", back: "A" });
      });

      expect(result.current.totalCount).toBe(4);
    });

    it("should trim front and back before sending", async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(createMockListResponse(0)),
      });

      const { result } = renderHook(() => useFlashcards());

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () =>
          Promise.resolve({
            flashcards: [createMockFlashcardDetail("fc-1", "Question", "Answer")],
          }),
      });

      await act(async () => {
        await result.current.createFlashcard({
          front: "  Question  ",
          back: "  Answer  ",
        });
      });

      const requestBody = JSON.parse(mockFetch.mock.calls[1][1].body);
      expect(requestBody.flashcards[0].front).toBe("Question");
      expect(requestBody.flashcards[0].back).toBe("Answer");
    });

    it("should send correct request payload", async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(createMockListResponse(0)),
      });

      const { result } = renderHook(() => useFlashcards());

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () =>
          Promise.resolve({
            flashcards: [createMockFlashcardDetail("fc-1", "Q", "A")],
          }),
      });

      await act(async () => {
        await result.current.createFlashcard({ front: "Q", back: "A" });
      });

      expect(mockFetch.mock.calls[1]).toEqual([
        "/api/flashcards",
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            flashcards: [
              {
                front: "Q",
                back: "A",
                source: "manual",
                generation_id: null,
              },
            ],
          }),
        },
      ]);
    });

    it("should throw error on server failure", async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(createMockListResponse(0)),
      });

      const { result } = renderHook(() => useFlashcards());

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 500,
        json: () => Promise.resolve({ message: "Validation error" }),
      });

      await expect(
        act(async () => {
          await result.current.createFlashcard({ front: "Q", back: "A" });
        })
      ).rejects.toThrow("Validation error");
    });

    it("should throw default error message when no message in response", async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(createMockListResponse(0)),
      });

      const { result } = renderHook(() => useFlashcards());

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 500,
        json: () => Promise.reject(new Error("JSON error")),
      });

      await expect(
        act(async () => {
          await result.current.createFlashcard({ front: "Q", back: "A" });
        })
      ).rejects.toThrow("Nie udało się zapisać fiszki. Spróbuj ponownie.");
    });
  });

  // =========================================
  // updateFlashcard Tests
  // =========================================
  describe("updateFlashcard", () => {
    it("should update flashcard in list", async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(createMockListResponse(3)),
      });

      const { result } = renderHook(() => useFlashcards());

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      const flashcardId = result.current.flashcards[1].id;
      const updatedFlashcard = createMockFlashcardDetail(
        flashcardId,
        "Updated Question",
        "Updated Answer"
      );

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(updatedFlashcard),
      });

      await act(async () => {
        await result.current.updateFlashcard(flashcardId, {
          front: "Updated Question",
          back: "Updated Answer",
        });
      });

      const updatedInList = result.current.flashcards.find((f) => f.id === flashcardId);
      expect(updatedInList?.front).toBe("Updated Question");
      expect(updatedInList?.back).toBe("Updated Answer");
    });

    it("should trim front and back before sending", async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(createMockListResponse(1)),
      });

      const { result } = renderHook(() => useFlashcards());

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      const flashcardId = result.current.flashcards[0].id;

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(createMockFlashcardDetail(flashcardId, "Q", "A")),
      });

      await act(async () => {
        await result.current.updateFlashcard(flashcardId, {
          front: "  Question  ",
          back: "  Answer  ",
        });
      });

      const requestBody = JSON.parse(mockFetch.mock.calls[1][1].body);
      expect(requestBody.front).toBe("Question");
      expect(requestBody.back).toBe("Answer");
    });

    it("should return updated flashcard", async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(createMockListResponse(1)),
      });

      const { result } = renderHook(() => useFlashcards());

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      const flashcardId = result.current.flashcards[0].id;
      const updatedFlashcard = createMockFlashcardDetail(flashcardId, "Updated Q", "Updated A");

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(updatedFlashcard),
      });

      let returnedFlashcard;
      await act(async () => {
        returnedFlashcard = await result.current.updateFlashcard(flashcardId, {
          front: "Updated Q",
          back: "Updated A",
        });
      });

      expect(returnedFlashcard).toEqual(
        expect.objectContaining({
          id: flashcardId,
          front: "Updated Q",
          back: "Updated A",
        })
      );
    });

    it("should handle 404 not found error", async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(createMockListResponse(1)),
      });

      const { result } = renderHook(() => useFlashcards());

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 404,
        json: () => Promise.resolve({}),
      });

      await expect(
        act(async () => {
          await result.current.updateFlashcard("non-existent", {
            front: "Q",
            back: "A",
          });
        })
      ).rejects.toThrow("Fiszka nie została znaleziona. Mogła zostać usunięta.");
    });

    it("should handle server error", async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(createMockListResponse(1)),
      });

      const { result } = renderHook(() => useFlashcards());

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 500,
        json: () => Promise.resolve({ message: "Internal error" }),
      });

      await expect(
        act(async () => {
          await result.current.updateFlashcard("fc-1-1", {
            front: "Q",
            back: "A",
          });
        })
      ).rejects.toThrow("Internal error");
    });

    it("should use correct API endpoint", async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(createMockListResponse(1)),
      });

      const { result } = renderHook(() => useFlashcards());

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      const flashcardId = result.current.flashcards[0].id;

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(createMockFlashcardDetail(flashcardId, "Q", "A")),
      });

      await act(async () => {
        await result.current.updateFlashcard(flashcardId, { front: "Q", back: "A" });
      });

      expect(mockFetch.mock.calls[1][0]).toBe(`/api/flashcards/${flashcardId}`);
      expect(mockFetch.mock.calls[1][1].method).toBe("PUT");
    });
  });

  // =========================================
  // deleteFlashcard Tests (Optimistic UI)
  // =========================================
  describe("deleteFlashcard", () => {
    // Helper to setup flashcards for delete tests
    const setupForDelete = async (count = 3, total = 10) => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(createMockListResponse(count, 1, total)),
      });

      const { result } = renderHook(() => useFlashcards());

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      return result;
    };

    it("should remove flashcard from list after successful delete", async () => {
      const result = await setupForDelete(3);
      const flashcardId = result.current.flashcards[1].id;

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ message: "Deleted" }),
      });

      await act(async () => {
        await result.current.deleteFlashcard(flashcardId);
      });

      expect(result.current.flashcards.find((f) => f.id === flashcardId)).toBeUndefined();
      expect(result.current.flashcards).toHaveLength(2);
    });

    it("should decrement totalCount after delete", async () => {
      const result = await setupForDelete(3, 10);

      expect(result.current.totalCount).toBe(10);

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ message: "Deleted" }),
      });

      await act(async () => {
        await result.current.deleteFlashcard(result.current.flashcards[0].id);
      });

      expect(result.current.totalCount).toBe(9);
    });

    it("should do nothing when flashcard not found in list", async () => {
      const result = await setupForDelete(3);

      await act(async () => {
        await result.current.deleteFlashcard("non-existent-id");
      });

      // No API call should be made (only the initial fetch)
      expect(mockFetch).toHaveBeenCalledTimes(1);
      expect(result.current.flashcards).toHaveLength(3);
    });

    it("should use correct API endpoint", async () => {
      const result = await setupForDelete(1);
      const flashcardId = result.current.flashcards[0].id;

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ message: "Deleted" }),
      });

      await act(async () => {
        await result.current.deleteFlashcard(flashcardId);
      });

      expect(mockFetch.mock.calls[1][0]).toBe(`/api/flashcards/${flashcardId}`);
      expect(mockFetch.mock.calls[1][1].method).toBe("DELETE");
    });
  });

  // =========================================
  // clearError Tests
  // =========================================
  describe("clearError", () => {
    it("should clear error state", async () => {
      mockFetch.mockRejectedValueOnce(new Error("Network error"));

      const { result } = renderHook(() => useFlashcards());

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(result.current.error).toBe("Network error");

      act(() => {
        result.current.clearError();
      });

      expect(result.current.error).toBeNull();
    });
  });

  // =========================================
  // Edge Cases Tests
  // =========================================
  describe("Edge Cases", () => {
    it("should handle empty flashcards list", async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(createMockListResponse(0, 1, 0)),
      });

      const { result } = renderHook(() => useFlashcards());

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(result.current.flashcards).toEqual([]);
      expect(result.current.totalCount).toBe(0);
      expect(result.current.hasMore).toBe(false);
    });

    it("should handle flashcards with special characters", async () => {
      const specialResponse: FlashcardListResponseDto = {
        data: [
          {
            id: "fc-special",
            front: "What is 2 + 2? <script>alert('xss')</script>",
            back: "4 🎉 (čtyři, четыре)",
            source: "manual",
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          },
        ],
        pagination: { page: 1, limit: 20, total: 1 },
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(specialResponse),
      });

      const { result } = renderHook(() => useFlashcards());

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(result.current.flashcards[0].front).toBe(
        "What is 2 + 2? <script>alert('xss')</script>"
      );
      expect(result.current.flashcards[0].back).toBe("4 🎉 (čtyři, четыре)");
    });

    it("should preserve list order during concurrent operations", async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(createMockListResponse(5)),
      });

      const { result } = renderHook(() => useFlashcards());

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      const originalOrder = result.current.flashcards.map((f) => f.id);

      // Update middle flashcard
      const updatedFlashcard = createMockFlashcardDetail(
        originalOrder[2],
        "Updated",
        "Updated"
      );

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(updatedFlashcard),
      });

      await act(async () => {
        await result.current.updateFlashcard(originalOrder[2], {
          front: "Updated",
          back: "Updated",
        });
      });

      // Order should be preserved
      expect(result.current.flashcards.map((f) => f.id)).toEqual(originalOrder);
    });

    it("should handle dates correctly", async () => {
      const specificDate = "2024-06-15T10:30:00.000Z";
      const response: FlashcardListResponseDto = {
        data: [
          {
            id: "fc-1",
            front: "Q",
            back: "A",
            source: "manual",
            created_at: specificDate,
            updated_at: specificDate,
          },
        ],
        pagination: { page: 1, limit: 20, total: 1 },
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(response),
      });

      const { result } = renderHook(() => useFlashcards());

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(result.current.flashcards[0].createdAt).toEqual(new Date(specificDate));
      expect(result.current.flashcards[0].updatedAt).toEqual(new Date(specificDate));
    });

    it("should handle different source types", async () => {
      const response: FlashcardListResponseDto = {
        data: [
          {
            id: "fc-1",
            front: "Q1",
            back: "A1",
            source: "manual",
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          },
          {
            id: "fc-2",
            front: "Q2",
            back: "A2",
            source: "ai-full",
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          },
          {
            id: "fc-3",
            front: "Q3",
            back: "A3",
            source: "ai-edited",
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          },
        ],
        pagination: { page: 1, limit: 20, total: 3 },
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(response),
      });

      const { result } = renderHook(() => useFlashcards());

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(result.current.flashcards[0].source).toBe("manual");
      expect(result.current.flashcards[1].source).toBe("ai-full");
      expect(result.current.flashcards[2].source).toBe("ai-edited");
    });

    it("should handle sequential delete requests", async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(createMockListResponse(5)),
      });

      const { result } = renderHook(() => useFlashcards());

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      const ids = result.current.flashcards.map((f) => f.id);

      // Mock successful deletes
      mockFetch
        .mockResolvedValueOnce({ ok: true, json: () => Promise.resolve({}) })
        .mockResolvedValueOnce({ ok: true, json: () => Promise.resolve({}) });

      // Delete two flashcards sequentially
      await act(async () => {
        await result.current.deleteFlashcard(ids[0]);
      });

      await act(async () => {
        await result.current.deleteFlashcard(ids[1]);
      });

      expect(result.current.flashcards).toHaveLength(3);
      expect(result.current.flashcards.find((f) => f.id === ids[0])).toBeUndefined();
      expect(result.current.flashcards.find((f) => f.id === ids[1])).toBeUndefined();
    });
  });

  // =========================================
  // Loading States Tests
  // =========================================
  describe("Loading States", () => {
    it("should manage isLoading state correctly during fetch", async () => {
      let resolveResponse: () => void;
      const responsePromise = new Promise<void>((resolve) => {
        resolveResponse = resolve;
      });

      mockFetch.mockImplementationOnce(() =>
        responsePromise.then(() => ({
          ok: true,
          json: () => Promise.resolve(createMockListResponse(5)),
        }))
      );

      const { result } = renderHook(() => useFlashcards());

      expect(result.current.isLoading).toBe(true);

      await act(async () => {
        resolveResponse!();
        await responsePromise;
      });

      expect(result.current.isLoading).toBe(false);
    });

    it("should set isLoading=false even on error", async () => {
      mockFetch.mockRejectedValueOnce(new Error("Error"));

      const { result } = renderHook(() => useFlashcards());

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(result.current.error).not.toBeNull();
    });

    it("should set isLoadingMore=false even on error", async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(createMockListResponse(20, 1, 50)),
      });

      const { result } = renderHook(() => useFlashcards());

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      mockFetch.mockRejectedValueOnce(new Error("Error"));

      await act(async () => {
        await result.current.fetchMoreFlashcards();
      });

      expect(result.current.isLoadingMore).toBe(false);
    });
  });
});
