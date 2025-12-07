import { Skeleton } from "@/components/ui/skeleton";
import { Card, CardContent } from "@/components/ui/card";
import type { LoadingStateProps } from "./types";

/**
 * Komponent wyświetlający stan ładowania podczas pobierania
 * początkowej listy fiszek. Wykorzystuje skeleton cards dla lepszego UX.
 */
export function LoadingState({ count = 3 }: LoadingStateProps) {
  return (
    <div className="space-y-4" role="status" aria-label="Ładowanie fiszek">
      {Array.from({ length: count }).map((_, index) => (
        <Card key={index}>
          <CardContent className="pt-4">
            <div className="flex flex-col gap-4">
              {/* Header skeleton */}
              <div className="flex items-center justify-between">
                <Skeleton className="h-5 w-16 rounded-full" />
                <div className="flex gap-1">
                  <Skeleton className="h-8 w-20" />
                  <Skeleton className="h-8 w-16" />
                </div>
              </div>

              {/* Content skeleton */}
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Skeleton className="h-3 w-12" />
                  <Skeleton className="h-4 w-full" />
                  <Skeleton className="h-4 w-3/4" />
                </div>
                <div className="space-y-2">
                  <Skeleton className="h-3 w-8" />
                  <Skeleton className="h-4 w-full" />
                  <Skeleton className="h-4 w-5/6" />
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      ))}
      <span className="sr-only">Ładowanie fiszek...</span>
    </div>
  );
}
