import { Loader2, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { GenerateButtonProps } from "./types";

/**
 * Przycisk uruchamiający proces generowania fiszek.
 * Wyświetla stan ładowania podczas generowania.
 */
export function GenerateButton({ isLoading, disabled }: GenerateButtonProps) {
  return (
    <Button type="submit" disabled={disabled || isLoading} className="w-full sm:w-auto">
      {isLoading ? (
        <>
          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          Generowanie...
        </>
      ) : (
        <>
          <Sparkles className="mr-2 h-4 w-4" />
          Generuj fiszki
        </>
      )}
    </Button>
  );
}
