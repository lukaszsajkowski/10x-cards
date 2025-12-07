import { useMemo } from "react";
import type { CharacterCounterProps } from "./types";

/**
 * Komponent wyświetlający aktualną liczbę znaków oraz dozwolony zakres.
 * Zmienia kolor w zależności od stanu walidacji.
 */
export function CharacterCounter({ current, min, max }: CharacterCounterProps) {
  const status = useMemo(() => {
    if (current < min) return "below";
    if (current > max) return "above";
    return "valid";
  }, [current, min, max]);

  const colorClass = useMemo(() => {
    switch (status) {
      case "below":
        return "text-muted-foreground";
      case "above":
        return "text-destructive";
      case "valid":
        return "text-green-600 dark:text-green-500";
    }
  }, [status]);

  const message = useMemo(() => {
    if (status === "below") {
      const remaining = min - current;
      return `Jeszcze ${remaining} znaków do minimum`;
    }
    if (status === "above") {
      const excess = current - max;
      return `${excess} znaków ponad limit`;
    }
    return "Długość tekstu OK";
  }, [status, current, min, max]);

  return (
    <div className="flex items-center justify-between text-sm">
      <span className={colorClass}>{message}</span>
      <span className={colorClass}>
        {current.toLocaleString("pl-PL")} / {min.toLocaleString("pl-PL")}-{max.toLocaleString("pl-PL")}
      </span>
    </div>
  );
}
