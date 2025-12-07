import { History, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";

/**
 * Komponent wyświetlany gdy użytkownik nie ma żadnych generacji.
 * Zawiera ilustrację i komunikat zachęcający do wygenerowania fiszek.
 */
export function EmptyState() {
  return (
    <div className="flex flex-col items-center justify-center py-16 px-4 text-center">
      {/* Ilustracja */}
      <div className="rounded-full bg-muted p-4 mb-6">
        <History className="size-12 text-muted-foreground" />
      </div>

      {/* Tekst główny */}
      <h2 className="text-xl font-semibold mb-2">Brak historii generacji</h2>

      {/* Tekst pomocniczy */}
      <p className="text-muted-foreground mb-8 max-w-md">
        Nie masz jeszcze żadnych wygenerowanych fiszek. Rozpocznij generowanie
        fiszek z pomocą AI, aby zobaczyć tutaj historię.
      </p>

      {/* Przycisk CTA */}
      <Button size="lg" asChild>
        <a href="/generate">
          <Sparkles className="size-4 mr-2" />
          Generuj fiszki
        </a>
      </Button>
    </div>
  );
}
