/**
 * Types for the flashcard generation view components
 */

/**
 * Stałe walidacyjne
 */
export const VALIDATION_LIMITS = {
  SOURCE_TEXT_MIN: 1000,
  SOURCE_TEXT_MAX: 10000,
  FRONT_MAX: 200,
  BACK_MAX: 500,
} as const;

/**
 * Stan pojedynczej propozycji fiszki rozszerzony o metadane UI
 */
export interface FlashcardProposalViewModel {
  /** Tymczasowy identyfikator frontendowy (np. crypto.randomUUID()) */
  id: string;
  /** Treść przodu fiszki */
  front: string;
  /** Treść tyłu fiszki */
  back: string;
  /** Oryginalna treść przodu (do wykrywania edycji) */
  originalFront: string;
  /** Oryginalna treść tyłu (do wykrywania edycji) */
  originalBack: string;
  /** Czy propozycja została zaakceptowana */
  isAccepted: boolean;
  /** Czy propozycja została odrzucona */
  isRejected: boolean;
  /** Czy propozycja jest w trybie edycji */
  isEditing: boolean;
  /** Błędy walidacji dla poszczególnych pól */
  validationErrors: {
    front?: string;
    back?: string;
  };
}

/**
 * Możliwe stany widoku generatora
 */
export type GenerationViewState =
  | { status: "idle" }
  | { status: "generating" }
  | { status: "review"; generationId: string }
  | { status: "saving" }
  | { status: "success"; savedCount: number }
  | { status: "error"; message: string };

/**
 * Wynik walidacji tekstu źródłowego
 */
export interface SourceTextValidationResult {
  isValid: boolean;
  error: string | null;
  characterCount: number;
}

/**
 * Wynik walidacji propozycji fiszki
 */
export interface ProposalValidationResult {
  isValid: boolean;
  errors: {
    front?: string;
    back?: string;
  };
}

// =====================================
// Props dla komponentów
// =====================================

export interface SourceTextInputProps {
  value: string;
  onChange: (value: string) => void;
  disabled: boolean;
  hasError: boolean;
  placeholder?: string;
}

export interface CharacterCounterProps {
  current: number;
  min: number;
  max: number;
}

export interface GenerateButtonProps {
  isLoading: boolean;
  disabled: boolean;
}

export interface SourceTextFormProps {
  sourceText: string;
  onSourceTextChange: (text: string) => void;
  onGenerate: () => void;
  isGenerating: boolean;
  validationError: string | null;
}

export interface GenerationLoaderProps {
  skeletonCount?: number;
}

export interface ReviewSectionProps {
  sourceText: string;
  proposals: FlashcardProposalViewModel[];
  generationId: string;
  onProposalUpdate: (id: string, updates: Partial<FlashcardProposalViewModel>) => void;
  onProposalAccept: (id: string) => void;
  onProposalReject: (id: string) => void;
  onSaveAccepted: () => void;
  onRejectAll: () => void;
  isSaving: boolean;
  acceptedCount: number;
}

export interface SourceTextPreviewProps {
  text: string;
  defaultExpanded?: boolean;
}

export interface ReviewBoardProps {
  proposals: FlashcardProposalViewModel[];
  onProposalUpdate: (id: string, updates: Partial<FlashcardProposalViewModel>) => void;
  onProposalAccept: (id: string) => void;
  onProposalReject: (id: string) => void;
}

export interface FlashcardProposalCardProps {
  proposal: FlashcardProposalViewModel;
  onUpdate: (updates: Partial<FlashcardProposalViewModel>) => void;
  onAccept: () => void;
  onReject: () => void;
}

export interface ProposalActionsProps {
  isEditing: boolean;
  isAccepted: boolean;
  isRejected: boolean;
  onEditToggle: () => void;
  onAccept: () => void;
  onReject: () => void;
  onUndoReject: () => void;
  hasValidationErrors: boolean;
}

export interface BulkActionsBarProps {
  acceptedCount: number;
  onSave: () => void;
  onRejectAll: () => void;
  isSaving: boolean;
  hasValidationErrors: boolean;
}

export interface ErrorAlertProps {
  message: string;
  onDismiss: () => void;
}
