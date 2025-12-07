import { useCallback } from "react";
import { toast } from "sonner";
import { FlashcardsHeader } from "./FlashcardsHeader";
import { FlashcardList } from "./FlashcardList";
import { EmptyState } from "./EmptyState";
import { LoadingState } from "./LoadingState";
import { CreateFlashcardDialog } from "./CreateFlashcardDialog";
import { EditFlashcardDialog } from "./EditFlashcardDialog";
import { DeleteConfirmDialog } from "./DeleteConfirmDialog";
import { useFlashcards } from "./hooks/useFlashcards";
import { useFlashcardDialogs } from "./hooks/useFlashcardDialogs";
import { Toaster } from "@/components/ui/sonner";
import { Button } from "@/components/ui/button";
import { AlertCircle, RefreshCw } from "lucide-react";
import type { FlashcardFormData, FlashcardListItemViewModel } from "./types";

/**
 * Główny komponent kontenerowy widoku "Moje Fiszki".
 * Zarządza stanem całej listy fiszek, obsługuje operacje CRUD
 * oraz koordynuje wyświetlanie modali i dialogów.
 */
export function FlashcardsView() {
  // Hook zarządzający listą fiszek
  const {
    flashcards,
    isLoading,
    isLoadingMore,
    error,
    hasMore,
    fetchMoreFlashcards,
    refreshFlashcards,
    createFlashcard,
    updateFlashcard,
    deleteFlashcard,
    clearError,
  } = useFlashcards();

  // Hook zarządzający dialogami
  const {
    isCreateDialogOpen,
    openCreateDialog,
    closeCreateDialog,
    isEditDialogOpen,
    flashcardToEdit,
    openEditDialog,
    closeEditDialog,
    isDeleteDialogOpen,
    flashcardToDelete,
    openDeleteDialog,
    closeDeleteDialog,
    isSubmitting,
    setIsSubmitting,
    isDeleting,
    setIsDeleting,
  } = useFlashcardDialogs();

  // Handler tworzenia fiszki
  const handleCreateSubmit = useCallback(
    async (data: FlashcardFormData) => {
      setIsSubmitting(true);
      try {
        await createFlashcard(data);
        closeCreateDialog();
        toast.success("Fiszka została utworzona");
      } catch (err) {
        const message = err instanceof Error ? err.message : "Nie udało się utworzyć fiszki";
        toast.error(message);
      } finally {
        setIsSubmitting(false);
      }
    },
    [createFlashcard, closeCreateDialog, setIsSubmitting]
  );

  // Handler edycji fiszki
  const handleEditSubmit = useCallback(
    async (data: FlashcardFormData) => {
      if (!flashcardToEdit) return;

      setIsSubmitting(true);
      try {
        await updateFlashcard(flashcardToEdit.id, data);
        closeEditDialog();
        toast.success("Zmiany zostały zapisane");
      } catch (err) {
        const message = err instanceof Error ? err.message : "Nie udało się zapisać zmian";
        toast.error(message);
      } finally {
        setIsSubmitting(false);
      }
    },
    [flashcardToEdit, updateFlashcard, closeEditDialog, setIsSubmitting]
  );

  // Handler usuwania fiszki
  const handleDeleteConfirm = useCallback(async () => {
    if (!flashcardToDelete) return;

    setIsDeleting(true);
    closeDeleteDialog();

    try {
      await deleteFlashcard(flashcardToDelete.id);
      toast.success("Fiszka została usunięta");
    } catch (err) {
      const message = err instanceof Error ? err.message : "Nie udało się usunąć fiszki";
      toast.error(message);
    } finally {
      setIsDeleting(false);
    }
  }, [flashcardToDelete, deleteFlashcard, closeDeleteDialog, setIsDeleting]);

  // Handler edycji z listy
  const handleEdit = useCallback(
    (flashcard: FlashcardListItemViewModel) => {
      openEditDialog(flashcard);
    },
    [openEditDialog]
  );

  // Handler usuwania z listy
  const handleDelete = useCallback(
    (flashcard: FlashcardListItemViewModel) => {
      openDeleteDialog(flashcard);
    },
    [openDeleteDialog]
  );

  // Stan ładowania
  if (isLoading) {
    return (
      <>
        <FlashcardsHeader onCreateClick={openCreateDialog} />
        <LoadingState count={5} />
      </>
    );
  }

  // Stan błędu
  if (error && flashcards.length === 0) {
    return (
      <>
        <FlashcardsHeader onCreateClick={openCreateDialog} />
        <div className="flex flex-col items-center justify-center py-16 px-4 text-center">
          <div className="rounded-full bg-destructive/10 p-4 mb-6">
            <AlertCircle className="size-12 text-destructive" />
          </div>
          <h2 className="text-xl font-semibold mb-2">Nie udało się załadować fiszek</h2>
          <p className="text-muted-foreground mb-8 max-w-md">{error}</p>
          <Button
            onClick={() => {
              clearError();
              refreshFlashcards();
            }}
          >
            <RefreshCw className="size-4 mr-2" />
            Spróbuj ponownie
          </Button>
        </div>
      </>
    );
  }

  // Stan pustej listy
  if (flashcards.length === 0) {
    return (
      <>
        <FlashcardsHeader onCreateClick={openCreateDialog} />
        <EmptyState onCreateClick={openCreateDialog} />
        <CreateFlashcardDialog
          isOpen={isCreateDialogOpen}
          onOpenChange={(open) => !open && closeCreateDialog()}
          onSubmit={handleCreateSubmit}
          isSubmitting={isSubmitting}
        />
        <Toaster position="bottom-right" />
      </>
    );
  }

  // Stan z listą fiszek
  return (
    <>
      <FlashcardsHeader onCreateClick={openCreateDialog} />

      <FlashcardList
        flashcards={flashcards}
        onEdit={handleEdit}
        onDelete={handleDelete}
        onLoadMore={fetchMoreFlashcards}
        hasMore={hasMore}
        isLoadingMore={isLoadingMore}
      />

      {/* Dialogi */}
      <CreateFlashcardDialog
        isOpen={isCreateDialogOpen}
        onOpenChange={(open) => !open && closeCreateDialog()}
        onSubmit={handleCreateSubmit}
        isSubmitting={isSubmitting}
      />

      <EditFlashcardDialog
        isOpen={isEditDialogOpen}
        onOpenChange={(open) => !open && closeEditDialog()}
        flashcard={flashcardToEdit}
        onSubmit={handleEditSubmit}
        isSubmitting={isSubmitting}
      />

      <DeleteConfirmDialog
        isOpen={isDeleteDialogOpen}
        onOpenChange={(open) => !open && closeDeleteDialog()}
        flashcard={flashcardToDelete}
        onConfirm={handleDeleteConfirm}
        isDeleting={isDeleting}
      />

      {/* Toast notifications */}
      <Toaster position="bottom-right" />
    </>
  );
}
