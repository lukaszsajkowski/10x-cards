import { useEffect, useRef, useCallback } from "react";
import { Loader2 } from "lucide-react";
import type { LoadMoreTriggerProps } from "./types";

/**
 * Niewidoczny element na końcu listy wykorzystywany przez IntersectionObserver
 * do wykrywania scrollowania i automatycznego ładowania kolejnych stron.
 */
export function LoadMoreTrigger({ onIntersect, hasMore, isLoading }: LoadMoreTriggerProps) {
  const triggerRef = useRef<HTMLDivElement>(null);

  const handleIntersect = useCallback(
    (entries: IntersectionObserverEntry[]) => {
      const [entry] = entries;
      if (entry.isIntersecting && hasMore && !isLoading) {
        onIntersect();
      }
    },
    [hasMore, isLoading, onIntersect]
  );

  useEffect(() => {
    const element = triggerRef.current;
    if (!element) return;

    const observer = new IntersectionObserver(handleIntersect, {
      threshold: 0.1,
      rootMargin: "100px",
    });

    observer.observe(element);

    return () => {
      observer.disconnect();
    };
  }, [handleIntersect]);

  // Nie renderuj nic jeśli nie ma więcej do załadowania
  if (!hasMore && !isLoading) {
    return null;
  }

  return (
    <div ref={triggerRef} className="flex items-center justify-center py-4" aria-hidden="true">
      {isLoading && (
        <div className="flex items-center gap-2 text-muted-foreground">
          <Loader2 className="size-4 animate-spin" />
          <span className="text-sm">Ładowanie...</span>
        </div>
      )}
    </div>
  );
}
