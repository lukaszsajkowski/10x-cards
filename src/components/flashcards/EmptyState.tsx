import { FileText, Plus, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { EmptyStateProps } from "./types";

/**
 * Komponent wyświetlany gdy użytkownik nie ma żadnych fiszek.
 * Zawiera ilustrację, komunikat oraz CTA zachęcające do
 * utworzenia fiszki lub wygenerowania przez AI.
 */
export function EmptyState({ onCreateClick }: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center justify-center py-16 px-4 text-center">
      {/* Ilustracja */}
      <div className="rounded-full bg-muted p-4 mb-6">
        <FileText className="size-12 text-muted-foreground" />
      </div>

      {/* Tekst główny */}
      <h2 className="text-xl font-semibold mb-2">Nie masz jeszcze żadnych fiszek</h2>

      {/* Tekst pomocniczy */}
      <p className="text-muted-foreground mb-8 max-w-md">
        Utwórz pierwszą fiszkę ręcznie lub wygeneruj zestaw fiszek z pomocą AI na podstawie dowolnego tekstu.
      </p>

      {/* Przyciski CTA */}
      <div className="flex flex-col sm:flex-row gap-3">
        <Button onClick={onCreateClick} size="lg">
          <Plus className="size-4 mr-2" />
          Dodaj fiszkę
        </Button>
        <Button variant="outline" size="lg" asChild>
          <a href="/generate">
            <Sparkles className="size-4 mr-2" />
            Generuj z AI
          </a>
        </Button>
      </div>
    </div>
  );
}
