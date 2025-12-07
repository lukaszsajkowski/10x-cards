import { useState, useCallback, useEffect } from "react";
import type { FlashcardListResponseDto, FlashcardDetailDto } from "@/types";
import type { FlashcardListItemViewModel, FlashcardFormData, UseFlashcardsReturn } from "../types";
import { mapFlashcardDtoToViewModel } from "../types";

const DEFAULT_LIMIT = 20;

/**
 * Hook zarządzający całym stanem widoku "Moje Fiszki"
 * Odpowiada za pobieranie, infinite scroll, CRUD i optimistic UI
 */
export function useFlashcards(): UseFlashcardsReturn {
  // Stan listy
  const [flashcards, setFlashcards] = useState<FlashcardListItemViewModel[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Stan paginacji
  const [page, setPage] = useState(1);
  const [totalCount, setTotalCount] = useState(0);
  const [hasMore, setHasMore] = useState(true);

  // Pobieranie listy fiszek
  const fetchFlashcards = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    try {
      const searchParams = new URLSearchParams({
        page: "1",
        limit: DEFAULT_LIMIT.toString(),
        sort: "created_at",
        order: "desc",
      });

      const response = await fetch(`/api/flashcards?${searchParams}`);

      if (!response.ok) {
        if (response.status === 401) {
          throw new Error("Sesja wygasła. Zaloguj się ponownie.");
        }
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.message || `Błąd serwera (${response.status})`);
      }

      const data: FlashcardListResponseDto = await response.json();

      const viewModels = data.data.map(mapFlashcardDtoToViewModel);
      setFlashcards(viewModels);
      setPage(1);
      setTotalCount(data.pagination.total);
      setHasMore(data.data.length >= DEFAULT_LIMIT && data.pagination.total > DEFAULT_LIMIT);
    } catch (err) {
      const message = err instanceof Error ? err.message : "Nie udało się pobrać fiszek. Spróbuj ponownie.";
      setError(message);
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Pobieranie kolejnej strony (infinite scroll)
  const fetchMoreFlashcards = useCallback(async () => {
    if (isLoadingMore || !hasMore) return;

    setIsLoadingMore(true);

    try {
      const nextPage = page + 1;
      const searchParams = new URLSearchParams({
        page: nextPage.toString(),
        limit: DEFAULT_LIMIT.toString(),
        sort: "created_at",
        order: "desc",
      });

      const response = await fetch(`/api/flashcards?${searchParams}`);

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.message || `Błąd serwera (${response.status})`);
      }

      const data: FlashcardListResponseDto = await response.json();

      const viewModels = data.data.map(mapFlashcardDtoToViewModel);
      setFlashcards((prev) => [...prev, ...viewModels]);
      setPage(nextPage);
      setHasMore(data.data.length >= DEFAULT_LIMIT && nextPage * DEFAULT_LIMIT < data.pagination.total);
    } catch (err) {
      const message = err instanceof Error ? err.message : "Nie udało się pobrać więcej fiszek.";
      setError(message);
    } finally {
      setIsLoadingMore(false);
    }
  }, [isLoadingMore, hasMore, page]);

  // Odświeżenie listy
  const refreshFlashcards = useCallback(async () => {
    await fetchFlashcards();
  }, [fetchFlashcards]);

  // Tworzenie fiszki
  const createFlashcard = useCallback(async (data: FlashcardFormData): Promise<FlashcardListItemViewModel> => {
    const response = await fetch("/api/flashcards", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        flashcards: [
          {
            front: data.front.trim(),
            back: data.back.trim(),
            source: "manual",
            generation_id: null,
          },
        ],
      }),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.message || "Nie udało się zapisać fiszki. Spróbuj ponownie.");
    }

    const result: { flashcards: FlashcardDetailDto[] } = await response.json();
    const newFlashcard = mapFlashcardDtoToViewModel(result.flashcards[0]);

    // Dodaj na początek listy
    setFlashcards((prev) => [newFlashcard, ...prev]);
    setTotalCount((prev) => prev + 1);

    return newFlashcard;
  }, []);

  // Aktualizacja fiszki
  const updateFlashcard = useCallback(
    async (id: string, data: FlashcardFormData): Promise<FlashcardListItemViewModel> => {
      const response = await fetch(`/api/flashcards/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          front: data.front.trim(),
          back: data.back.trim(),
        }),
      });

      if (!response.ok) {
        if (response.status === 404) {
          throw new Error("Fiszka nie została znaleziona. Mogła zostać usunięta.");
        }
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.message || "Nie udało się zapisać zmian. Spróbuj ponownie.");
      }

      const updatedDto: FlashcardDetailDto = await response.json();
      const updatedFlashcard = mapFlashcardDtoToViewModel(updatedDto);

      // Aktualizuj w liście
      setFlashcards((prev) => prev.map((f) => (f.id === id ? updatedFlashcard : f)));

      return updatedFlashcard;
    },
    []
  );

  // Usuwanie fiszki z Optimistic UI
  const deleteFlashcard = useCallback(
    async (id: string): Promise<void> => {
      // Zapisz kopię dla rollbacku
      const flashcardToDelete = flashcards.find((f) => f.id === id);
      const originalIndex = flashcards.findIndex((f) => f.id === id);

      if (!flashcardToDelete) return;

      // Optimistic update - oznacz jako usuwane
      setFlashcards((prev) => prev.map((f) => (f.id === id ? { ...f, isDeleting: true } : f)));

      // Krótkie opóźnienie dla animacji
      await new Promise((resolve) => setTimeout(resolve, 200));

      // Usuń z listy
      setFlashcards((prev) => prev.filter((f) => f.id !== id));
      setTotalCount((prev) => prev - 1);

      try {
        const response = await fetch(`/api/flashcards/${id}`, {
          method: "DELETE",
        });

        if (!response.ok) {
          // Rollback
          setFlashcards((prev) => {
            const newList = [...prev];
            newList.splice(originalIndex, 0, flashcardToDelete);
            return newList;
          });
          setTotalCount((prev) => prev + 1);

          if (response.status === 404) {
            // Fiszka już nie istnieje - nie rollback
            return;
          }

          const errorData = await response.json().catch(() => ({}));
          throw new Error(errorData.message || "Nie udało się usunąć fiszki. Spróbuj ponownie.");
        }
      } catch (err) {
        // Rollback przy błędzie sieciowym
        setFlashcards((prev) => {
          const newList = [...prev];
          newList.splice(originalIndex, 0, flashcardToDelete);
          return newList;
        });
        setTotalCount((prev) => prev + 1);
        throw err;
      }
    },
    [flashcards]
  );

  // Czyszczenie błędu
  const clearError = useCallback(() => {
    setError(null);
  }, []);

  // Automatyczne pobieranie przy montowaniu
  useEffect(() => {
    fetchFlashcards();
  }, [fetchFlashcards]);

  return {
    // Stan listy
    flashcards,
    isLoading,
    isLoadingMore,
    error,

    // Paginacja
    hasMore,
    totalCount,

    // Akcje listy
    fetchFlashcards,
    fetchMoreFlashcards,
    refreshFlashcards,

    // Operacje CRUD
    createFlashcard,
    updateFlashcard,
    deleteFlashcard,

    // Obsługa błędów
    clearError,
  };
}
