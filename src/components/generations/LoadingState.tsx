import { Skeleton } from "@/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import type { LoadingStateProps } from "./types";

/**
 * Komponent wyświetlający skeleton UI podczas ładowania danych.
 * Imituje strukturę tabeli generacji dla lepszego UX.
 */
export function LoadingState({ rowCount = 5 }: LoadingStateProps) {
  return (
    <div className="space-y-4" role="status" aria-label="Ładowanie historii generacji">
      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-[180px]">
                <Skeleton className="h-4 w-16" />
              </TableHead>
              <TableHead className="w-[140px]">
                <Skeleton className="h-4 w-24" />
              </TableHead>
              <TableHead className="w-[120px]">
                <Skeleton className="h-4 w-24" />
              </TableHead>
              <TableHead className="w-[120px]">
                <Skeleton className="h-4 w-24" />
              </TableHead>
              <TableHead className="w-[100px]">
                <Skeleton className="h-4 w-20" />
              </TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {Array.from({ length: rowCount }).map((_, index) => (
              <TableRow key={index}>
                <TableCell>
                  <Skeleton className="h-4 w-32" />
                </TableCell>
                <TableCell>
                  <Skeleton className="h-4 w-20" />
                </TableCell>
                <TableCell>
                  <Skeleton className="h-4 w-8" />
                </TableCell>
                <TableCell>
                  <Skeleton className="h-4 w-8" />
                </TableCell>
                <TableCell>
                  <Skeleton className="h-4 w-12" />
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
      <span className="sr-only">Ładowanie historii generacji...</span>
    </div>
  );
}
