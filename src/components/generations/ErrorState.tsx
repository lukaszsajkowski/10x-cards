import { AlertCircle, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { ErrorStateProps } from "./types";

/**
 * Komponent wyświetlany po wystąpieniu błędu podczas pobierania danych.
 * Zawiera komunikat błędu i przycisk ponowienia próby.
 */
export function ErrorState({ error, onRetry }: ErrorStateProps) {
  return (
    <div className="flex flex-col items-center justify-center py-16 px-4 text-center">
      {/* Ikona błędu */}
      <div className="rounded-full bg-destructive/10 p-4 mb-6">
        <AlertCircle className="size-12 text-destructive" />
      </div>

      {/* Tekst główny */}
      <h2 className="text-xl font-semibold mb-2">
        Nie udało się załadować historii
      </h2>

      {/* Komunikat błędu */}
      <p className="text-muted-foreground mb-8 max-w-md">{error}</p>

      {/* Przycisk retry */}
      <Button onClick={onRetry}>
        <RefreshCw className="size-4 mr-2" />
        Spróbuj ponownie
      </Button>
    </div>
  );
}
