import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { FlashcardsHeaderProps } from "./types";

/**
 * Nagłówek widoku zawierający tytuł strony oraz przycisk tworzenia nowej fiszki.
 */
export function FlashcardsHeader({ onCreateClick }: FlashcardsHeaderProps) {
  return (
    <header className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between mb-8">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Moje Fiszki</h1>
        <p className="text-muted-foreground mt-1">Zarządzaj swoją kolekcją fiszek edukacyjnych</p>
      </div>
      <Button onClick={onCreateClick} className="sm:flex-shrink-0">
        <Plus className="size-4 mr-2" />
        Dodaj fiszkę
      </Button>
    </header>
  );
}
