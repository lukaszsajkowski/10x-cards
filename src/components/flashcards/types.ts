/**
 * Types for the flashcards view components
 */

import type { FlashcardListItemDto } from "../../types";

/**
 * Stałe walidacyjne dla formularza fiszki
 */
export const FLASHCARD_VALIDATION = {
  FRONT_MIN_LENGTH: 1,
  FRONT_MAX_LENGTH: 200,
  BACK_MIN_LENGTH: 1,
  BACK_MAX_LENGTH: 500,
} as const;

/**
 * Rozszerzony model fiszki dla warstwy prezentacji
 * Zawiera dane z API oraz metadane UI
 */
export interface FlashcardListItemViewModel {
  /** ID fiszki z bazy danych */
  id: string;
  /** Treść przodu fiszki */
  front: string;
  /** Treść tyłu fiszki */
  back: string;
  /** Źródło fiszki */
  source: "ai-full" | "ai-edited" | "manual";
  /** Data utworzenia */
  createdAt: Date;
  /** Data ostatniej aktualizacji */
  updatedAt: Date;
  /** Czy fiszka jest w trakcie usuwania (Optimistic UI) */
  isDeleting?: boolean;
}

/**
 * Dane formularza tworzenia/edycji fiszki
 */
export interface FlashcardFormData {
  /** Treść przodu fiszki */
  front: string;
  /** Treść tyłu fiszki */
  back: string;
}

/**
 * Wynik walidacji formularza fiszki
 */
export interface FlashcardFormValidation {
  isValid: boolean;
  errors: {
    front?: string;
    back?: string;
  };
}

/**
 * Stan widoku "Moje Fiszki"
 */
export interface FlashcardsViewState {
  /** Lista fiszek */
  flashcards: FlashcardListItemViewModel[];
  /** Metadane paginacji */
  pagination: {
    page: number;
    limit: number;
    total: number;
    hasMore: boolean;
  };
  /** Stan ładowania początkowego */
  isLoading: boolean;
  /** Stan ładowania kolejnej strony */
  isLoadingMore: boolean;
  /** Błąd (jeśli wystąpił) */
  error: string | null;
}

/**
 * Stan dialogów w widoku
 */
export interface FlashcardsDialogState {
  /** Czy dialog tworzenia jest otwarty */
  isCreateDialogOpen: boolean;
  /** Czy dialog edycji jest otwarty */
  isEditDialogOpen: boolean;
  /** Czy dialog usuwania jest otwarty */
  isDeleteDialogOpen: boolean;
  /** Fiszka wybrana do edycji */
  flashcardToEdit: FlashcardListItemViewModel | null;
  /** Fiszka wybrana do usunięcia */
  flashcardToDelete: FlashcardListItemViewModel | null;
  /** Stan zapisywania (tworzenie/edycja) */
  isSubmitting: boolean;
  /** Stan usuwania */
  isDeleting: boolean;
}

// =====================================
// Funkcje mapujące
// =====================================

/**
 * Funkcja mapująca DTO na ViewModel
 */
export function mapFlashcardDtoToViewModel(dto: FlashcardListItemDto): FlashcardListItemViewModel {
  return {
    id: dto.id,
    front: dto.front,
    back: dto.back,
    source: dto.source as FlashcardListItemViewModel["source"],
    createdAt: new Date(dto.created_at),
    updatedAt: new Date(dto.updated_at),
  };
}

/**
 * Funkcja walidująca formularz fiszki
 */
export function validateFlashcardForm(data: FlashcardFormData): FlashcardFormValidation {
  const errors: FlashcardFormValidation["errors"] = {};

  // Walidacja pola front
  const frontTrimmed = data.front.trim();
  if (frontTrimmed.length === 0) {
    errors.front = "Pole jest wymagane";
  } else if (frontTrimmed.length > FLASHCARD_VALIDATION.FRONT_MAX_LENGTH) {
    errors.front = `Maksymalnie ${FLASHCARD_VALIDATION.FRONT_MAX_LENGTH} znaków`;
  }

  // Walidacja pola back
  const backTrimmed = data.back.trim();
  if (backTrimmed.length === 0) {
    errors.back = "Pole jest wymagane";
  } else if (backTrimmed.length > FLASHCARD_VALIDATION.BACK_MAX_LENGTH) {
    errors.back = `Maksymalnie ${FLASHCARD_VALIDATION.BACK_MAX_LENGTH} znaków`;
  }

  return {
    isValid: Object.keys(errors).length === 0,
    errors,
  };
}

// =====================================
// Props dla komponentów
// =====================================

export interface FlashcardsHeaderProps {
  onCreateClick: () => void;
}

export interface CreateFlashcardButtonProps {
  onClick: () => void;
  disabled?: boolean;
}

export interface FlashcardListProps {
  flashcards: FlashcardListItemViewModel[];
  onEdit: (flashcard: FlashcardListItemViewModel) => void;
  onDelete: (flashcard: FlashcardListItemViewModel) => void;
  onLoadMore: () => void;
  hasMore: boolean;
  isLoadingMore: boolean;
}

export interface FlashcardItemProps {
  flashcard: FlashcardListItemViewModel;
  onEdit: () => void;
  onDelete: () => void;
  isDeleting?: boolean;
}

export interface FlashcardContentProps {
  front: string;
  back: string;
}

export interface FlashcardItemActionsProps {
  onEdit: () => void;
  onDelete: () => void;
  disabled?: boolean;
}

export interface LoadMoreTriggerProps {
  onIntersect: () => void;
  hasMore: boolean;
  isLoading: boolean;
}

export interface EmptyStateProps {
  onCreateClick: () => void;
}

export interface LoadingStateProps {
  count?: number;
}

export interface CreateFlashcardDialogProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (data: FlashcardFormData) => Promise<void>;
  isSubmitting: boolean;
}

export interface EditFlashcardDialogProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  flashcard: FlashcardListItemViewModel | null;
  onSubmit: (data: FlashcardFormData) => Promise<void>;
  isSubmitting: boolean;
}

export interface FlashcardFormProps {
  initialData?: FlashcardFormData;
  onSubmit: (data: FlashcardFormData) => void;
  onCancel: () => void;
  isSubmitting: boolean;
  submitLabel?: string;
}

export interface DeleteConfirmDialogProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  flashcard: FlashcardListItemViewModel | null;
  onConfirm: () => Promise<void>;
  isDeleting: boolean;
}

// =====================================
// Typy dla hooków
// =====================================

export interface UseFlashcardsReturn {
  // Stan listy
  flashcards: FlashcardListItemViewModel[];
  isLoading: boolean;
  isLoadingMore: boolean;
  error: string | null;

  // Paginacja
  hasMore: boolean;
  totalCount: number;

  // Akcje listy
  fetchFlashcards: () => Promise<void>;
  fetchMoreFlashcards: () => Promise<void>;
  refreshFlashcards: () => Promise<void>;

  // Operacje CRUD
  createFlashcard: (data: FlashcardFormData) => Promise<FlashcardListItemViewModel>;
  updateFlashcard: (id: string, data: FlashcardFormData) => Promise<FlashcardListItemViewModel>;
  deleteFlashcard: (id: string) => Promise<void>;

  // Obsługa błędów
  clearError: () => void;
}

export interface UseFlashcardDialogsReturn {
  // Dialog tworzenia
  isCreateDialogOpen: boolean;
  openCreateDialog: () => void;
  closeCreateDialog: () => void;

  // Dialog edycji
  isEditDialogOpen: boolean;
  flashcardToEdit: FlashcardListItemViewModel | null;
  openEditDialog: (flashcard: FlashcardListItemViewModel) => void;
  closeEditDialog: () => void;

  // Dialog usuwania
  isDeleteDialogOpen: boolean;
  flashcardToDelete: FlashcardListItemViewModel | null;
  openDeleteDialog: (flashcard: FlashcardListItemViewModel) => void;
  closeDeleteDialog: () => void;

  // Stan operacji
  isSubmitting: boolean;
  setIsSubmitting: (value: boolean) => void;
  isDeleting: boolean;
  setIsDeleting: (value: boolean) => void;
}

export interface UseInfiniteScrollOptions {
  hasMore: boolean;
  isLoading: boolean;
  onLoadMore: () => void;
  threshold?: number;
  rootMargin?: string;
}

export interface UseInfiniteScrollReturn {
  triggerRef: React.RefObject<HTMLDivElement>;
}
