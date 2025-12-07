import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { FlashcardForm } from "./FlashcardForm";
import type { EditFlashcardDialogProps, FlashcardFormData } from "./types";

/**
 * Modal dialog do edycji istniejącej fiszki.
 * Zawiera formularz z wypełnionymi danymi fiszki.
 */
export function EditFlashcardDialog({
  isOpen,
  onOpenChange,
  flashcard,
  onSubmit,
  isSubmitting,
}: EditFlashcardDialogProps) {
  const handleSubmit = async (data: FlashcardFormData) => {
    await onSubmit(data);
  };

  const handleCancel = () => {
    onOpenChange(false);
  };

  // Nie renderuj formularza jeśli nie ma fiszki
  if (!flashcard) {
    return null;
  }

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Edytuj fiszkę</DialogTitle>
          <DialogDescription>Wprowadź zmiany w treści fiszki i zapisz je.</DialogDescription>
        </DialogHeader>

        <FlashcardForm
          key={flashcard.id}
          initialData={{
            front: flashcard.front,
            back: flashcard.back,
          }}
          onSubmit={handleSubmit}
          onCancel={handleCancel}
          isSubmitting={isSubmitting}
          submitLabel="Zapisz zmiany"
        />
      </DialogContent>
    </Dialog>
  );
}
