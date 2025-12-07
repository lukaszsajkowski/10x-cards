import { memo } from "react";
import { Save, Trash2, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { BulkActionsBarProps } from "./types";

/**
 * Sticky footer z przyciskami akcji zbiorczych - zapisanie zaakceptowanych fiszek oraz odrzucenie wszystkich.
 */
export const BulkActionsBar = memo(function BulkActionsBar({
  acceptedCount,
  onSave,
  onRejectAll,
  isSaving,
  hasValidationErrors,
}: BulkActionsBarProps) {
  const canSave = acceptedCount > 0 && !hasValidationErrors && !isSaving;

  return (
    <div className="sticky bottom-0 z-10 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 border-t">
      <div className="container mx-auto px-4 py-4 max-w-4xl">
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="text-sm text-muted-foreground">
            {acceptedCount === 0 ? (
              <span>Brak zaakceptowanych fiszek do zapisania</span>
            ) : hasValidationErrors ? (
              <span className="text-destructive">
                Popraw błędy walidacji przed zapisaniem
              </span>
            ) : (
              <span>
                {acceptedCount}{" "}
                {acceptedCount === 1
                  ? "fiszka gotowa"
                  : acceptedCount < 5
                    ? "fiszki gotowe"
                    : "fiszek gotowych"}{" "}
                do zapisania
              </span>
            )}
          </div>

          <div className="flex gap-3">
            <Button
              variant="outline"
              onClick={onRejectAll}
              disabled={isSaving}
            >
              <Trash2 className="mr-2 h-4 w-4" />
              Odrzuć wszystkie
            </Button>
            <Button onClick={onSave} disabled={!canSave}>
              {isSaving ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Zapisywanie...
                </>
              ) : (
                <>
                  <Save className="mr-2 h-4 w-4" />
                  Zapisz {acceptedCount > 0 ? `(${acceptedCount})` : ""}
                </>
              )}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
});
