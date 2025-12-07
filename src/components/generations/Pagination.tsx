import { useCallback, useId } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { PaginationProps } from "./types";

const LIMIT_OPTIONS = [10, 20, 50] as const;

/**
 * Komponent nawigacji między stronami.
 * Wyświetla informację o aktualnej stronie, przyciski nawigacyjne
 * oraz opcję zmiany liczby elementów na stronie.
 */
export function Pagination({
  page,
  limit,
  total,
  onPageChange,
  onLimitChange,
  isLoading = false,
}: PaginationProps) {
  const selectId = useId();
  const totalPages = Math.max(1, Math.ceil(total / limit));

  const handlePrevious = useCallback(() => {
    if (page > 1) {
      onPageChange(page - 1);
    }
  }, [page, onPageChange]);

  const handleNext = useCallback(() => {
    if (page < totalPages) {
      onPageChange(page + 1);
    }
  }, [page, totalPages, onPageChange]);

  const handleLimitChange = useCallback(
    (value: string) => {
      onLimitChange(Number(value));
    },
    [onLimitChange]
  );

  const isPreviousDisabled = page <= 1 || isLoading;
  const isNextDisabled = page >= totalPages || isLoading;

  return (
    <div className="flex flex-col sm:flex-row items-center justify-between gap-4 py-4">
      {/* Informacja o rekordach */}
      <p className="text-sm text-muted-foreground order-2 sm:order-1">
        Strona {page} z {totalPages}
        <span className="hidden sm:inline"> (łącznie {total} rekordów)</span>
      </p>

      {/* Kontrolki */}
      <div className="flex items-center gap-4 order-1 sm:order-2">
        {/* Wybór liczby elementów */}
        <div className="flex items-center gap-2">
          <label
            htmlFor={selectId}
            className="text-sm text-muted-foreground whitespace-nowrap"
          >
            Na stronie:
          </label>
          <Select
            value={limit.toString()}
            onValueChange={handleLimitChange}
            disabled={isLoading}
          >
            <SelectTrigger id={selectId} className="w-[70px]" size="sm">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {LIMIT_OPTIONS.map((option) => (
                <SelectItem key={option} value={option.toString()}>
                  {option}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Przyciski nawigacji */}
        <div className="flex items-center gap-1">
          <Button
            variant="outline"
            size="sm"
            onClick={handlePrevious}
            disabled={isPreviousDisabled}
            aria-label="Poprzednia strona"
          >
            <ChevronLeft className="size-4" />
            <span className="hidden sm:inline ml-1">Poprzednia</span>
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={handleNext}
            disabled={isNextDisabled}
            aria-label="Następna strona"
          >
            <span className="hidden sm:inline mr-1">Następna</span>
            <ChevronRight className="size-4" />
          </Button>
        </div>
      </div>
    </div>
  );
}
