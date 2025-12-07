import { createContext, useContext, useState, useEffect, useCallback, type ReactNode } from "react";
import {
  type Theme,
  type ThemeContextValue,
  THEME_STORAGE_KEY,
  DEFAULT_THEME,
} from "./types";

const ThemeContext = createContext<ThemeContextValue | undefined>(undefined);

interface ThemeProviderProps {
  children: ReactNode;
  defaultTheme?: Theme;
  storageKey?: string;
}

/**
 * Provider zarządzający stanem motywu i synchronizacją z localStorage oraz klasą na <html>
 */
export function ThemeProvider({
  children,
  defaultTheme = DEFAULT_THEME,
  storageKey = THEME_STORAGE_KEY,
}: ThemeProviderProps) {
  const [theme, setThemeState] = useState<Theme>(defaultTheme);
  const [isLoaded, setIsLoaded] = useState(false);

  // Ładowanie z localStorage przy montowaniu
  useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }

    const stored = localStorage.getItem(storageKey) as Theme | null;
    
    if (stored && (stored === "light" || stored === "dark")) {
      setThemeState(stored);
    } else {
      // Fallback na preferencje systemowe
      const prefersDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
      setThemeState(prefersDark ? "dark" : "light");
    }
    
    setIsLoaded(true);
  }, [storageKey]);

  // Synchronizacja z DOM
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
    
    localStorage.setItem(storageKey, theme);
  }, [theme, storageKey, isLoaded]);

  const setTheme = useCallback((newTheme: Theme) => {
    setThemeState(newTheme);
  }, []);

  const toggleTheme = useCallback(() => {
    setThemeState((prev) => (prev === "light" ? "dark" : "light"));
  }, []);

  return (
    <ThemeContext.Provider value={{ theme, setTheme, toggleTheme }}>
      {children}
    </ThemeContext.Provider>
  );
}

/**
 * Hook do korzystania z kontekstu motywu
 * Musi być używany wewnątrz ThemeProvider
 */
export function useThemeContext(): ThemeContextValue {
  const context = useContext(ThemeContext);
  
  if (!context) {
    throw new Error("useThemeContext must be used within ThemeProvider");
  }
  
  return context;
}
