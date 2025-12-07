import { useState, useEffect, useCallback } from "react";
import { type Theme, THEME_STORAGE_KEY, DEFAULT_THEME } from "../types";

interface UseThemeReturn {
  /** Aktualny motyw */
  theme: Theme;
  /** Ustawienie konkretnego motywu */
  setTheme: (theme: Theme) => void;
  /** Przełączenie motywu */
  toggleTheme: () => void;
  /** Czy motyw został załadowany (po hydratacji) */
  isLoaded: boolean;
}

/**
 * Hook do zarządzania stanem motywu z persystencją w localStorage
 * Obsługuje:
 * - Inicjalizację z localStorage lub preferencji systemowych
 * - Synchronizację z klasą `dark` na elemencie <html>
 * - Zapis do localStorage przy każdej zmianie
 * - Obsługę SSR (hydration mismatch prevention)
 */
export function useTheme(): UseThemeReturn {
  const [theme, setThemeState] = useState<Theme>(DEFAULT_THEME);
  const [isLoaded, setIsLoaded] = useState(false);

  // Inicjalizacja - ładowanie z localStorage lub preferencji systemowych
  useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }

    const stored = localStorage.getItem(THEME_STORAGE_KEY) as Theme | null;
    
    if (stored && (stored === "light" || stored === "dark")) {
      setThemeState(stored);
    } else {
      // Fallback na preferencje systemowe
      const prefersDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
      setThemeState(prefersDark ? "dark" : "light");
    }
    
    setIsLoaded(true);
  }, []);

  // Synchronizacja z DOM i localStorage
  useEffect(() => {
    if (typeof window === "undefined" || !isLoaded) {
      return;
    }

    const root = document.documentElement;
    
    if (theme === "dark") {
      root.classList.add("dark");
    } else {
      root.classList.remove("dark");
    }
    
    localStorage.setItem(THEME_STORAGE_KEY, theme);
  }, [theme, isLoaded]);

  const setTheme = useCallback((newTheme: Theme) => {
    setThemeState(newTheme);
  }, []);

  const toggleTheme = useCallback(() => {
    setThemeState((prev) => (prev === "light" ? "dark" : "light"));
  }, []);

  return {
    theme,
    setTheme,
    toggleTheme,
    isLoaded,
  };
}
