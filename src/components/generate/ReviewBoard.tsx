import { useCallback } from "react";
import { FlashcardProposalCard } from "./FlashcardProposalCard";
import type { ReviewBoardProps, FlashcardProposalViewModel } from "./types";

/**
 * Lista propozycji fiszek w formie edytowalnych kart.
 * Zarządza propagacją zmian do rodzica.
 */
export function ReviewBoard({
  proposals,
  onProposalUpdate,
  onProposalAccept,
  onProposalReject,
}: ReviewBoardProps) {
  const handleUpdate = useCallback(
    (id: string) => (updates: Partial<FlashcardProposalViewModel>) => {
      onProposalUpdate(id, updates);
    },
    [onProposalUpdate]
  );

  const handleAccept = useCallback(
    (id: string) => () => {
      onProposalAccept(id);
    },
    [onProposalAccept]
  );

  const handleReject = useCallback(
    (id: string) => () => {
      onProposalReject(id);
    },
    [onProposalReject]
  );

  // Pusta lista - wszystkie odrzucone lub brak propozycji
  const visibleProposals = proposals;
  const allRejected = proposals.length > 0 && proposals.every((p) => p.isRejected);

  if (proposals.length === 0) {
    return (
      <div className="text-center py-12">
        <p className="text-muted-foreground">
          Brak propozycji fiszek do wyświetlenia.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {allRejected && (
        <div className="text-center py-4 px-4 bg-muted/50 rounded-lg">
          <p className="text-sm text-muted-foreground">
            Wszystkie propozycje zostały odrzucone. Możesz je przywrócić lub wygenerować nowe.
          </p>
        </div>
      )}

      <div className="grid gap-4" role="list" aria-label="Lista propozycji fiszek">
        {visibleProposals.map((proposal) => (
          <div key={proposal.id} role="listitem">
            <FlashcardProposalCard
              proposal={proposal}
              onUpdate={handleUpdate(proposal.id)}
              onAccept={handleAccept(proposal.id)}
              onReject={handleReject(proposal.id)}
            />
          </div>
        ))}
      </div>
    </div>
  );
}
