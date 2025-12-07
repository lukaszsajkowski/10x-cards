import type { FlashcardContentProps } from "./types";

/**
 * Komponent prezentacyjny wyświetlający treść fiszki (przód i tył)
 * w czytelnym formacie z odpowiednimi etykietami.
 */
export function FlashcardContent({ front, back }: FlashcardContentProps) {
  return (
    <div className="grid gap-4 sm:grid-cols-2">
      <div className="space-y-1">
        <span className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Przód</span>
        <p className="text-sm leading-relaxed line-clamp-3">{front}</p>
      </div>
      <div className="space-y-1">
        <span className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Tył</span>
        <p className="text-sm leading-relaxed line-clamp-3">{back}</p>
      </div>
    </div>
  );
}
