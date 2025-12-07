import { useMemo } from "react";
import { SourceTextPreview } from "./SourceTextPreview";
import { ReviewBoard } from "./ReviewBoard";
import { BulkActionsBar } from "./BulkActionsBar";
import type { ReviewSectionProps } from "./types";

/**
 * Kontener dla sekcji recenzji propozycji fiszek.
 * Zawiera podgląd tekstu źródłowego, listę propozycji oraz pasek akcji zbiorczych.
 */
export function ReviewSection({
  sourceText,
  proposals,
  onProposalUpdate,
  onProposalAccept,
  onProposalReject,
  onSaveAccepted,
  onRejectAll,
  isSaving,
  acceptedCount,
}: ReviewSectionProps) {
  // Sprawdź czy którakolwiek zaakceptowana propozycja ma błędy walidacji
  const hasValidationErrors = useMemo(() => {
    return proposals.some(
      (p) =>
        p.isAccepted &&
        !p.isRejected &&
        (p.validationErrors.front || p.validationErrors.back)
    );
  }, [proposals]);

  return (
    <section aria-label="Recenzja propozycji fiszek" className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-semibold">
          Propozycje fiszek ({proposals.length})
        </h2>
      </div>

      <SourceTextPreview text={sourceText} />

      <ReviewBoard
        proposals={proposals}
        onProposalUpdate={onProposalUpdate}
        onProposalAccept={onProposalAccept}
        onProposalReject={onProposalReject}
      />

      <BulkActionsBar
        acceptedCount={acceptedCount}
        onSave={onSaveAccepted}
        onRejectAll={onRejectAll}
        isSaving={isSaving}
        hasValidationErrors={hasValidationErrors}
      />
    </section>
  );
}
