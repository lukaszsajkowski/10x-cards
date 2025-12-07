import { Loader2 } from "lucide-react";
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogCancel,
  AlertDialogAction,
} from "@/components/ui/alert-dialog";
import type { DeleteConfirmDialogProps } from "./types";

/**
 * Dialog potwierdzenia usunięcia fiszki.
 * Wyświetla ostrzeżenie i wymaga jawnego potwierdzenia operacji.
 */
export function DeleteConfirmDialog({
  isOpen,
  onOpenChange,
  flashcard,
  onConfirm,
  isDeleting,
}: DeleteConfirmDialogProps) {
  const handleConfirm = async () => {
    await onConfirm();
  };

  return (
    <AlertDialog open={isOpen} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Usuń fiszkę</AlertDialogTitle>
          <AlertDialogDescription>
            Czy na pewno chcesz usunąć tę fiszkę? Tej operacji nie można cofnąć.
          </AlertDialogDescription>
        </AlertDialogHeader>

        {/* Podgląd treści fiszki */}
        {flashcard && (
          <div className="bg-muted rounded-lg p-4 text-sm space-y-2">
            <div>
              <span className="font-medium text-muted-foreground">Przód: </span>
              <span className="line-clamp-2">{flashcard.front}</span>
            </div>
            <div>
              <span className="font-medium text-muted-foreground">Tył: </span>
              <span className="line-clamp-2">{flashcard.back}</span>
            </div>
          </div>
        )}

        <AlertDialogFooter>
          <AlertDialogCancel disabled={isDeleting}>Anuluj</AlertDialogCancel>
          <AlertDialogAction
            onClick={handleConfirm}
            disabled={isDeleting}
            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
          >
            {isDeleting && <Loader2 className="mr-2 size-4 animate-spin" />}
            Usuń
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
