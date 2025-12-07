import { useCallback } from "react";
import { ArrowDown, ArrowUp, ArrowUpDown } from "lucide-react";
import {
  Table,
  TableBody,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { GenerationsTableRow } from "./GenerationsTableRow";
import type { GenerationsTableProps } from "./types";

/**
 * Tabela prezentująca listę generacji.
 * Wykorzystuje komponenty Shadcn/ui Table dla spójnego wyglądu i dostępności.
 */
export function GenerationsTable({
  generations,
  sortOrder,
  onSortOrderChange,
}: GenerationsTableProps) {
  const handleSortClick = useCallback(() => {
    onSortOrderChange(sortOrder === "desc" ? "asc" : "desc");
  }, [sortOrder, onSortOrderChange]);

  const SortIcon =
    sortOrder === "desc" ? ArrowDown : sortOrder === "asc" ? ArrowUp : ArrowUpDown;

  return (
    <div className="rounded-md border">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="w-[180px]">
              <Button
                variant="ghost"
                size="sm"
                className="-ml-3 h-8 data-[state=open]:bg-accent"
                onClick={handleSortClick}
                aria-label={`Sortuj według daty ${sortOrder === "desc" ? "rosnąco" : "malejąco"}`}
              >
                Data
                <SortIcon className="ml-2 size-4" />
              </Button>
            </TableHead>
            <TableHead className="w-[140px] text-right">Długość tekstu</TableHead>
            <TableHead className="w-[120px] text-right">Wygenerowano</TableHead>
            <TableHead className="w-[120px] text-right">Zaakceptowano</TableHead>
            <TableHead className="w-[100px] text-right">Skuteczność</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {generations.map((generation) => (
            <GenerationsTableRow key={generation.id} generation={generation} />
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
