import { useState, useCallback } from "react";
import type { FlashcardListItemViewModel, UseFlashcardDialogsReturn } from "../types";

/**
 * Hook zarządzający stanem dialogów (modali) w widoku "Moje Fiszki"
 */
export function useFlashcardDialogs(): UseFlashcardDialogsReturn {
  // Stan dialogu tworzenia
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);

  // Stan dialogu edycji
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [flashcardToEdit, setFlashcardToEdit] = useState<FlashcardListItemViewModel | null>(null);

  // Stan dialogu usuwania
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [flashcardToDelete, setFlashcardToDelete] = useState<FlashcardListItemViewModel | null>(null);

  // Stan operacji
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  // Dialog tworzenia
  const openCreateDialog = useCallback(() => {
    setIsCreateDialogOpen(true);
  }, []);

  const closeCreateDialog = useCallback(() => {
    setIsCreateDialogOpen(false);
  }, []);

  // Dialog edycji
  const openEditDialog = useCallback((flashcard: FlashcardListItemViewModel) => {
    setFlashcardToEdit(flashcard);
    setIsEditDialogOpen(true);
  }, []);

  const closeEditDialog = useCallback(() => {
    setIsEditDialogOpen(false);
    // Opóźnione czyszczenie dla animacji zamykania
    setTimeout(() => {
      setFlashcardToEdit(null);
    }, 200);
  }, []);

  // Dialog usuwania
  const openDeleteDialog = useCallback((flashcard: FlashcardListItemViewModel) => {
    setFlashcardToDelete(flashcard);
    setIsDeleteDialogOpen(true);
  }, []);

  const closeDeleteDialog = useCallback(() => {
    setIsDeleteDialogOpen(false);
    // Opóźnione czyszczenie dla animacji zamykania
    setTimeout(() => {
      setFlashcardToDelete(null);
    }, 200);
  }, []);

  return {
    // Dialog tworzenia
    isCreateDialogOpen,
    openCreateDialog,
    closeCreateDialog,

    // Dialog edycji
    isEditDialogOpen,
    flashcardToEdit,
    openEditDialog,
    closeEditDialog,

    // Dialog usuwania
    isDeleteDialogOpen,
    flashcardToDelete,
    openDeleteDialog,
    closeDeleteDialog,

    // Stan operacji
    isSubmitting,
    setIsSubmitting,
    isDeleting,
    setIsDeleting,
  };
}
