import type { LucideIcon } from "lucide-react";

/**
 * Konfiguracja pojedynczego elementu nawigacji
 */
export interface NavItemConfig {
  /** Ścieżka docelowa */
  href: string;
  /** Etykieta wyświetlana w nawigacji */
  label: string;
  /** Ikona z lucide-react */
  icon: LucideIcon;
  /** Czy wymagana autoryzacja (domyślnie true) */
  requiresAuth?: boolean;
}

/**
 * Props dla głównego layoutu
 */
export interface AppShellLayoutProps {
  /** Tytuł strony */
  title?: string;
}

/**
 * Props dla NavigationShell
 */
export interface NavigationShellProps {
  /** Zawartość strony */
  children: React.ReactNode;
  /** Aktualna ścieżka URL */
  currentPath: string;
  /** Email zalogowanego użytkownika */
  userEmail?: string;
}

/**
 * Props dla Sidebar
 */
export interface SidebarProps {
  /** Aktualna ścieżka URL do podświetlenia aktywnego linku */
  currentPath: string;
  /** Email zalogowanego użytkownika */
  userEmail?: string;
  /** Callback wylogowania */
  onLogout: () => void;
}

/**
 * Props dla BottomNav
 */
export interface BottomNavProps {
  /** Aktualna ścieżka URL */
  currentPath: string;
}

/**
 * Props dla TopBar
 */
export interface TopBarProps {
  /** Email zalogowanego użytkownika */
  userEmail?: string;
  /** Callback wylogowania */
  onLogout: () => void;
}

/**
 * Props dla NavItem
 */
export interface NavItemProps {
  /** Ścieżka docelowa */
  href: string;
  /** Ikona z lucide-react */
  icon: LucideIcon;
  /** Etykieta tekstowa */
  label: string;
  /** Czy element jest aktywny */
  isActive: boolean;
  /** Czy wyświetlać etykietę (domyślnie true) */
  showLabel?: boolean;
  /** Wariant wyświetlania */
  variant?: "sidebar" | "bottom-nav";
}

/**
 * Props dla UserMenu
 */
export interface UserMenuProps {
  /** Email użytkownika */
  email?: string;
  /** Callback wylogowania */
  onLogout: () => void;
  /** Czy menu jest rozwinięte */
  isOpen?: boolean;
  /** Callback zmiany stanu menu */
  onOpenChange?: (open: boolean) => void;
}

/**
 * Props dla ThemeToggle
 */
export interface ThemeToggleProps {
  /** Aktualny motyw */
  theme: "light" | "dark";
  /** Callback przełączenia motywu */
  onToggle: () => void;
  /** Rozmiar przycisku */
  size?: "sm" | "default" | "lg";
}

/**
 * Dostępne motywy
 */
export type Theme = "light" | "dark";

/**
 * Wartość kontekstu motywu
 */
export interface ThemeContextValue {
  /** Aktualny motyw */
  theme: Theme;
  /** Funkcja ustawiająca motyw */
  setTheme: (theme: Theme) => void;
  /** Funkcja przełączająca motyw */
  toggleTheme: () => void;
}

/**
 * Props dla ThemeProvider
 */
export interface ThemeProviderProps {
  /** Komponenty dzieci */
  children: React.ReactNode;
  /** Domyślny motyw (jeśli brak w localStorage) */
  defaultTheme?: Theme;
  /** Klucz localStorage */
  storageKey?: string;
}

/**
 * Stałe
 */
export const THEME_STORAGE_KEY = "10x-cards-theme";
export const DEFAULT_THEME: Theme = "light";
