/**
 * Types for the generations history view components
 */

import type { GenerationSummaryDto } from "../../types";

/**
 * ViewModel dla pojedynczej generacji w widoku listy.
 * Rozszerza dane z API o przetworzone pola dla prezentacji.
 */
export interface GenerationListItemViewModel {
  /** ID generacji */
  id: string;
  /** Liczba wygenerowanych fiszek */
  generatedCount: number;
  /** Liczba zaakceptowanych fiszek (edytowanych) */
  acceptedEditedCount: number;
  /** Liczba zaakceptowanych fiszek (bez edycji) */
  acceptedUneditedCount: number;
  /** Całkowita liczba zaakceptowanych fiszek */
  totalAcceptedCount: number;
  /** Długość tekstu źródłowego (w znakach) */
  sourceTextLength: number;
  /** Skuteczność (procent zaakceptowanych) */
  acceptanceRate: number;
  /** Data utworzenia */
  createdAt: Date;
  /** Data aktualizacji */
  updatedAt: Date;
}

/**
 * Stan paginacji widoku
 */
export interface PaginationState {
  /** Aktualna strona (1-indexed) */
  page: number;
  /** Liczba elementów na stronie */
  limit: number;
  /** Całkowita liczba rekordów */
  total: number;
  /** Całkowita liczba stron */
  totalPages: number;
}

/**
 * Stan widoku historii generacji
 */
export interface GenerationsViewState {
  /** Lista generacji */
  generations: GenerationListItemViewModel[];
  /** Stan paginacji */
  pagination: PaginationState;
  /** Kolejność sortowania */
  sortOrder: "asc" | "desc";
  /** Stan ładowania */
  isLoading: boolean;
  /** Błąd (jeśli wystąpił) */
  error: string | null;
}

/**
 * Parametry zapytania do API
 */
export interface GenerationsQueryParams {
  page: number;
  limit: number;
  order: "asc" | "desc";
}

// =====================================
// Funkcje mapujące
// =====================================

/**
 * Mapuje GenerationSummaryDto na GenerationListItemViewModel
 */
export function mapGenerationDtoToViewModel(
  dto: GenerationSummaryDto
): GenerationListItemViewModel {
  const acceptedEditedCount = dto.accepted_edited_count ?? 0;
  const acceptedUneditedCount = dto.accepted_unedited_count ?? 0;
  const totalAcceptedCount = acceptedEditedCount + acceptedUneditedCount;
  const generatedCount = dto.generated_count ?? 0;
  const acceptanceRate =
    generatedCount > 0
      ? Math.round((totalAcceptedCount / generatedCount) * 100)
      : 0;

  return {
    id: dto.id,
    generatedCount,
    acceptedEditedCount,
    acceptedUneditedCount,
    totalAcceptedCount,
    sourceTextLength: dto.source_text_length ?? 0,
    acceptanceRate,
    createdAt: new Date(dto.created_at),
    updatedAt: new Date(dto.updated_at),
  };
}

// =====================================
// Props dla komponentów
// =====================================

export interface GenerationsTableProps {
  generations: GenerationListItemViewModel[];
  sortOrder: "asc" | "desc";
  onSortOrderChange: (order: "asc" | "desc") => void;
}

export interface GenerationsTableRowProps {
  generation: GenerationListItemViewModel;
}

export interface PaginationProps {
  page: number;
  limit: number;
  total: number;
  onPageChange: (page: number) => void;
  onLimitChange: (limit: number) => void;
  isLoading?: boolean;
}

export interface LoadingStateProps {
  rowCount?: number;
}

export interface ErrorStateProps {
  error: string;
  onRetry: () => void;
}

// =====================================
// Typy dla hooka
// =====================================

export interface UseGenerationsReturn {
  // Stan
  generations: GenerationListItemViewModel[];
  pagination: PaginationState;
  sortOrder: "asc" | "desc";
  isLoading: boolean;
  error: string | null;

  // Akcje
  setPage: (page: number) => void;
  setLimit: (limit: number) => void;
  setSortOrder: (order: "asc" | "desc") => void;
  refresh: () => Promise<void>;
  clearError: () => void;
}
