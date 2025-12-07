# Plan implementacji widoku Historia Generacji

## 1. Przegląd

Widok "Historia Generacji" (`/generations`) to read-only widok audytowy, który umożliwia zalogowanemu użytkownikowi przeglądanie historii wszystkich operacji generowania fiszek przez AI. Widok prezentuje listę historycznych generacji w formie tabeli z informacjami o dacie, długości tekstu źródłowego, liczbie wygenerowanych fiszek oraz statystykach akceptacji.

Główne cele widoku:
- Umożliwienie wglądu w historyczne operacje generowania
- Prezentacja statystyk skuteczności generowania (ile fiszek zaakceptowano)
- Nawigacja paginowana dla dużej ilości danych

## 2. Routing widoku

- **Ścieżka:** `/generations`
- **Plik Astro:** `src/pages/generations.astro` (już istnieje - wymaga aktualizacji)
- **Komponent React:** `src/components/generations/GenerationsView.tsx`
- **Autoryzacja:** Widok dostępny tylko dla zalogowanych użytkowników (obsługiwane przez middleware)

## 3. Struktura komponentów

```
generations.astro
└── GenerationsView (client:load)
    ├── GenerationsHeader
    ├── GenerationsTable
    │   ├── GenerationsTableHeader
    │   └── GenerationsTableRow (multiple)
    ├── Pagination
    ├── LoadingState
    ├── EmptyState
    └── ErrorState
```

## 4. Szczegóły komponentów

### GenerationsView

- **Opis:** Główny komponent kontenerowy widoku historii generacji. Zarządza stanem całej listy, obsługuje pobieranie danych z API, koordynuje wyświetlanie stanów ładowania, błędów i pustej listy.

- **Główne elementy:**
  - `GenerationsHeader` - nagłówek widoku z tytułem
  - `GenerationsTable` - tabela z listą generacji (gdy są dane)
  - `Pagination` - kontrolki nawigacji między stronami
  - `LoadingState` - skeleton UI podczas ładowania
  - `EmptyState` - komunikat gdy brak generacji
  - `ErrorState` - komunikat błędu z możliwością ponowienia

- **Obsługiwane interakcje:**
  - Zmiana strony (poprzednia/następna/konkretna)
  - Zmiana liczby elementów na stronie
  - Zmiana kolejności sortowania (asc/desc)
  - Ponowienie próby po błędzie

- **Obsługiwana walidacja:** Brak (widok read-only)

- **Typy:**
  - `GenerationListItemViewModel` (lista generacji)
  - `PaginationState` (stan paginacji)

- **Propsy:** Brak (komponent top-level)

### GenerationsHeader

- **Opis:** Nagłówek widoku z tytułem i opisem. Prosty komponent prezentacyjny.

- **Główne elementy:**
  - `<header>` z tytułem "Historia generacji"
  - `<p>` z tekstem opisowym

- **Obsługiwane interakcje:** Brak

- **Obsługiwana walidacja:** Brak

- **Typy:** Brak

- **Propsy:** Brak

### GenerationsTable

- **Opis:** Tabela prezentująca listę generacji. Wykorzystuje komponenty Shadcn/ui Table dla spójnego wyglądu i dostępności.

- **Główne elementy:**
  - `<Table>` - kontener tabeli
  - `<TableHeader>` z kolumnami: Data, Długość tekstu, Wygenerowano, Zaakceptowano, Skuteczność
  - `<TableBody>` z wierszami `GenerationsTableRow`

- **Obsługiwane interakcje:**
  - Kliknięcie w nagłówek kolumny "Data" zmienia kolejność sortowania

- **Obsługiwana walidacja:** Brak

- **Typy:**
  - `GenerationListItemViewModel[]`

- **Propsy:**
  - `generations: GenerationListItemViewModel[]` - lista generacji do wyświetlenia
  - `sortOrder: "asc" | "desc"` - aktualna kolejność sortowania
  - `onSortOrderChange: (order: "asc" | "desc") => void` - callback zmiany sortowania

### GenerationsTableRow

- **Opis:** Pojedynczy wiersz tabeli reprezentujący jedną generację. Wyświetla wszystkie dane generacji w czytelnym formacie.

- **Główne elementy:**
  - `<TableRow>` - wiersz tabeli
  - `<TableCell>` - komórki z danymi:
    - Data (sformatowana: DD.MM.YYYY HH:mm)
    - Długość tekstu źródłowego (z formatowaniem liczbowym)
    - Liczba wygenerowanych fiszek
    - Liczba zaakceptowanych fiszek (suma edited + unedited)
    - Skuteczność (procent zaakceptowanych)

- **Obsługiwane interakcje:** Brak (read-only)

- **Obsługiwana walidacja:** Brak

- **Typy:**
  - `GenerationListItemViewModel`

- **Propsy:**
  - `generation: GenerationListItemViewModel` - dane generacji

### Pagination

- **Opis:** Komponent nawigacji między stronami. Wyświetla informację o aktualnej stronie, przyciski nawigacyjne oraz opcję zmiany liczby elementów na stronie.

- **Główne elementy:**
  - Tekst informacyjny: "Strona X z Y (łącznie Z rekordów)"
  - `<Button>` - przycisk "Poprzednia"
  - `<Button>` - przycisk "Następna"
  - `<Select>` - wybór liczby elementów na stronie (10, 20, 50)

- **Obsługiwane interakcje:**
  - Kliknięcie "Poprzednia" - przejście do poprzedniej strony
  - Kliknięcie "Następna" - przejście do następnej strony
  - Zmiana wartości select - zmiana limitu elementów

- **Obsługiwana walidacja:**
  - Przycisk "Poprzednia" disabled gdy `page === 1`
  - Przycisk "Następna" disabled gdy `page >= totalPages`

- **Typy:**
  - `PaginationState`

- **Propsy:**
  - `page: number` - aktualna strona
  - `limit: number` - elementy na stronie
  - `total: number` - całkowita liczba rekordów
  - `onPageChange: (page: number) => void` - callback zmiany strony
  - `onLimitChange: (limit: number) => void` - callback zmiany limitu
  - `isLoading?: boolean` - czy trwa ładowanie (disabled przyciski)

### LoadingState

- **Opis:** Komponent wyświetlający skeleton UI podczas ładowania danych. Imituje strukturę tabeli dla lepszego UX.

- **Główne elementy:**
  - Skeleton dla nagłówka tabeli
  - 5 skeleton wierszy imitujących dane

- **Obsługiwane interakcje:** Brak

- **Obsługiwana walidacja:** Brak

- **Typy:** Brak

- **Propsy:**
  - `rowCount?: number` - liczba skeleton wierszy (domyślnie 5)

### EmptyState

- **Opis:** Komponent wyświetlany gdy użytkownik nie ma żadnych generacji. Zawiera ilustrację i komunikat zachęcający do wygenerowania fiszek.

- **Główne elementy:**
  - Ikona (History lub Clock)
  - Nagłówek: "Brak historii generacji"
  - Tekst opisowy
  - `<Button>` - link do `/generate`

- **Obsługiwane interakcje:**
  - Kliknięcie przycisku "Generuj fiszki" - nawigacja do `/generate`

- **Obsługiwana walidacja:** Brak

- **Typy:** Brak

- **Propsy:** Brak

### ErrorState

- **Opis:** Komponent wyświetlany po wystąpieniu błędu podczas pobierania danych. Zawiera komunikat błędu i przycisk ponowienia próby.

- **Główne elementy:**
  - Ikona AlertCircle
  - Nagłówek: "Nie udało się załadować historii"
  - Tekst błędu
  - `<Button>` - "Spróbuj ponownie"

- **Obsługiwane interakcje:**
  - Kliknięcie "Spróbuj ponownie" - ponowne pobranie danych

- **Obsługiwana walidacja:** Brak

- **Typy:** Brak

- **Propsy:**
  - `error: string` - treść komunikatu błędu
  - `onRetry: () => void` - callback ponowienia próby

## 5. Typy

### Nowe typy dla widoku (src/components/generations/types.ts)

```typescript
import type { GenerationSummaryDto } from "../../types";

/**
 * ViewModel dla pojedynczej generacji w widoku listy.
 * Rozszerza dane z API o przetworzone pola dla prezentacji.
 */
export interface GenerationListItemViewModel {
  /** ID generacji */
  id: string;
  /** Liczba wygenerowanych fiszek */
  generatedCount: number;
  /** Liczba zaakceptowanych fiszek (edytowanych) */
  acceptedEditedCount: number;
  /** Liczba zaakceptowanych fiszek (bez edycji) */
  acceptedUneditedCount: number;
  /** Całkowita liczba zaakceptowanych fiszek */
  totalAcceptedCount: number;
  /** Długość tekstu źródłowego (w znakach) */
  sourceTextLength: number;
  /** Skuteczność (procent zaakceptowanych) */
  acceptanceRate: number;
  /** Data utworzenia */
  createdAt: Date;
  /** Data aktualizacji */
  updatedAt: Date;
}

/**
 * Stan paginacji widoku
 */
export interface PaginationState {
  /** Aktualna strona (1-indexed) */
  page: number;
  /** Liczba elementów na stronie */
  limit: number;
  /** Całkowita liczba rekordów */
  total: number;
  /** Całkowita liczba stron */
  totalPages: number;
}

/**
 * Stan widoku historii generacji
 */
export interface GenerationsViewState {
  /** Lista generacji */
  generations: GenerationListItemViewModel[];
  /** Stan paginacji */
  pagination: PaginationState;
  /** Kolejność sortowania */
  sortOrder: "asc" | "desc";
  /** Stan ładowania */
  isLoading: boolean;
  /** Błąd (jeśli wystąpił) */
  error: string | null;
}

/**
 * Parametry zapytania do API
 */
export interface GenerationsQueryParams {
  page: number;
  limit: number;
  order: "asc" | "desc";
}

// =====================================
// Funkcje mapujące
// =====================================

/**
 * Mapuje GenerationSummaryDto na GenerationListItemViewModel
 */
export function mapGenerationDtoToViewModel(
  dto: GenerationSummaryDto
): GenerationListItemViewModel {
  const acceptedEditedCount = dto.accepted_edited_count ?? 0;
  const acceptedUneditedCount = dto.accepted_unedited_count ?? 0;
  const totalAcceptedCount = acceptedEditedCount + acceptedUneditedCount;
  const generatedCount = dto.generated_count ?? 0;
  const acceptanceRate = generatedCount > 0 
    ? Math.round((totalAcceptedCount / generatedCount) * 100) 
    : 0;

  return {
    id: dto.id,
    generatedCount,
    acceptedEditedCount,
    acceptedUneditedCount,
    totalAcceptedCount,
    sourceTextLength: dto.source_text_length ?? 0,
    acceptanceRate,
    createdAt: new Date(dto.created_at),
    updatedAt: new Date(dto.updated_at),
  };
}

// =====================================
// Props dla komponentów
// =====================================

export interface GenerationsTableProps {
  generations: GenerationListItemViewModel[];
  sortOrder: "asc" | "desc";
  onSortOrderChange: (order: "asc" | "desc") => void;
}

export interface GenerationsTableRowProps {
  generation: GenerationListItemViewModel;
}

export interface PaginationProps {
  page: number;
  limit: number;
  total: number;
  onPageChange: (page: number) => void;
  onLimitChange: (limit: number) => void;
  isLoading?: boolean;
}

export interface LoadingStateProps {
  rowCount?: number;
}

export interface ErrorStateProps {
  error: string;
  onRetry: () => void;
}

// =====================================
// Typy dla hooka
// =====================================

export interface UseGenerationsReturn {
  // Stan
  generations: GenerationListItemViewModel[];
  pagination: PaginationState;
  sortOrder: "asc" | "desc";
  isLoading: boolean;
  error: string | null;

  // Akcje
  setPage: (page: number) => void;
  setLimit: (limit: number) => void;
  setSortOrder: (order: "asc" | "desc") => void;
  refresh: () => Promise<void>;
  clearError: () => void;
}
```

### Wykorzystywane typy z src/types.ts

```typescript
// Już zdefiniowane w src/types.ts:

type GenerationSummaryDto = Pick<
  GenerationRow,
  | "id"
  | "generated_count"
  | "accepted_edited_count"
  | "accepted_unedited_count"
  | "source_text_length"
  | "created_at"
  | "updated_at"
>

type GenerationListResponseDto = {
  data: GenerationSummaryDto[]
  pagination: PaginationMetaDto
}

type GenerationListQueryDto = {
  page?: number
  limit?: number
  order?: "asc" | "desc"
}

type PaginationMetaDto = {
  page: number
  limit: number
  total: number
}
```

## 6. Zarządzanie stanem

### Custom Hook: useGenerations

Hook `useGenerations` zarządza całym stanem widoku historii generacji:

```typescript
// src/components/generations/hooks/useGenerations.ts

export function useGenerations(): UseGenerationsReturn {
  // Stan listy
  const [generations, setGenerations] = useState<GenerationListItemViewModel[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Stan paginacji i sortowania
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(20);
  const [total, setTotal] = useState(0);
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("desc");

  // Obliczane wartości
  const totalPages = Math.ceil(total / limit);
  const pagination: PaginationState = { page, limit, total, totalPages };

  // Funkcja pobierania danych
  const fetchGenerations = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    try {
      const params = new URLSearchParams({
        page: page.toString(),
        limit: limit.toString(),
        order: sortOrder,
      });

      const response = await fetch(`/api/generations?${params}`);
      
      if (!response.ok) {
        // Obsługa błędów HTTP
      }

      const data: GenerationListResponseDto = await response.json();
      const viewModels = data.data.map(mapGenerationDtoToViewModel);
      
      setGenerations(viewModels);
      setTotal(data.pagination.total);
    } catch (err) {
      setError(/* error message */);
    } finally {
      setIsLoading(false);
    }
  }, [page, limit, sortOrder]);

  // Efekt pobierania przy zmianie parametrów
  useEffect(() => {
    fetchGenerations();
  }, [fetchGenerations]);

  // Resetowanie strony przy zmianie limitu
  const handleLimitChange = useCallback((newLimit: number) => {
    setLimit(newLimit);
    setPage(1);
  }, []);

  return {
    generations,
    pagination,
    sortOrder,
    isLoading,
    error,
    setPage,
    setLimit: handleLimitChange,
    setSortOrder,
    refresh: fetchGenerations,
    clearError: () => setError(null),
  };
}
```

### Logika stanu:

1. **Inicjalizacja:** Hook automatycznie pobiera pierwszą stronę danych przy montowaniu komponentu
2. **Zmiana strony:** `setPage` aktualizuje stan i wyzwala ponowne pobranie
3. **Zmiana limitu:** `setLimit` resetuje stronę do 1 i pobiera dane
4. **Zmiana sortowania:** `setSortOrder` pobiera dane z nową kolejnością
5. **Odświeżenie:** `refresh` ponownie pobiera aktualne dane
6. **Błędy:** `clearError` czyści stan błędu przed ponowną próbą

## 7. Integracja API

### Endpoint

- **URL:** `GET /api/generations`
- **Metoda:** GET
- **Autoryzacja:** Wymagana (obsługiwana przez middleware)

### Parametry zapytania

| Parametr | Typ | Domyślnie | Opis |
|----------|-----|-----------|------|
| `page` | number | 1 | Numer strony (1-indexed) |
| `limit` | number | 10 | Liczba elementów na stronie (max 100) |
| `order` | "asc" \| "desc" | "desc" | Kolejność sortowania wg daty |

### Typ żądania

```typescript
// Query params przekazywane jako URLSearchParams
interface GenerationListQueryDto {
  page?: number;
  limit?: number;
  order?: "asc" | "desc";
}
```

### Typ odpowiedzi

```typescript
// Odpowiedź 200 OK
interface GenerationListResponseDto {
  data: GenerationSummaryDto[];
  pagination: PaginationMetaDto;
}

interface GenerationSummaryDto {
  id: string;
  generated_count: number | null;
  accepted_edited_count: number | null;
  accepted_unedited_count: number | null;
  source_text_length: number | null;
  created_at: string; // ISO date string
  updated_at: string; // ISO date string
}

interface PaginationMetaDto {
  page: number;
  limit: number;
  total: number;
}
```

### Obsługa błędów API

| Status | Opis | Obsługa w UI |
|--------|------|--------------|
| 400 | Błąd walidacji parametrów | Wyświetl komunikat "Nieprawidłowe parametry" |
| 401 | Brak autoryzacji | Redirect do `/auth/login` |
| 500 | Błąd serwera | Wyświetl komunikat "Błąd serwera" z przyciskiem retry |

## 8. Interakcje użytkownika

### Nawigacja między stronami

| Akcja | Element UI | Rezultat |
|-------|------------|----------|
| Kliknięcie "Poprzednia" | Button | `setPage(page - 1)`, pobranie poprzedniej strony |
| Kliknięcie "Następna" | Button | `setPage(page + 1)`, pobranie następnej strony |

### Zmiana liczby elementów na stronie

| Akcja | Element UI | Rezultat |
|-------|------------|----------|
| Wybór z listy (10/20/50) | Select | `setLimit(value)`, reset do strony 1, pobranie danych |

### Zmiana kolejności sortowania

| Akcja | Element UI | Rezultat |
|-------|------------|----------|
| Kliknięcie nagłówka "Data" | TableHeader | Toggle `sortOrder`, pobranie danych z nową kolejnością |

### Obsługa błędów

| Akcja | Element UI | Rezultat |
|-------|------------|----------|
| Kliknięcie "Spróbuj ponownie" | Button | `clearError()`, `refresh()` |

### Nawigacja do generatora

| Akcja | Element UI | Rezultat |
|-------|------------|----------|
| Kliknięcie "Generuj fiszki" (empty state) | Button/Link | Nawigacja do `/generate` |

## 9. Warunki i walidacja

### Walidacja parametrów paginacji (po stronie klienta)

| Warunek | Komponent | Efekt |
|---------|-----------|-------|
| `page < 1` | useGenerations | Automatyczna korekta na 1 |
| `page > totalPages` | Pagination | Przycisk "Następna" disabled |
| `page === 1` | Pagination | Przycisk "Poprzednia" disabled |
| `limit` spoza dozwolonych | useGenerations | Użycie domyślnej wartości 20 |

### Walidacja przez API

| Warunek | Odpowiedź API | Obsługa w UI |
|---------|---------------|--------------|
| `page` nie jest liczbą | 400 + błędy walidacji | Wyświetlenie ErrorState |
| `limit` > 100 | 400 + błędy walidacji | Wyświetlenie ErrorState |
| `order` nieprawidłowy | 400 + błędy walidacji | Wyświetlenie ErrorState |

### Stany interfejsu

| Stan | Warunek | Wyświetlany komponent |
|------|---------|----------------------|
| Loading | `isLoading && generations.length === 0` | LoadingState |
| Error | `error && generations.length === 0` | ErrorState |
| Empty | `!isLoading && generations.length === 0` | EmptyState |
| Data | `generations.length > 0` | GenerationsTable + Pagination |

## 10. Obsługa błędów

### Błędy sieciowe

```typescript
// W hooku useGenerations
try {
  const response = await fetch(`/api/generations?${params}`);
  // ...
} catch (err) {
  if (err instanceof TypeError) {
    setError("Brak połączenia z serwerem. Sprawdź połączenie internetowe.");
  } else {
    setError("Wystąpił nieoczekiwany błąd. Spróbuj ponownie.");
  }
}
```

### Błędy HTTP

```typescript
if (!response.ok) {
  if (response.status === 401) {
    // Sesja wygasła - redirect do logowania
    window.location.href = "/auth/login";
    return;
  }
  
  if (response.status === 400) {
    const errorData = await response.json().catch(() => ({}));
    setError(errorData.message || "Nieprawidłowe parametry zapytania.");
    return;
  }
  
  if (response.status >= 500) {
    setError("Błąd serwera. Spróbuj ponownie za chwilę.");
    return;
  }
  
  setError(`Nieoczekiwany błąd (${response.status})`);
}
```

### Scenariusze brzegowe

| Scenariusz | Obsługa |
|------------|---------|
| Pusta lista generacji | Wyświetlenie EmptyState z CTA |
| Wartości null w danych | Mapowanie na 0 w funkcji `mapGenerationDtoToViewModel` |
| Błąd parsowania JSON | Wyświetlenie generycznego komunikatu błędu |
| Timeout żądania | Wyświetlenie komunikatu o timeout z opcją retry |

## 11. Kroki implementacji

### Krok 1: Utworzenie struktury katalogów

```
src/components/generations/
├── hooks/
│   └── useGenerations.ts
├── index.ts
├── types.ts
├── GenerationsView.tsx
├── GenerationsHeader.tsx
├── GenerationsTable.tsx
├── GenerationsTableRow.tsx
├── Pagination.tsx
├── LoadingState.tsx
├── EmptyState.tsx
└── ErrorState.tsx
```

### Krok 2: Implementacja typów i funkcji mapujących

1. Utworzyć plik `src/components/generations/types.ts`
2. Zdefiniować interfejsy: `GenerationListItemViewModel`, `PaginationState`, `GenerationsViewState`
3. Zaimplementować funkcję `mapGenerationDtoToViewModel`
4. Zdefiniować interfejsy props dla wszystkich komponentów

### Krok 3: Implementacja hooka useGenerations

1. Utworzyć plik `src/components/generations/hooks/useGenerations.ts`
2. Zaimplementować logikę pobierania danych z API
3. Zaimplementować obsługę paginacji i sortowania
4. Zaimplementować obsługę błędów
5. Utworzyć plik `src/components/generations/hooks/index.ts` z eksportem

### Krok 4: Dodanie komponentu Table z Shadcn/ui

1. Uruchomić komendę: `npx shadcn@latest add table`
2. Zweryfikować, że komponenty zostały dodane do `src/components/ui/`

### Krok 5: Implementacja komponentów prezentacyjnych

1. **LoadingState** - skeleton UI dla tabeli
2. **EmptyState** - komunikat o braku generacji z CTA
3. **ErrorState** - komunikat błędu z przyciskiem retry
4. **GenerationsHeader** - nagłówek widoku
5. **GenerationsTableRow** - pojedynczy wiersz tabeli
6. **GenerationsTable** - tabela z nagłówkiem i wierszami
7. **Pagination** - kontrolki nawigacji

### Krok 6: Implementacja głównego komponentu GenerationsView

1. Utworzyć `GenerationsView.tsx`
2. Użyć hooka `useGenerations`
3. Zaimplementować warunkowe renderowanie (loading/error/empty/data)
4. Podłączyć wszystkie komponenty potomne

### Krok 7: Utworzenie pliku index.ts z eksportami

```typescript
// src/components/generations/index.ts
export { GenerationsView } from "./GenerationsView";
```

### Krok 8: Aktualizacja strony Astro

1. Zaktualizować `src/pages/generations.astro`
2. Zaimportować i użyć `GenerationsView` z dyrektywą `client:load`
3. Usunąć placeholder content

### Krok 9: Testowanie

1. Sprawdzić poprawność pobierania danych
2. Przetestować paginację (zmiana strony, zmiana limitu)
3. Przetestować sortowanie
4. Sprawdzić obsługę błędów (symulacja błędu sieciowego)
5. Zweryfikować responsywność na różnych urządzeniach
6. Sprawdzić dostępność (nawigacja klawiaturą, czytniki ekranu)

### Krok 10: Refaktoryzacja i optymalizacja

1. Dodać memoizację komponentów gdzie potrzeba (`React.memo`)
2. Upewnić się, że nie ma zbędnych re-renderów
3. Dodać atrybuty aria dla dostępności
4. Zweryfikować spójność z resztą aplikacji (style, konwencje)
