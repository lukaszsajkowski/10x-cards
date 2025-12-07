import { useState, useCallback, useMemo } from "react";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Loader2 } from "lucide-react";
import { CharacterCounter } from "@/components/generate/CharacterCounter";
import { FLASHCARD_VALIDATION, validateFlashcardForm, type FlashcardFormProps, type FlashcardFormData } from "./types";

/**
 * Formularz do wprowadzania/edycji danych fiszki.
 * Zawiera pola tekstowe dla przodu i tyłu z walidacją i licznikami znaków.
 */
export function FlashcardForm({
  initialData,
  onSubmit,
  onCancel,
  isSubmitting,
  submitLabel = "Zapisz",
}: FlashcardFormProps) {
  const [formData, setFormData] = useState<FlashcardFormData>({
    front: initialData?.front ?? "",
    back: initialData?.back ?? "",
  });

  const [touched, setTouched] = useState({
    front: false,
    back: false,
  });

  const validation = useMemo(() => validateFlashcardForm(formData), [formData]);

  const handleFrontChange = useCallback((e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setFormData((prev) => ({ ...prev, front: e.target.value }));
  }, []);

  const handleBackChange = useCallback((e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setFormData((prev) => ({ ...prev, back: e.target.value }));
  }, []);

  const handleBlur = useCallback((field: "front" | "back") => {
    setTouched((prev) => ({ ...prev, [field]: true }));
  }, []);

  const handleSubmit = useCallback(
    (e: React.FormEvent) => {
      e.preventDefault();

      // Mark all fields as touched
      setTouched({ front: true, back: true });

      if (validation.isValid) {
        onSubmit(formData);
      }
    },
    [formData, validation.isValid, onSubmit]
  );

  const showFrontError = touched.front && validation.errors.front;
  const showBackError = touched.back && validation.errors.back;

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* Pole Przód */}
      <div className="space-y-2">
        <label
          htmlFor="flashcard-front"
          className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
        >
          Przód fiszki
        </label>
        <Textarea
          id="flashcard-front"
          value={formData.front}
          onChange={handleFrontChange}
          onBlur={() => handleBlur("front")}
          placeholder="Wpisz treść przodu fiszki (np. pytanie, termin)"
          disabled={isSubmitting}
          className={showFrontError ? "border-destructive" : ""}
          rows={3}
          aria-invalid={showFrontError ? "true" : "false"}
          aria-describedby={showFrontError ? "front-error" : "front-counter"}
        />
        <div className="flex items-center justify-between">
          {showFrontError ? (
            <span id="front-error" className="text-sm text-destructive">
              {validation.errors.front}
            </span>
          ) : (
            <span />
          )}
          <CharacterCounter
            current={formData.front.trim().length}
            min={FLASHCARD_VALIDATION.FRONT_MIN_LENGTH}
            max={FLASHCARD_VALIDATION.FRONT_MAX_LENGTH}
          />
        </div>
      </div>

      {/* Pole Tył */}
      <div className="space-y-2">
        <label
          htmlFor="flashcard-back"
          className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
        >
          Tył fiszki
        </label>
        <Textarea
          id="flashcard-back"
          value={formData.back}
          onChange={handleBackChange}
          onBlur={() => handleBlur("back")}
          placeholder="Wpisz treść tyłu fiszki (np. odpowiedź, definicja)"
          disabled={isSubmitting}
          className={showBackError ? "border-destructive" : ""}
          rows={4}
          aria-invalid={showBackError ? "true" : "false"}
          aria-describedby={showBackError ? "back-error" : "back-counter"}
        />
        <div className="flex items-center justify-between">
          {showBackError ? (
            <span id="back-error" className="text-sm text-destructive">
              {validation.errors.back}
            </span>
          ) : (
            <span />
          )}
          <CharacterCounter
            current={formData.back.trim().length}
            min={FLASHCARD_VALIDATION.BACK_MIN_LENGTH}
            max={FLASHCARD_VALIDATION.BACK_MAX_LENGTH}
          />
        </div>
      </div>

      {/* Przyciski */}
      <div className="flex justify-end gap-3">
        <Button type="button" variant="outline" onClick={onCancel} disabled={isSubmitting}>
          Anuluj
        </Button>
        <Button type="submit" disabled={isSubmitting || !validation.isValid}>
          {isSubmitting && <Loader2 className="mr-2 size-4 animate-spin" />}
          {submitLabel}
        </Button>
      </div>
    </form>
  );
}
