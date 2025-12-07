import { useEffect, useCallback } from "react";
import { useFlashcardGeneration } from "./hooks/useFlashcardGeneration";
import { SourceTextForm } from "./SourceTextForm";
import { GenerationLoader } from "./GenerationLoader";
import { ReviewSection } from "./ReviewSection";
import { ErrorAlert } from "./ErrorAlert";
import { CheckCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";

/**
 * Główny komponent kontenerowy widoku generatora.
 * Zarządza stanem całego flow generowania i akceptacji fiszek.
 */
export function GenerateView() {
  const {
    // Stan tekstu źródłowego
    sourceText,
    setSourceText,
    sourceTextValidation,

    // Stan generowania
    isGenerating,
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

    // Zapisywanie
    isSaving,
    saveAcceptedFlashcards,

    // Błędy
    error,
    clearError,

    // Stan widoku
    viewState,

    // Reset
    resetToInitial,
  } = useFlashcardGeneration();

  // Ochrona przed utratą danych (beforeunload)
  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      // Pokaż ostrzeżenie tylko gdy są niezapisane propozycje
      if (proposals.length > 0 && viewState.status === "review") {
        e.preventDefault();
        e.returnValue = "";
        return "";
      }
    };

    window.addEventListener("beforeunload", handleBeforeUnload);
    return () => window.removeEventListener("beforeunload", handleBeforeUnload);
  }, [proposals.length, viewState.status]);

  // Handler dla nowej generacji po sukcesie
  const handleNewGeneration = useCallback(() => {
    resetToInitial();
  }, [resetToInitial]);

  // Renderowanie sukcesu
  if (viewState.status === "success") {
    return (
      <div className="space-y-6">
        <Alert className="border-green-500 bg-green-50 dark:bg-green-950/20">
          <CheckCircle className="h-4 w-4 text-green-600" />
          <AlertTitle className="text-green-800 dark:text-green-200">
            Fiszki zapisane pomyślnie!
          </AlertTitle>
          <AlertDescription className="text-green-700 dark:text-green-300">
            Zapisano {viewState.savedCount}{" "}
            {viewState.savedCount === 1
              ? "fiszkę"
              : viewState.savedCount < 5
                ? "fiszki"
                : "fiszek"}{" "}
            do Twojej kolekcji.
          </AlertDescription>
        </Alert>
        <div className="flex justify-center">
          <Button onClick={handleNewGeneration}>
            Wygeneruj kolejne fiszki
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Alert błędu */}
      {error && <ErrorAlert message={error} onDismiss={clearError} />}

      {/* Formularz wprowadzania tekstu (widoczny w trybie idle lub error) */}
      {(viewState.status === "idle" || viewState.status === "error") && (
        <SourceTextForm
          sourceText={sourceText}
          onSourceTextChange={setSourceText}
          onGenerate={generateFlashcards}
          isGenerating={isGenerating}
          validationError={sourceTextValidation.error}
        />
      )}

      {/* Loader podczas generowania */}
      {viewState.status === "generating" && <GenerationLoader skeletonCount={4} />}

      {/* Sekcja recenzji propozycji */}
      {(viewState.status === "review" || viewState.status === "saving") &&
        generationId && (
          <ReviewSection
            sourceText={sourceText}
            proposals={proposals}
            generationId={generationId}
            onProposalUpdate={updateProposal}
            onProposalAccept={acceptProposal}
            onProposalReject={rejectProposal}
            onSaveAccepted={saveAcceptedFlashcards}
            onRejectAll={rejectAllProposals}
            isSaving={isSaving}
            acceptedCount={acceptedCount}
          />
        )}
    </div>
  );
}
