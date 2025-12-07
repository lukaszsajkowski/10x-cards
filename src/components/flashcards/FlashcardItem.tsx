import { useMemo } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { FlashcardContent } from "./FlashcardContent";
import { FlashcardItemActions } from "./FlashcardItemActions";
import type { FlashcardItemProps } from "./types";
import { cn } from "@/lib/utils";

/**
 * Mapowanie źródła fiszki na tekst etykiety
 */
const SOURCE_LABELS: Record<string, string> = {
  "ai-full": "AI",
  "ai-edited": "AI (edytowana)",
  manual: "Ręczna",
};

/**
 * Pojedynczy element listy reprezentujący fiszkę.
 * Wyświetla podgląd przodu i tyłu fiszki oraz przyciski akcji.
 * Obsługuje animację usuwania dla Optimistic UI.
 */
export function FlashcardItem({ flashcard, onEdit, onDelete, isDeleting = false }: FlashcardItemProps) {
  const sourceLabel = useMemo(() => SOURCE_LABELS[flashcard.source] ?? flashcard.source, [flashcard.source]);

  const badgeVariant = useMemo(() => {
    if (flashcard.source === "manual") return "secondary";
    if (flashcard.source === "ai-edited") return "outline";
    return "default";
  }, [flashcard.source]);

  return (
    <article
      role="listitem"
      className={cn("transition-all duration-200", isDeleting && "opacity-50 scale-95 pointer-events-none")}
    >
      <Card className="hover:shadow-md transition-shadow">
        <CardContent className="pt-4">
          <div className="flex flex-col gap-4">
            {/* Header z badge i akcjami */}
            <div className="flex items-center justify-between">
              <Badge variant={badgeVariant}>{sourceLabel}</Badge>
              <FlashcardItemActions onEdit={onEdit} onDelete={onDelete} disabled={isDeleting} />
            </div>

            {/* Treść fiszki */}
            <FlashcardContent front={flashcard.front} back={flashcard.back} />
          </div>
        </CardContent>
      </Card>
    </article>
  );
}
