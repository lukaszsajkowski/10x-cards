import { memo } from "react";
import { Pencil, Check, X, Undo2, Save } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { ProposalActionsProps } from "./types";

/**
 * Zestaw przycisków akcji dla pojedynczej propozycji fiszki.
 */
export const ProposalActions = memo(function ProposalActions({
  isEditing,
  isAccepted,
  isRejected,
  onEditToggle,
  onAccept,
  onReject,
  onUndoReject,
  hasValidationErrors,
}: ProposalActionsProps) {
  // Tryb odrzucony - pokaż tylko przycisk cofnięcia
  if (isRejected) {
    return (
      <div className="flex justify-end gap-2">
        <Button variant="outline" size="sm" onClick={onUndoReject}>
          <Undo2 className="mr-2 h-4 w-4" />
          Przywróć
        </Button>
      </div>
    );
  }

  // Tryb edycji - pokaż przyciski zapisz/anuluj
  if (isEditing) {
    return (
      <div className="flex justify-end gap-2">
        <Button variant="outline" size="sm" onClick={onEditToggle}>
          Anuluj
        </Button>
        <Button
          size="sm"
          onClick={onEditToggle}
          disabled={hasValidationErrors}
        >
          <Save className="mr-2 h-4 w-4" />
          Zapisz
        </Button>
      </div>
    );
  }

  // Tryb normalny - pokaż wszystkie akcje
  return (
    <div className="flex justify-end gap-2">
      <Button variant="outline" size="sm" onClick={onEditToggle}>
        <Pencil className="mr-2 h-4 w-4" />
        Edytuj
      </Button>
      {!isAccepted && (
        <Button variant="secondary" size="sm" onClick={onAccept}>
          <Check className="mr-2 h-4 w-4" />
          Akceptuj
        </Button>
      )}
      <Button variant="destructive" size="sm" onClick={onReject}>
        <X className="mr-2 h-4 w-4" />
        Odrzuć
      </Button>
    </div>
  );
});
