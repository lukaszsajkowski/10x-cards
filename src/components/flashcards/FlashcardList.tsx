import { useCallback } from "react";
import { FlashcardItem } from "./FlashcardItem";
import { LoadMoreTrigger } from "./LoadMoreTrigger";
import type { FlashcardListProps, FlashcardListItemViewModel } from "./types";

/**
 * Kontener listy fiszek implementujący infinite scroll.
 * Renderuje poszczególne elementy FlashcardItem oraz zarządza
 * automatycznym ładowaniem kolejnych stron przy scrollowaniu.
 */
export function FlashcardList({
  flashcards,
  onEdit,
  onDelete,
  onLoadMore,
  hasMore,
  isLoadingMore,
}: FlashcardListProps) {
  const handleEdit = useCallback(
    (flashcard: FlashcardListItemViewModel) => {
      onEdit(flashcard);
    },
    [onEdit]
  );

  const handleDelete = useCallback(
    (flashcard: FlashcardListItemViewModel) => {
      onDelete(flashcard);
    },
    [onDelete]
  );

  return (
    <div role="list" className="space-y-4">
      {flashcards.map((flashcard) => (
        <FlashcardItem
          key={flashcard.id}
          flashcard={flashcard}
          onEdit={() => handleEdit(flashcard)}
          onDelete={() => handleDelete(flashcard)}
          isDeleting={flashcard.isDeleting}
        />
      ))}

      <LoadMoreTrigger onIntersect={onLoadMore} hasMore={hasMore} isLoading={isLoadingMore} />

      {/* Komunikat końca listy */}
      {!hasMore && flashcards.length > 0 && (
        <p className="text-center text-sm text-muted-foreground py-4">To wszystkie fiszki</p>
      )}
    </div>
  );
}
