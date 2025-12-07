import { memo } from "react";
import { AlertCircle, X } from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import type { ErrorAlertProps } from "./types";

/**
 * Komponent wyświetlający komunikaty błędów z możliwością zamknięcia.
 */
export const ErrorAlert = memo(function ErrorAlert({
  message,
  onDismiss,
}: ErrorAlertProps) {
  return (
    <Alert variant="destructive" className="relative">
      <AlertCircle className="h-4 w-4" />
      <AlertTitle>Wystąpił błąd</AlertTitle>
      <AlertDescription>{message}</AlertDescription>
      <Button
        variant="ghost"
        size="icon"
        className="absolute top-2 right-2 h-6 w-6"
        onClick={onDismiss}
        aria-label="Zamknij alert"
      >
        <X className="h-4 w-4" />
      </Button>
    </Alert>
  );
});
