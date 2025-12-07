import { useCallback, useMemo } from "react";
import { SourceTextInput } from "./SourceTextInput";
import { CharacterCounter } from "./CharacterCounter";
import { GenerateButton } from "./GenerateButton";
import { VALIDATION_LIMITS, type SourceTextFormProps } from "./types";

/**
 * Formularz wprowadzania tekstu źródłowego z licznikiem znaków i przyciskiem generowania.
 * Odpowiada za walidację długości tekstu przed wysłaniem żądania.
 */
export function SourceTextForm({
  sourceText,
  onSourceTextChange,
  onGenerate,
  isGenerating,
  validationError,
}: SourceTextFormProps) {
  const characterCount = sourceText.length;

  const isValid = useMemo(() => {
    return (
      characterCount >= VALIDATION_LIMITS.SOURCE_TEXT_MIN &&
      characterCount <= VALIDATION_LIMITS.SOURCE_TEXT_MAX
    );
  }, [characterCount]);

  const hasError = useMemo(() => {
    // Show error only if user has started typing and text is invalid
    return characterCount > 0 && !isValid;
  }, [characterCount, isValid]);

  const handleSubmit = useCallback(
    (e: React.FormEvent) => {
      e.preventDefault();
      if (isValid && !isGenerating) {
        onGenerate();
      }
    },
    [isValid, isGenerating, onGenerate]
  );

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <SourceTextInput
        value={sourceText}
        onChange={onSourceTextChange}
        disabled={isGenerating}
        hasError={hasError}
      />

      <CharacterCounter
        current={characterCount}
        min={VALIDATION_LIMITS.SOURCE_TEXT_MIN}
        max={VALIDATION_LIMITS.SOURCE_TEXT_MAX}
      />

      {validationError && (
        <p className="text-sm text-destructive" role="alert">
          {validationError}
        </p>
      )}

      <div className="flex justify-end">
        <GenerateButton isLoading={isGenerating} disabled={!isValid} />
      </div>
    </form>
  );
}
