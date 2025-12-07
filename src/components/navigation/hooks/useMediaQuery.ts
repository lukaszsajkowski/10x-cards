import { useState, useEffect, useCallback } from "react";

/**
 * Hook do wykrywania czy media query jest spełnione
 * Obsługuje SSR poprzez domyślną wartość false przed hydracją
 */
export function useMediaQuery(query: string): boolean {
  const [matches, setMatches] = useState(false);

  const handleChange = useCallback((event: MediaQueryListEvent | MediaQueryList) => {
    setMatches(event.matches);
  }, []);

  useEffect(() => {
    // Sprawdzenie czy jesteśmy w środowisku przeglądarki
    if (typeof window === "undefined") {
      return;
    }

    const mediaQuery = window.matchMedia(query);
    
    // Ustawienie początkowej wartości
    setMatches(mediaQuery.matches);

    // Nasłuchiwanie zmian
    mediaQuery.addEventListener("change", handleChange);

    return () => {
      mediaQuery.removeEventListener("change", handleChange);
    };
  }, [query, handleChange]);

  return matches;
}

/**
 * Hook sprawdzający czy ekran jest mobilny (< 768px)
 */
export function useIsMobile(): boolean {
  return useMediaQuery("(max-width: 767px)");
}

/**
 * Hook sprawdzający czy ekran jest desktopowy (>= 768px)
 */
export function useIsDesktop(): boolean {
  return useMediaQuery("(min-width: 768px)");
}
