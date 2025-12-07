import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { FlashcardForm } from "./FlashcardForm";
import type { CreateFlashcardDialogProps, FlashcardFormData } from "./types";

/**
 * Modal dialog do tworzenia nowej fiszki ręcznie.
 * Zawiera formularz z polami przód/tył oraz przyciski akcji.
 */
export function CreateFlashcardDialog({ isOpen, onOpenChange, onSubmit, isSubmitting }: CreateFlashcardDialogProps) {
  const handleSubmit = async (data: FlashcardFormData) => {
    await onSubmit(data);
  };

  const handleCancel = () => {
    onOpenChange(false);
  };

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Dodaj nową fiszkę</DialogTitle>
          <DialogDescription>Utwórz nową fiszkę ręcznie. Wpisz treść przodu i tyłu fiszki.</DialogDescription>
        </DialogHeader>

        <FlashcardForm
          onSubmit={handleSubmit}
          onCancel={handleCancel}
          isSubmitting={isSubmitting}
          submitLabel="Dodaj fiszkę"
        />
      </DialogContent>
    </Dialog>
  );
}
