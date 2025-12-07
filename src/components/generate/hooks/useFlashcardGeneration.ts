import { useState, useCallback, useMemo, useEffect } from "react";
import type {
  CreateGenerationCommand,
  CreateGenerationResponseDto,
  CreateFlashcardsCommand,
  CreateFlashcardsResponseDto,
  FlashcardDraftCommand,
} from "@/types";
import type {
  FlashcardProposalViewModel,
  GenerationViewState,
  SourceTextValidationResult,
} from "../types";
import { VALIDATION_LIMITS } from "../types";

const LOCAL_STORAGE_KEY = "flashcard-generator-draft";

/**
 * Hook zarządzający całym flow generowania fiszek
 */
export function useFlashcardGeneration() {
  // Stan tekstu źródłowego
  const [sourceText, setSourceTextState] = useState("");

  // Stan widoku
  const [viewState, setViewState] = useState<GenerationViewState>({
    status: "idle",
  });

  // Stan propozycji
  const [proposals, setProposals] = useState<FlashcardProposalViewModel[]>([]);
  const [generationId, setGenerationId] = useState<string | null>(null);

  // Stan błędów
  const [error, setError] = useState<string | null>(null);

  // Ładowanie draftu z localStorage przy inicjalizacji
  useEffect(() => {
    try {
      const savedDraft = localStorage.getItem(LOCAL_STORAGE_KEY);
      if (savedDraft) {
        setSourceTextState(savedDraft);
      }
    } catch {
      // Ignoruj błędy localStorage (np. w trybie prywatnym)
    }
  }, []);

  // Zapis do localStorage z debounce
  const setSourceText = useCallback((text: string) => {
    setSourceTextState(text);
    try {
      localStorage.setItem(LOCAL_STORAGE_KEY, text);
    } catch {
      // Ignoruj błędy localStorage
    }
  }, []);

  // Walidacja tekstu źródłowego
  const sourceTextValidation: SourceTextValidationResult = useMemo(() => {
    const characterCount = sourceText.length;
    const isValid =
      characterCount >= VALIDATION_LIMITS.SOURCE_TEXT_MIN &&
      characterCount <= VALIDATION_LIMITS.SOURCE_TEXT_MAX;

    let error: string | null = null;
    if (characterCount > 0 && characterCount < VALIDATION_LIMITS.SOURCE_TEXT_MIN) {
      error = `Tekst musi mieć minimum ${VALIDATION_LIMITS.SOURCE_TEXT_MIN} znaków`;
    } else if (characterCount > VALIDATION_LIMITS.SOURCE_TEXT_MAX) {
      error = `Tekst może mieć maksymalnie ${VALIDATION_LIMITS.SOURCE_TEXT_MAX} znaków`;
    }

    return { isValid, error, characterCount };
  }, [sourceText]);

  // Generowanie fiszek
  const generateFlashcards = useCallback(async () => {
    if (!sourceTextValidation.isValid) return;

    setViewState({ status: "generating" });
    setError(null);

    try {
      const command: CreateGenerationCommand = {
        source_text: sourceText,
      };

      const response = await fetch("/api/generations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(command),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(
          errorData.message || `Błąd serwera (${response.status})`
        );
      }

      const data: CreateGenerationResponseDto = await response.json();

      // Transformuj propozycje z API na ViewModel
      const proposalViewModels: FlashcardProposalViewModel[] =
        data.flashcards_proposals.map((proposal) => ({
          id: crypto.randomUUID(),
          front: proposal.front,
          back: proposal.back,
          originalFront: proposal.front,
          originalBack: proposal.back,
          isAccepted: true, // Domyślnie zaakceptowane
          isRejected: false,
          isEditing: false,
          validationErrors: {},
        }));

      setProposals(proposalViewModels);
      setGenerationId(data.generation_id);
      setViewState({ status: "review", generationId: data.generation_id });
    } catch (err) {
      const message =
        err instanceof Error
          ? err.message
          : "Wystąpił nieoczekiwany błąd podczas generowania";
      setError(message);
      setViewState({ status: "error", message });
    }
  }, [sourceText, sourceTextValidation.isValid]);

  // Aktualizacja propozycji
  const updateProposal = useCallback(
    (id: string, updates: Partial<FlashcardProposalViewModel>) => {
      setProposals((prev) =>
        prev.map((p) => {
          if (p.id !== id) return p;

          const updated = { ...p, ...updates };

          // Walidacja przy aktualizacji front/back
          if ("front" in updates || "back" in updates) {
            const validationErrors: { front?: string; back?: string } = {};

            const front = updates.front ?? p.front;
            const back = updates.back ?? p.back;

            if (!front.trim()) {
              validationErrors.front = "Pole wymagane";
            } else if (front.length > VALIDATION_LIMITS.FRONT_MAX) {
              validationErrors.front = `Maksymalnie ${VALIDATION_LIMITS.FRONT_MAX} znaków`;
            }

            if (!back.trim()) {
              validationErrors.back = "Pole wymagane";
            } else if (back.length > VALIDATION_LIMITS.BACK_MAX) {
              validationErrors.back = `Maksymalnie ${VALIDATION_LIMITS.BACK_MAX} znaków`;
            }

            updated.validationErrors = validationErrors;
          }

          return updated;
        })
      );
    },
    []
  );

  // Akceptacja propozycji
  const acceptProposal = useCallback((id: string) => {
    setProposals((prev) =>
      prev.map((p) =>
        p.id === id ? { ...p, isAccepted: true, isRejected: false } : p
      )
    );
  }, []);

  // Odrzucenie propozycji
  const rejectProposal = useCallback((id: string) => {
    setProposals((prev) =>
      prev.map((p) =>
        p.id === id
          ? { ...p, isRejected: true, isAccepted: false, isEditing: false }
          : p
      )
    );
  }, []);

  // Odrzucenie wszystkich propozycji
  const rejectAllProposals = useCallback(() => {
    setProposals([]);
    setGenerationId(null);
    setViewState({ status: "idle" });
  }, []);

  // Oblicz liczbę zaakceptowanych
  const acceptedCount = useMemo(() => {
    return proposals.filter((p) => p.isAccepted && !p.isRejected).length;
  }, [proposals]);

  // Sprawdź czy są błędy walidacji w zaakceptowanych
  const hasValidationErrors = useMemo(() => {
    return proposals.some(
      (p) =>
        p.isAccepted &&
        !p.isRejected &&
        (p.validationErrors.front || p.validationErrors.back)
    );
  }, [proposals]);

  // Zapisywanie fiszek
  const saveAcceptedFlashcards = useCallback(async () => {
    if (acceptedCount === 0 || hasValidationErrors || !generationId) return;

    setViewState({ status: "saving" });
    setError(null);

    try {
      const acceptedProposals = proposals.filter(
        (p) => p.isAccepted && !p.isRejected
      );

      const flashcards: FlashcardDraftCommand[] = acceptedProposals.map((p) => {
        const isEdited =
          p.front !== p.originalFront || p.back !== p.originalBack;

        return {
          front: p.front,
          back: p.back,
          source: isEdited ? "ai-edited" : "ai-full",
          generation_id: generationId,
        };
      });

      const command: CreateFlashcardsCommand = { flashcards };

      const response = await fetch("/api/flashcards", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(command),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(
          errorData.message || `Błąd podczas zapisywania (${response.status})`
        );
      }

      const data: CreateFlashcardsResponseDto = await response.json();

      // Wyczyść localStorage po sukcesie
      try {
        localStorage.removeItem(LOCAL_STORAGE_KEY);
      } catch {
        // Ignoruj błędy localStorage
      }

      setViewState({ status: "success", savedCount: data.flashcards.length });
      setProposals([]);
      setGenerationId(null);
      setSourceTextState("");
    } catch (err) {
      const message =
        err instanceof Error
          ? err.message
          : "Wystąpił błąd podczas zapisywania fiszek";
      setError(message);
      setViewState({ status: "error", message });
    }
  }, [acceptedCount, hasValidationErrors, generationId, proposals]);

  // Czyszczenie błędu
  const clearError = useCallback(() => {
    setError(null);
    if (viewState.status === "error") {
      setViewState({ status: proposals.length > 0 ? "review" : "idle", generationId: generationId || "" });
    }
  }, [viewState.status, proposals.length, generationId]);

  // Reset do stanu początkowego
  const resetToInitial = useCallback(() => {
    setViewState({ status: "idle" });
    setProposals([]);
    setGenerationId(null);
    setError(null);
  }, []);

  return {
    // Stan tekstu źródłowego
    sourceText,
    setSourceText,
    sourceTextValidation,

    // Stan generowania
    isGenerating: viewState.status === "generating",
    generateFlashcards,

    // Stan propozycji
    proposals,
    generationId,
    updateProposal,
    acceptProposal,
    rejectProposal,
    rejectAllProposals,

    // Statystyki
    acceptedCount,
    hasValidationErrors,

    // Zapisywanie
    isSaving: viewState.status === "saving",
    saveAcceptedFlashcards,

    // Błędy
    error,
    clearError,

    // Stan widoku
    viewState,

    // Reset
    resetToInitial,
  };
}
