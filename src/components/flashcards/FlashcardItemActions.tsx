import { Pencil, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { FlashcardItemActionsProps } from "./types";

/**
 * Zestaw przycisków akcji dla pojedynczej fiszki: edycja i usuwanie.
 */
export function FlashcardItemActions({ onEdit, onDelete, disabled = false }: FlashcardItemActionsProps) {
  return (
    <div className="flex items-center gap-1">
      <Button
        variant="ghost"
        size="sm"
        onClick={(e) => {
          e.stopPropagation();
          onEdit();
        }}
        disabled={disabled}
        aria-label="Edytuj fiszkę"
      >
        <Pencil className="size-4" />
        <span className="sr-only sm:not-sr-only sm:ml-1">Edytuj</span>
      </Button>
      <Button
        variant="ghost"
        size="sm"
        onClick={(e) => {
          e.stopPropagation();
          onDelete();
        }}
        disabled={disabled}
        className="text-destructive hover:text-destructive hover:bg-destructive/10"
        aria-label="Usuń fiszkę"
      >
        <Trash2 className="size-4" />
        <span className="sr-only sm:not-sr-only sm:ml-1">Usuń</span>
      </Button>
    </div>
  );
}
