# Plan implementacji widoku App Shell (Globalny Layout)

## 1. Przegląd

App Shell (Globalny Layout) to fundamentalna warstwa interfejsu użytkownika aplikacji 10x-cards, zapewniająca spójną nawigację, kontekst sesji i obsługę globalnych powiadomień w całej aplikacji. Jest to komponent otaczający wszystkie widoki, który dostosowuje się do rozmiaru ekranu:
- **Desktop**: Stały pasek boczny (Sidebar) z nawigacją główną i menu użytkownika
- **Mobile**: Dolny pasek nawigacyjny (Bottom Navigation) z hamburger menu lub ikoną użytkownika

Kluczowe funkcjonalności:
- Nawigacja między głównymi widokami aplikacji (Moje Fiszki, Generator AI, Historia)
- Przełącznik motywu ciemnego/jasnego (Theme Toggle)
- Globalny kontener powiadomień (Toaster)
- Ochrona tras wymagających autoryzacji (AuthGuard via middleware)

App Shell wspiera historyjki użytkownika US-009 (Bezpieczny dostęp i autoryzacja) poprzez integrację z middleware przekierowującym niezalogowanych użytkowników.

## 2. Routing widoku

- **Ścieżka**: Brak dedykowanej ścieżki - komponent jest wrapperem layoutu
- **Plik**: `src/layouts/AppShellLayout.astro`
- **Zastosowanie**: Layout używany przez wszystkie strony wymagające nawigacji i autoryzacji:
  - `/flashcards`
  - `/generate`
  - `/generations`
  - `/settings`
- **Prerender**: `false` (dynamiczne renderowanie ze względu na stan sesji)

## 3. Struktura komponentów

```
AppShellLayout.astro
├── <html>/<head> (metadane, fonty, favicon)
├── <body>
│   ├── ThemeProvider (React, client:load)
│   │   ├── DesktopLayout (hidden na mobile)
│   │   │   ├── Sidebar
│   │   │   │   ├── SidebarHeader (logo)
│   │   │   │   ├── SidebarNav
│   │   │   │   │   └── NavItem[] (links do widoków)
│   │   │   │   └── SidebarFooter
│   │   │   │       ├── UserMenu
│   │   │   │       └── ThemeToggle
│   │   │   └── MainContent (slot)
│   │   └── MobileLayout (hidden na desktop)
│   │       ├── TopBar
│   │       │   ├── Logo
│   │       │   └── UserMenuTrigger
│   │       ├── MainContent (slot)
│   │       └── BottomNav
│   │           └── NavItem[] (links do widoków)
│   └── Toaster (globalny kontener powiadomień)
```

## 4. Szczegóły komponentów

### AppShellLayout.astro

- **Opis**: Główny layout Astro opakowujący całą aplikację. Definiuje strukturę HTML dokumentu, importuje globalne style i renderuje responsywny shell z nawigacją.
- **Główne elementy**:
  - `<!DOCTYPE html>` z `<html lang="pl">`
  - `<head>` z metadanymi, tytułem i importami CSS
  - `<body>` z klasą `dark` warunkową dla motywu
  - `NavigationShell` (React component) z `client:load`
  - `<slot />` dla zawartości strony
  - `Toaster` komponent dla powiadomień
- **Obsługiwane interakcje**: Brak bezpośrednich - delegowane do komponentów React
- **Obsługiwana walidacja**: Brak
- **Typy**: `AppShellLayoutProps`
- **Propsy**:
  - `title?: string` - tytuł strony (domyślnie "10x Cards")

### NavigationShell

- **Opis**: Główny komponent React zarządzający responsywną nawigacją. Wykrywa rozmiar ekranu i renderuje odpowiedni wariant layoutu (desktop/mobile).
- **Główne elementy**:
  - Hook `useMediaQuery` do wykrywania rozmiaru ekranu
  - Warunkowe renderowanie `Sidebar` (desktop) lub `BottomNav` + `TopBar` (mobile)
  - Wrapper `<div>` z odpowiednimi klasami layoutu
- **Obsługiwane interakcje**:
  - Zmiana rozmiaru okna - przełączanie między wariantami
- **Obsługiwana walidacja**: Brak
- **Typy**: `NavigationShellProps`
- **Propsy**:
  - `children: React.ReactNode` - zawartość strony (slot)
  - `currentPath: string` - aktualna ścieżka dla podświetlenia aktywnego linku

### Sidebar

- **Opis**: Pionowy pasek boczny nawigacji widoczny na urządzeniach desktop (ekrany >= 768px). Zawiera logo, główne linki nawigacyjne oraz sekcję użytkownika z przełącznikiem motywu.
- **Główne elementy**:
  - `<aside>` z fixed position i pełną wysokością ekranu
  - `SidebarHeader` z logo aplikacji
  - `<nav>` z listą `NavItem[]`
  - `SidebarFooter` z `UserMenu` i `ThemeToggle`
- **Obsługiwane interakcje**:
  - Nawigacja między stronami (delegowana do NavItem)
  - Interakcja z UserMenu
  - Przełączanie motywu
- **Obsługiwana walidacja**: Brak
- **Typy**: `SidebarProps`
- **Propsy**:
  - `currentPath: string` - do podświetlenia aktywnego linku
  - `userEmail?: string` - email zalogowanego użytkownika

### SidebarHeader

- **Opis**: Nagłówek sidebara zawierający logo i nazwę aplikacji.
- **Główne elementy**:
  - `<div>` z flex layout
  - Logo (ikona lub obrazek)
  - `<span>` z nazwą "10x Cards"
- **Obsługiwane interakcje**:
  - Kliknięcie logo - nawigacja do strony głównej
- **Obsługiwana walidacja**: Brak
- **Typy**: Brak dedykowanych
- **Propsy**: Brak

### SidebarNav

- **Opis**: Kontener nawigacji głównej z listą linków do widoków aplikacji.
- **Główne elementy**:
  - `<nav>` z `role="navigation"`
  - `<ul>` z listą `NavItem[]`
- **Obsługiwane interakcje**: Delegowane do NavItem
- **Obsługiwana walidacja**: Brak
- **Typy**: `SidebarNavProps`
- **Propsy**:
  - `items: NavItemConfig[]` - konfiguracja elementów nawigacji
  - `currentPath: string`

### SidebarFooter

- **Opis**: Dolna sekcja sidebara z menu użytkownika i przełącznikiem motywu.
- **Główne elementy**:
  - `<div>` z border-top i padding
  - `UserMenu` komponent
  - `ThemeToggle` komponent
- **Obsługiwane interakcje**: Delegowane do komponentów dzieci
- **Obsługiwana walidacja**: Brak
- **Typy**: `SidebarFooterProps`
- **Propsy**:
  - `userEmail?: string`

### NavItem

- **Opis**: Pojedynczy element nawigacji z ikoną i etykietą. Obsługuje stan aktywny i hover.
- **Główne elementy**:
  - `<li>` jako kontener
  - `<a>` z href do docelowej strony
  - Ikona (lucide-react)
  - `<span>` z etykietą (ukryty na mobile bottom nav)
- **Obsługiwane interakcje**:
  - `onClick` - nawigacja do strony
  - Keyboard navigation (Enter/Space)
- **Obsługiwana walidacja**: Brak
- **Typy**: `NavItemProps`
- **Propsy**:
  - `href: string` - ścieżka docelowa
  - `icon: LucideIcon` - komponent ikony
  - `label: string` - etykieta tekstowa
  - `isActive: boolean` - czy element jest aktywny
  - `showLabel?: boolean` - czy wyświetlać etykietę (domyślnie true)

### TopBar

- **Opis**: Górny pasek na urządzeniach mobilnych z logo i dostępem do menu użytkownika.
- **Główne elementy**:
  - `<header>` z fixed position na górze
  - Logo/nazwa aplikacji (lewa strona)
  - `UserMenuTrigger` (prawa strona)
- **Obsługiwane interakcje**:
  - Kliknięcie UserMenuTrigger - otwarcie menu
- **Obsługiwana walidacja**: Brak
- **Typy**: `TopBarProps`
- **Propsy**:
  - `userEmail?: string`
  - `onMenuOpen: () => void`

### BottomNav

- **Opis**: Dolny pasek nawigacyjny na urządzeniach mobilnych z głównymi linkami do widoków.
- **Główne elementy**:
  - `<nav>` z fixed position na dole
  - `<ul>` z flex layout (równomierne rozłożenie)
  - `NavItem[]` (3 elementy: Fiszki, Generator, Historia)
- **Obsługiwane interakcje**:
  - Nawigacja między stronami
  - Keyboard navigation
- **Obsługiwana walidacja**: Brak
- **Typy**: `BottomNavProps`
- **Propsy**:
  - `currentPath: string`

### UserMenu

- **Opis**: Rozwijane menu użytkownika z avatarem/emailem, linkiem do ustawień i przyciskiem wylogowania.
- **Główne elementy**:
  - Shadcn/ui `Popover` lub `DropdownMenu`
  - `PopoverTrigger` z avatarem i emailem (skróconym)
  - `PopoverContent` z opcjami:
    - Link "Ustawienia" (→ `/settings`)
    - Przycisk "Wyloguj"
- **Obsługiwane interakcje**:
  - `onOpenChange` - otwieranie/zamykanie menu
  - Kliknięcie "Ustawienia" - nawigacja
  - Kliknięcie "Wyloguj" - wywołanie logout
- **Obsługiwana walidacja**: Brak
- **Typy**: `UserMenuProps`
- **Propsy**:
  - `email?: string` - email użytkownika
  - `onLogout: () => void`

### ThemeToggle

- **Opis**: Przełącznik motywu jasnego/ciemnego w formie przycisku z ikoną słońca/księżyca.
- **Główne elementy**:
  - `<Button>` z Shadcn/ui (wariant ghost)
  - Ikona `Sun` (jasny motyw) lub `Moon` (ciemny motyw)
  - Tooltip z opisem akcji
- **Obsługiwane interakcje**:
  - `onClick` - przełączenie motywu
  - Zapis preferencji do localStorage
- **Obsługiwana walidacja**: Brak
- **Typy**: `ThemeToggleProps`
- **Propsy**:
  - `theme: "light" | "dark"`
  - `onToggle: () => void`

### ThemeProvider

- **Opis**: Context Provider zarządzający stanem motywu i synchronizacją z localStorage oraz klasą na `<html>`.
- **Główne elementy**:
  - React Context dla theme state
  - Effect hook do synchronizacji z DOM
  - Effect hook do ładowania preferencji z localStorage
- **Obsługiwane interakcje**: Brak bezpośrednich
- **Obsługiwana walidacja**: Brak
- **Typy**: `ThemeContextValue`, `ThemeProviderProps`
- **Propsy**:
  - `children: React.ReactNode`
  - `defaultTheme?: "light" | "dark"`

## 5. Typy

### Typy konfiguracji nawigacji (do utworzenia w `src/components/navigation/types.ts`)

```typescript
import type { LucideIcon } from "lucide-react"

/**
 * Konfiguracja pojedynczego elementu nawigacji
 */
export interface NavItemConfig {
  /** Ścieżka docelowa */
  href: string
  /** Etykieta wyświetlana w nawigacji */
  label: string
  /** Ikona z lucide-react */
  icon: LucideIcon
  /** Czy wymagana autoryzacja (domyślnie true) */
  requiresAuth?: boolean
}

/**
 * Predefiniowana konfiguracja głównych elementów nawigacji
 */
export const MAIN_NAV_ITEMS: NavItemConfig[] = [
  {
    href: "/flashcards",
    label: "Moje Fiszki",
    icon: "Library", // lucide-react
    requiresAuth: true,
  },
  {
    href: "/generate",
    label: "Generator AI",
    icon: "Sparkles", // lucide-react
    requiresAuth: true,
  },
  {
    href: "/generations",
    label: "Historia",
    icon: "History", // lucide-react
    requiresAuth: true,
  },
]

/**
 * Props dla głównego layoutu
 */
export interface AppShellLayoutProps {
  /** Tytuł strony */
  title?: string
}

/**
 * Props dla NavigationShell
 */
export interface NavigationShellProps {
  /** Zawartość strony */
  children: React.ReactNode
  /** Aktualna ścieżka URL */
  currentPath: string
  /** Email zalogowanego użytkownika */
  userEmail?: string
}

/**
 * Props dla Sidebar
 */
export interface SidebarProps {
  /** Aktualna ścieżka URL do podświetlenia aktywnego linku */
  currentPath: string
  /** Email zalogowanego użytkownika */
  userEmail?: string
  /** Callback wylogowania */
  onLogout: () => void
}

/**
 * Props dla BottomNav
 */
export interface BottomNavProps {
  /** Aktualna ścieżka URL */
  currentPath: string
}

/**
 * Props dla TopBar
 */
export interface TopBarProps {
  /** Email zalogowanego użytkownika */
  userEmail?: string
  /** Callback otwarcia menu użytkownika */
  onUserMenuOpen: () => void
}

/**
 * Props dla NavItem
 */
export interface NavItemProps {
  /** Ścieżka docelowa */
  href: string
  /** Ikona z lucide-react */
  icon: LucideIcon
  /** Etykieta tekstowa */
  label: string
  /** Czy element jest aktywny */
  isActive: boolean
  /** Czy wyświetlać etykietę (domyślnie true) */
  showLabel?: boolean
  /** Wariant wyświetlania */
  variant?: "sidebar" | "bottom-nav"
}

/**
 * Props dla UserMenu
 */
export interface UserMenuProps {
  /** Email użytkownika */
  email?: string
  /** Callback wylogowania */
  onLogout: () => void
  /** Czy menu jest rozwinięte */
  isOpen?: boolean
  /** Callback zmiany stanu menu */
  onOpenChange?: (open: boolean) => void
}

/**
 * Props dla ThemeToggle
 */
export interface ThemeToggleProps {
  /** Aktualny motyw */
  theme: "light" | "dark"
  /** Callback przełączenia motywu */
  onToggle: () => void
  /** Rozmiar przycisku */
  size?: "sm" | "default" | "lg"
}
```

### Typy kontekstu motywu (do utworzenia w `src/components/navigation/ThemeContext.tsx`)

```typescript
/**
 * Dostępne motywy
 */
export type Theme = "light" | "dark"

/**
 * Wartość kontekstu motywu
 */
export interface ThemeContextValue {
  /** Aktualny motyw */
  theme: Theme
  /** Funkcja ustawiająca motyw */
  setTheme: (theme: Theme) => void
  /** Funkcja przełączająca motyw */
  toggleTheme: () => void
}

/**
 * Props dla ThemeProvider
 */
export interface ThemeProviderProps {
  /** Komponenty dzieci */
  children: React.ReactNode
  /** Domyślny motyw (jeśli brak w localStorage) */
  defaultTheme?: Theme
  /** Klucz localStorage */
  storageKey?: string
}

/**
 * Stałe
 */
export const THEME_STORAGE_KEY = "10x-cards-theme"
export const DEFAULT_THEME: Theme = "light"
```

## 6. Zarządzanie stanem

### Custom Hook: `useTheme`

Hook do zarządzania stanem motywu z persystencją w localStorage:

```typescript
// src/components/navigation/hooks/useTheme.ts

interface UseThemeReturn {
  /** Aktualny motyw */
  theme: Theme
  /** Ustawienie konkretnego motywu */
  setTheme: (theme: Theme) => void
  /** Przełączenie motywu */
  toggleTheme: () => void
  /** Czy motyw został załadowany */
  isLoaded: boolean
}

export function useTheme(): UseThemeReturn
```

**Szczegóły implementacji**:
1. Inicjalizacja z localStorage lub preferencji systemowych (`prefers-color-scheme`)
2. Synchronizacja z klasą `dark` na elemencie `<html>`
3. Zapis do localStorage przy każdej zmianie
4. Obsługa SSR (hydration mismatch prevention)

### Custom Hook: `useMediaQuery`

Hook do wykrywania rozmiaru ekranu dla responsywności:

```typescript
// src/components/navigation/hooks/useMediaQuery.ts

interface UseMediaQueryReturn {
  /** Czy zapytanie jest spełnione */
  matches: boolean
  /** Czy już załadowane (po hydration) */
  isLoaded: boolean
}

export function useMediaQuery(query: string): UseMediaQueryReturn

// Predefiniowane breakpointy
export function useIsMobile(): boolean // < 768px
export function useIsDesktop(): boolean // >= 768px
```

### Custom Hook: `useAuth` (stub)

Hook do zarządzania sesją użytkownika (integracja z Supabase Auth):

```typescript
// src/components/navigation/hooks/useAuth.ts

interface UseAuthReturn {
  /** Zalogowany użytkownik */
  user: { email: string } | null
  /** Czy trwa ładowanie sesji */
  isLoading: boolean
  /** Funkcja wylogowania */
  logout: () => Promise<void>
}

export function useAuth(): UseAuthReturn
```

**Uwaga**: W MVP bez pełnej autoryzacji, hook może zwracać mock data lub być przygotowany na przyszłą integrację z Supabase Auth.

### ThemeProvider Context

```typescript
// src/components/navigation/ThemeContext.tsx

import { createContext, useContext, useEffect, useState } from "react"

const ThemeContext = createContext<ThemeContextValue | undefined>(undefined)

export function ThemeProvider({ 
  children, 
  defaultTheme = "light",
  storageKey = THEME_STORAGE_KEY 
}: ThemeProviderProps) {
  const [theme, setThemeState] = useState<Theme>(defaultTheme)
  const [isLoaded, setIsLoaded] = useState(false)

  useEffect(() => {
    // Ładowanie z localStorage
    const stored = localStorage.getItem(storageKey) as Theme | null
    if (stored && (stored === "light" || stored === "dark")) {
      setThemeState(stored)
    } else {
      // Fallback na preferencje systemowe
      const prefersDark = window.matchMedia("(prefers-color-scheme: dark)").matches
      setThemeState(prefersDark ? "dark" : "light")
    }
    setIsLoaded(true)
  }, [storageKey])

  useEffect(() => {
    // Synchronizacja z DOM
    const root = document.documentElement
    root.classList.toggle("dark", theme === "dark")
    localStorage.setItem(storageKey, theme)
  }, [theme, storageKey])

  const setTheme = (newTheme: Theme) => setThemeState(newTheme)
  const toggleTheme = () => setThemeState(prev => prev === "light" ? "dark" : "light")

  return (
    <ThemeContext.Provider value={{ theme, setTheme, toggleTheme }}>
      {children}
    </ThemeContext.Provider>
  )
}

export function useThemeContext(): ThemeContextValue {
  const context = useContext(ThemeContext)
  if (!context) {
    throw new Error("useThemeContext must be used within ThemeProvider")
  }
  return context
}
```

## 7. Integracja API

App Shell nie wykonuje bezpośrednich wywołań API do endpointów flashcards/generations. Główna integracja dotyczy:

### Supabase Auth (przyszła integracja)

**Wylogowanie**:
```typescript
async function logout(): Promise<void> {
  const { error } = await supabaseClient.auth.signOut()
  if (error) {
    console.error("Logout error:", error)
    throw new Error("Nie udało się wylogować")
  }
  // Przekierowanie do strony logowania
  window.location.href = "/auth/login"
}
```

**Pobieranie sesji**:
```typescript
async function getSession(): Promise<User | null> {
  const { data: { session }, error } = await supabaseClient.auth.getSession()
  if (error) {
    console.error("Session error:", error)
    return null
  }
  return session?.user ?? null
}
```

### AuthGuard Middleware

Rozszerzenie istniejącego middleware w `src/middleware/index.ts`:

```typescript
import { defineMiddleware } from 'astro:middleware'
import { supabaseClient } from '../db/supabase.client.ts'

const PROTECTED_ROUTES = ['/flashcards', '/generate', '/generations', '/settings']
const AUTH_ROUTES = ['/auth/login', '/auth/register']

export const onRequest = defineMiddleware(async (context, next) => {
  context.locals.supabase = supabaseClient

  const { pathname } = context.url
  const isProtectedRoute = PROTECTED_ROUTES.some(route => pathname.startsWith(route))
  const isAuthRoute = AUTH_ROUTES.some(route => pathname.startsWith(route))

  // Sprawdzenie sesji dla chronionych tras
  if (isProtectedRoute) {
    const { data: { session } } = await supabaseClient.auth.getSession()
    
    if (!session) {
      // Przekierowanie do logowania
      return context.redirect('/auth/login')
    }
    
    context.locals.user = session.user
  }

  // Przekierowanie zalogowanych z tras auth
  if (isAuthRoute) {
    const { data: { session } } = await supabaseClient.auth.getSession()
    
    if (session) {
      return context.redirect('/generate')
    }
  }

  return next()
})
```

## 8. Interakcje użytkownika

### Nawigacja

| Akcja użytkownika | Reakcja systemu |
|-------------------|-----------------|
| Kliknięcie linku w Sidebar/BottomNav | Nawigacja do wybranej strony, aktualizacja aktywnego elementu |
| Kliknięcie logo | Nawigacja do `/generate` (strona główna po zalogowaniu) |
| Użycie klawiszy Tab | Nawigacja fokusem między elementami nawigacji |
| Użycie Enter/Space na linku | Aktywacja nawigacji |

### Menu użytkownika

| Akcja użytkownika | Reakcja systemu |
|-------------------|-----------------|
| Kliknięcie avatara/email w Sidebar | Otwarcie Popover z menu użytkownika |
| Kliknięcie ikony użytkownika w TopBar (mobile) | Otwarcie Drawer/Popover z menu |
| Kliknięcie "Ustawienia" | Nawigacja do `/settings`, zamknięcie menu |
| Kliknięcie "Wyloguj" | Wywołanie logout, przekierowanie do `/auth/login` |
| Kliknięcie poza menu | Zamknięcie menu |
| Naciśnięcie Escape | Zamknięcie menu |

### Przełącznik motywu

| Akcja użytkownika | Reakcja systemu |
|-------------------|-----------------|
| Kliknięcie ThemeToggle | Przełączenie motywu (light ↔ dark), zapis do localStorage |
| Ikona zmienia się | Sun → Moon (ciemny) lub Moon → Sun (jasny) |
| Strona odświeżona | Załadowanie zapisanego motywu z localStorage |
| Brak zapisanego motywu | Użycie preferencji systemowych |

### Responsywność

| Szerokość ekranu | Wyświetlany wariant |
|------------------|---------------------|
| < 768px (mobile) | TopBar + BottomNav, zawartość w 100% szerokości |
| >= 768px (desktop) | Sidebar (256px) + zawartość z margin-left |
| Zmiana rozmiaru okna | Płynne przełączenie między wariantami |

## 9. Warunki i walidacja

### Warunki nawigacji

| Warunek | Komponent | Wpływ na UI |
|---------|-----------|-------------|
| `currentPath === item.href` | `NavItem` | Element podświetlony jako aktywny (background, kolor tekstu) |
| `requiresAuth && !user` | Middleware | Przekierowanie do `/auth/login` przed renderowaniem |
| `isAuthRoute && user` | Middleware | Przekierowanie do `/generate` (użytkownik już zalogowany) |

### Warunki motywu

| Warunek | Komponent | Wpływ na UI |
|---------|-----------|-------------|
| `theme === "dark"` | ThemeProvider | Klasa `dark` na `<html>`, zmienne CSS dark mode aktywne |
| `theme === "light"` | ThemeProvider | Brak klasy `dark`, zmienne CSS light mode aktywne |
| `localStorage["10x-cards-theme"]` istnieje | useTheme | Użycie zapisanego motywu |
| Brak zapisanego motywu | useTheme | Fallback na `prefers-color-scheme` |

### Warunki responsywności

| Warunek | Komponent | Wpływ na UI |
|---------|-----------|-------------|
| `window.innerWidth < 768` | NavigationShell | Renderowanie MobileLayout (TopBar + BottomNav) |
| `window.innerWidth >= 768` | NavigationShell | Renderowanie DesktopLayout (Sidebar) |
| SSR (brak window) | NavigationShell | Renderowanie obu wariantów z odpowiednimi klasami CSS (hidden/shown) |

## 10. Obsługa błędów

### Błędy autoryzacji

| Scenariusz | Obsługa |
|------------|---------|
| Sesja wygasła podczas korzystania | Wyświetlenie toast "Sesja wygasła", przekierowanie do logowania |
| Błąd podczas wylogowania | Wyświetlenie toast błędu, opcja ponowienia |
| Brak połączenia podczas sprawdzania sesji | Wyświetlenie toast z informacją o braku połączenia |

### Błędy nawigacji

| Scenariusz | Obsługa |
|------------|---------|
| Próba nawigacji do nieistniejącej strony | Strona 404 (do utworzenia) |
| Błąd ładowania strony | Error boundary z komunikatem i przyciskiem odświeżenia |

### Błędy motywu

| Scenariusz | Obsługa |
|------------|---------|
| Błąd odczytu z localStorage | Fallback na preferencje systemowe |
| Błąd zapisu do localStorage | Silent fail, motyw działa w pamięci |

### Hydration mismatch prevention

Dla uniknięcia błędów hydratacji przy SSR:

```typescript
// Renderowanie skeleton/placeholder przed załadowaniem stanu client-side
function NavigationShell({ children, currentPath, userEmail }: NavigationShellProps) {
  const isDesktop = useIsDesktop()
  const { isLoaded } = useTheme()

  // Podczas SSR i przed hydracją renderuj oba warianty z CSS hidden
  if (!isLoaded) {
    return (
      <>
        <div className="hidden md:flex">
          {/* Desktop layout */}
        </div>
        <div className="flex md:hidden">
          {/* Mobile layout */}
        </div>
        <main>{children}</main>
      </>
    )
  }

  return isDesktop ? (
    <DesktopLayout currentPath={currentPath} userEmail={userEmail}>
      {children}
    </DesktopLayout>
  ) : (
    <MobileLayout currentPath={currentPath} userEmail={userEmail}>
      {children}
    </MobileLayout>
  )
}
```

## 11. Kroki implementacji

### Faza 1: Przygotowanie struktury (1-2h)

1. Utworzenie struktury katalogów:
   - `src/components/navigation/`
   - `src/components/navigation/hooks/`
   - `src/components/navigation/types.ts`

2. Zdefiniowanie typów w `src/components/navigation/types.ts`

3. Instalacja/weryfikacja komponentów Shadcn/ui:
   - `Popover` (dla UserMenu)
   - `DropdownMenu` (alternatywa dla UserMenu)
   - `Tooltip` (dla ThemeToggle)
   - Sprawdzenie dostępności `Button`

4. Instalacja ikon lucide-react (jeśli brak):
   - `Library`, `Sparkles`, `History`, `Sun`, `Moon`, `Settings`, `LogOut`, `Menu`, `User`

### Faza 2: Implementacja hooków (2-3h)

5. Implementacja `useMediaQuery` hook:
   - Obsługa SSR (matchMedia undefined)
   - Listener na zmiany rozmiaru
   - Cleanup przy unmount

6. Implementacja `useTheme` hook:
   - Ładowanie z localStorage
   - Fallback na preferencje systemowe
   - Synchronizacja z DOM

7. Implementacja `ThemeProvider` context:
   - Provider z kontekstem
   - Hook `useThemeContext`

8. Implementacja `useAuth` hook (stub dla MVP):
   - Mock user data lub integracja z Supabase
   - Funkcja logout

### Faza 3: Implementacja komponentów prezentacyjnych (3-4h)

9. Implementacja `ThemeToggle`:
   - Przycisk z ikoną Sun/Moon
   - Animacja przejścia ikon
   - Tooltip z opisem

10. Implementacja `NavItem`:
    - Link z ikoną i etykietą
    - Warianty: sidebar (pionowy) i bottom-nav (ikona nad etykietą)
    - Stan aktywny

11. Implementacja `UserMenu`:
    - Trigger z avatarem/inicjałami i emailem
    - Popover z opcjami (Ustawienia, Wyloguj)
    - Obsługa keyboard navigation

12. Implementacja `SidebarHeader`:
    - Logo i nazwa aplikacji
    - Link do strony głównej

### Faza 4: Implementacja layoutów (2-3h)

13. Implementacja `Sidebar`:
    - Fixed position, pełna wysokość
    - Sekcje: header, nav, footer
    - Stylowanie zgodne z design system

14. Implementacja `TopBar`:
    - Fixed position na górze (mobile)
    - Logo i trigger menu użytkownika

15. Implementacja `BottomNav`:
    - Fixed position na dole (mobile)
    - 3 główne linki w flex layout

16. Implementacja `NavigationShell`:
    - Wykrywanie rozmiaru ekranu
    - Warunkowe renderowanie Desktop/Mobile layout
    - Obsługa hydration mismatch

### Faza 5: Integracja z Astro (2-3h)

17. Utworzenie `AppShellLayout.astro`:
    - Import globalnych stylów
    - Renderowanie NavigationShell z `client:load`
    - Slot dla zawartości strony
    - Toaster komponent

18. Aktualizacja istniejących stron:
    - `flashcards.astro` - użycie AppShellLayout
    - `generate.astro` - użycie AppShellLayout
    - Utworzenie stron `generations.astro`, `settings.astro` (stub)

19. Rozszerzenie middleware o AuthGuard:
    - Sprawdzanie sesji dla chronionych tras
    - Przekierowania

20. Aktualizacja `global.css`:
    - Dodanie zmiennych CSS dla sidebar
    - Stylowanie nawigacji mobile

### Faza 6: Responsywność i dostępność (2-3h)

21. Implementacja CSS dla responsive breakpoints:
    - Ukrywanie Sidebar na mobile
    - Ukrywanie TopBar/BottomNav na desktop
    - Dostosowanie margin/padding dla main content

22. Implementacja dostępności:
    - ARIA labels dla nawigacji
    - Focus management w menu
    - Keyboard navigation
    - Skip link do main content

23. Testy responsywności:
    - Chrome DevTools
    - Różne urządzenia

### Faza 7: Testowanie i optymalizacja (1-2h)

24. Testy integracyjne:
    - Nawigacja między stronami
    - Przełączanie motywu
    - Menu użytkownika

25. Optymalizacja wydajności:
    - React.memo dla NavItem
    - useCallback dla handlerów
    - Lazy loading komponentów (jeśli potrzebne)

26. Testy edge cases:
    - Bardzo długi email w UserMenu
    - Szybkie przełączanie motywu
    - Zmiana rozmiaru okna podczas otwartego menu

### Faza 8: Finalizacja (1h)

27. Code review i refaktoring

28. Dokumentacja komponentów (JSDoc)

29. Aktualizacja README z instrukcjami użycia layoutu
