import { useId, useCallback } from "react";
import { Textarea } from "@/components/ui/textarea";
import type { SourceTextInputProps } from "./types";
import { cn } from "@/lib/utils";

/**
 * Pole tekstowe (textarea) do wklejania tekstu źródłowego
 * z obsługą placeholder i odpowiednimi atrybutami ARIA.
 */
export function SourceTextInput({
  value,
  onChange,
  disabled,
  hasError,
  placeholder = "Wklej tekst źródłowy, z którego chcesz wygenerować fiszki...",
}: SourceTextInputProps) {
  const id = useId();
  const errorId = useId();

  const handleChange = useCallback(
    (e: React.ChangeEvent<HTMLTextAreaElement>) => {
      onChange(e.target.value);
    },
    [onChange]
  );

  return (
    <div className="space-y-2">
      <label htmlFor={id} className="text-sm font-medium leading-none">
        Tekst źródłowy
      </label>
      <Textarea
        id={id}
        value={value}
        onChange={handleChange}
        disabled={disabled}
        placeholder={placeholder}
        className={cn(
          "min-h-[200px] resize-y",
          hasError && "border-destructive focus-visible:ring-destructive"
        )}
        aria-invalid={hasError}
        aria-describedby={hasError ? errorId : undefined}
      />
      {hasError && (
        <p id={errorId} className="text-sm text-destructive" role="alert">
          Tekst musi mieć od 1000 do 10000 znaków
        </p>
      )}
    </div>
  );
}
