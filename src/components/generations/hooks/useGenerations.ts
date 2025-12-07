import { useState, useCallback, useEffect } from "react";
import type { GenerationListResponseDto } from "@/types";
import type {
  GenerationListItemViewModel,
  PaginationState,
  UseGenerationsReturn,
} from "../types";
import { mapGenerationDtoToViewModel } from "../types";

const DEFAULT_LIMIT = 20;
const ALLOWED_LIMITS = [10, 20, 50] as const;

/**
 * Hook zarządzający całym stanem widoku historii generacji.
 * Odpowiada za pobieranie danych, paginację i sortowanie.
 */
export function useGenerations(): UseGenerationsReturn {
  // Stan listy
  const [generations, setGenerations] = useState<GenerationListItemViewModel[]>(
    []
  );
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Stan paginacji i sortowania
  const [page, setPageState] = useState(1);
  const [limit, setLimitState] = useState(DEFAULT_LIMIT);
  const [total, setTotal] = useState(0);
  const [sortOrder, setSortOrderState] = useState<"asc" | "desc">("desc");

  // Obliczane wartości
  const totalPages = Math.max(1, Math.ceil(total / limit));
  const pagination: PaginationState = { page, limit, total, totalPages };

  // Funkcja pobierania danych
  const fetchGenerations = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    try {
      const params = new URLSearchParams({
        page: page.toString(),
        limit: limit.toString(),
        order: sortOrder,
      });

      const response = await fetch(`/api/generations?${params}`);

      if (!response.ok) {
        // Obsługa błędów HTTP
        if (response.status === 401) {
          window.location.href = "/auth/login";
          return;
        }

        if (response.status === 400) {
          const errorData = await response.json().catch(() => ({}));
          setError(
            errorData.message || "Nieprawidłowe parametry zapytania."
          );
          return;
        }

        if (response.status >= 500) {
          setError("Błąd serwera. Spróbuj ponownie za chwilę.");
          return;
        }

        setError(`Nieoczekiwany błąd (${response.status})`);
        return;
      }

      const data: GenerationListResponseDto = await response.json();
      const viewModels = data.data.map(mapGenerationDtoToViewModel);

      setGenerations(viewModels);
      setTotal(data.pagination.total);
    } catch (err) {
      if (err instanceof TypeError) {
        setError("Brak połączenia z serwerem. Sprawdź połączenie internetowe.");
      } else {
        setError("Wystąpił nieoczekiwany błąd. Spróbuj ponownie.");
      }
    } finally {
      setIsLoading(false);
    }
  }, [page, limit, sortOrder]);

  // Efekt pobierania przy zmianie parametrów
  useEffect(() => {
    fetchGenerations();
  }, [fetchGenerations]);

  // Zmiana strony z walidacją
  const setPage = useCallback(
    (newPage: number) => {
      const validPage = Math.max(1, Math.min(newPage, totalPages));
      setPageState(validPage);
    },
    [totalPages]
  );

  // Zmiana limitu z resetowaniem strony
  const setLimit = useCallback((newLimit: number) => {
    const validLimit = ALLOWED_LIMITS.includes(newLimit as typeof ALLOWED_LIMITS[number])
      ? newLimit
      : DEFAULT_LIMIT;
    setLimitState(validLimit);
    setPageState(1); // Reset do pierwszej strony
  }, []);

  // Zmiana sortowania
  const setSortOrder = useCallback((order: "asc" | "desc") => {
    setSortOrderState(order);
    setPageState(1); // Reset do pierwszej strony przy zmianie sortowania
  }, []);

  // Czyszczenie błędu
  const clearError = useCallback(() => {
    setError(null);
  }, []);

  return {
    generations,
    pagination,
    sortOrder,
    isLoading,
    error,
    setPage,
    setLimit,
    setSortOrder,
    refresh: fetchGenerations,
    clearError,
  };
}
