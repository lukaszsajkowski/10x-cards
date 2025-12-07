import { useState, useCallback, useMemo, useId, useEffect } from "react";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { ProposalActions } from "./ProposalActions";
import { VALIDATION_LIMITS, type FlashcardProposalCardProps } from "./types";
import { cn } from "@/lib/utils";

/**
 * Pojedyncza karta propozycji fiszki z możliwością podglądu, edycji, akceptacji i odrzucenia.
 */
export function FlashcardProposalCard({ proposal, onUpdate, onAccept, onReject }: FlashcardProposalCardProps) {
  const frontId = useId();
  const backId = useId();
  const frontErrorId = useId();
  const backErrorId = useId();

  const [localFront, setLocalFront] = useState(proposal.front);
  const [localBack, setLocalBack] = useState(proposal.back);

  // Synchronizuj lokalny stan gdy proposal się zmienia (ale nie podczas aktywnej edycji)
  useEffect(() => {
    if (!proposal.isEditing) {
      setLocalFront(proposal.front);
      setLocalBack(proposal.back);
    }
  }, [proposal.front, proposal.back, proposal.isEditing]);

  // Sprawdź czy propozycja została edytowana
  const isEdited = useMemo(() => {
    return proposal.front !== proposal.originalFront || proposal.back !== proposal.originalBack;
  }, [proposal.front, proposal.back, proposal.originalFront, proposal.originalBack]);

  // Walidacja lokalna podczas edycji
  const localValidationErrors = useMemo(() => {
    const errors: { front?: string; back?: string } = {};

    if (!localFront.trim()) {
      errors.front = "Pole wymagane";
    } else if (localFront.length > VALIDATION_LIMITS.FRONT_MAX) {
      errors.front = `Maksymalnie ${VALIDATION_LIMITS.FRONT_MAX} znaków`;
    }

    if (!localBack.trim()) {
      errors.back = "Pole wymagane";
    } else if (localBack.length > VALIDATION_LIMITS.BACK_MAX) {
      errors.back = `Maksymalnie ${VALIDATION_LIMITS.BACK_MAX} znaków`;
    }

    return errors;
  }, [localFront, localBack]);

  const hasValidationErrors = useMemo(() => {
    return !!(localValidationErrors.front || localValidationErrors.back);
  }, [localValidationErrors]);

  // Obsługa przełączania trybu edycji
  const handleEditToggle = useCallback(() => {
    if (proposal.isEditing) {
      // Zapisz zmiany jeśli brak błędów
      if (!hasValidationErrors) {
        onUpdate({
          front: localFront,
          back: localBack,
          isEditing: false,
          validationErrors: {},
        });
      }
    } else {
      // Wejdź w tryb edycji
      setLocalFront(proposal.front);
      setLocalBack(proposal.back);
      onUpdate({ isEditing: true });
    }
  }, [proposal.isEditing, proposal.front, proposal.back, hasValidationErrors, localFront, localBack, onUpdate]);

  // Obsługa akceptacji
  const handleAccept = useCallback(() => {
    onAccept();
  }, [onAccept]);

  // Obsługa odrzucenia
  const handleReject = useCallback(() => {
    onReject();
  }, [onReject]);

  // Obsługa cofnięcia odrzucenia
  const handleUndoReject = useCallback(() => {
    onUpdate({ isRejected: false, isAccepted: true });
  }, [onUpdate]);

  // Status badge
  const statusBadge = useMemo(() => {
    if (proposal.isRejected) {
      return <Badge variant="destructive">Odrzucona</Badge>;
    }
    if (isEdited) {
      return <Badge variant="secondary">Edytowana</Badge>;
    }
    if (proposal.isAccepted) {
      return <Badge variant="default">Zaakceptowana</Badge>;
    }
    return null;
  }, [proposal.isRejected, proposal.isAccepted, isEdited]);

  return (
    <Card className={cn("transition-opacity duration-200", proposal.isRejected && "opacity-50")}>
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <span className="text-sm text-muted-foreground">Propozycja fiszki</span>
          {statusBadge}
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {proposal.isEditing ? (
          // Tryb edycji
          <>
            <div className="space-y-2">
              <label htmlFor={frontId} className="text-sm font-medium">
                Przód (pytanie)
              </label>
              <Textarea
                id={frontId}
                value={localFront}
                onChange={(e) => setLocalFront(e.target.value)}
                className={cn(
                  "min-h-[60px] resize-none",
                  localValidationErrors.front && "border-destructive focus-visible:ring-destructive"
                )}
                aria-invalid={!!localValidationErrors.front}
                aria-describedby={localValidationErrors.front ? frontErrorId : undefined}
              />
              <div className="flex justify-between text-xs">
                {localValidationErrors.front ? (
                  <span id={frontErrorId} className="text-destructive" role="alert">
                    {localValidationErrors.front}
                  </span>
                ) : (
                  <span />
                )}
                <span className="text-muted-foreground">
                  {localFront.length}/{VALIDATION_LIMITS.FRONT_MAX}
                </span>
              </div>
            </div>

            <div className="space-y-2">
              <label htmlFor={backId} className="text-sm font-medium">
                Tył (odpowiedź)
              </label>
              <Textarea
                id={backId}
                value={localBack}
                onChange={(e) => setLocalBack(e.target.value)}
                className={cn(
                  "min-h-[100px] resize-none",
                  localValidationErrors.back && "border-destructive focus-visible:ring-destructive"
                )}
                aria-invalid={!!localValidationErrors.back}
                aria-describedby={localValidationErrors.back ? backErrorId : undefined}
              />
              <div className="flex justify-between text-xs">
                {localValidationErrors.back ? (
                  <span id={backErrorId} className="text-destructive" role="alert">
                    {localValidationErrors.back}
                  </span>
                ) : (
                  <span />
                )}
                <span className="text-muted-foreground">
                  {localBack.length}/{VALIDATION_LIMITS.BACK_MAX}
                </span>
              </div>
            </div>
          </>
        ) : (
          // Tryb podglądu
          <>
            <div className="space-y-1">
              <p className="text-sm font-medium text-muted-foreground">Przód (pytanie)</p>
              <p className="text-sm">{proposal.front}</p>
            </div>
            <div className="space-y-1">
              <p className="text-sm font-medium text-muted-foreground">Tył (odpowiedź)</p>
              <p className="text-sm whitespace-pre-wrap">{proposal.back}</p>
            </div>
          </>
        )}

        <ProposalActions
          isEditing={proposal.isEditing}
          isAccepted={proposal.isAccepted}
          isRejected={proposal.isRejected}
          onEditToggle={handleEditToggle}
          onAccept={handleAccept}
          onReject={handleReject}
          onUndoReject={handleUndoReject}
          hasValidationErrors={hasValidationErrors}
        />
      </CardContent>
    </Card>
  );
}
