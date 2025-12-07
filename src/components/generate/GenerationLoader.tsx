import { Skeleton } from "@/components/ui/skeleton";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import type { GenerationLoaderProps } from "./types";

/**
 * Komponent wyświetlający skeleton UI podczas oczekiwania na odpowiedź z API.
 * Imituje wygląd kart fiszek dla lepszego UX.
 */
export function GenerationLoader({ skeletonCount = 3 }: GenerationLoaderProps) {
  return (
    <div className="space-y-6">
      <div className="flex items-center gap-2">
        <Skeleton className="h-4 w-4 rounded-full animate-pulse" />
        <p className="text-sm text-muted-foreground">
          Generowanie propozycji fiszek... To może potrwać do minuty.
        </p>
      </div>

      <div className="grid gap-4">
        {Array.from({ length: skeletonCount }).map((_, index) => (
          <Card key={index} className="overflow-hidden">
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between">
                <Skeleton className="h-5 w-24" />
                <Skeleton className="h-8 w-20" />
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Skeleton className="h-4 w-16" />
                <Skeleton className="h-10 w-full" />
              </div>
              <div className="space-y-2">
                <Skeleton className="h-4 w-16" />
                <Skeleton className="h-16 w-full" />
              </div>
              <div className="flex justify-end gap-2">
                <Skeleton className="h-9 w-24" />
                <Skeleton className="h-9 w-24" />
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
