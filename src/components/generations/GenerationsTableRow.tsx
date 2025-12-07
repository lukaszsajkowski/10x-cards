import { memo } from "react";
import { TableCell, TableRow } from "@/components/ui/table";
import type { GenerationsTableRowProps } from "./types";

/**
 * Formatuje datę do formatu DD.MM.YYYY HH:mm
 */
function formatDate(date: Date): string {
  return date.toLocaleDateString("pl-PL", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

/**
 * Formatuje liczbę z separatorem tysięcy
 */
function formatNumber(num: number): string {
  return num.toLocaleString("pl-PL");
}

/**
 * Pojedynczy wiersz tabeli reprezentujący jedną generację.
 * Wyświetla wszystkie dane generacji w czytelnym formacie.
 */
export const GenerationsTableRow = memo(function GenerationsTableRow({
  generation,
}: GenerationsTableRowProps) {
  return (
    <TableRow>
      <TableCell className="font-medium">
        {formatDate(generation.createdAt)}
      </TableCell>
      <TableCell className="text-right tabular-nums">
        {formatNumber(generation.sourceTextLength)} zn.
      </TableCell>
      <TableCell className="text-right tabular-nums">
        {generation.generatedCount}
      </TableCell>
      <TableCell className="text-right tabular-nums">
        {generation.totalAcceptedCount}
      </TableCell>
      <TableCell className="text-right tabular-nums">
        <span
          className={
            generation.acceptanceRate >= 70
              ? "text-green-600 dark:text-green-400"
              : generation.acceptanceRate >= 40
                ? "text-yellow-600 dark:text-yellow-400"
                : "text-muted-foreground"
          }
        >
          {generation.acceptanceRate}%
        </span>
      </TableCell>
    </TableRow>
  );
});
