# Plan implementacji widoku Moje Fiszki

## 1. Przegląd

Widok "Moje Fiszki" jest centralnym dashboardem aplikacji 10x-cards, umożliwiającym użytkownikowi przeglądanie, wyszukiwanie i zarządzanie całą kolekcją fiszek edukacyjnych. Widok realizuje funkcjonalności ręcznego tworzenia nowych fiszek, edycji istniejących oraz ich usuwania.

Widok implementuje historyjki użytkownika:
- **US-005**: Edycja fiszek utworzonych ręcznie i generowanych przez AI
- **US-006**: Usuwanie fiszek
- **US-007**: Ręczne tworzenie fiszek

Kluczowe cechy UX widoku:
- Infinite Scroll dla wydajnego ładowania dużych kolekcji
- Optimistic UI przy usuwaniu (natychmiastowa reakcja UI z możliwością rollbacku)
- Pełna obsługa klawiatury dla dostępności
- Responsywny design (Modal na desktop, Drawer na mobile dla edycji)

## 2. Routing widoku

- **Ścieżka**: `/flashcards`
- **Plik**: `src/pages/flashcards.astro`
- **Dostęp**: Wymaga autoryzacji (zalogowany użytkownik)
- **Prerender**: `false` (dynamiczne renderowanie)

## 3. Struktura komponentów

```
FlashcardsPage (Astro)
└── Layout
    └── FlashcardsView (React, client:load)
        ├── FlashcardsHeader
        │   ├── PageTitle
        │   └── CreateFlashcardButton
        ├── FlashcardList
        │   ├── FlashcardItem[]
        │   │   ├── FlashcardContent
        │   │   │   ├── FrontPreview
        │   │   │   └── BackPreview
        │   │   └── FlashcardItemActions
        │   └── LoadMoreTrigger (IntersectionObserver)
        ├── EmptyState (warunkowy - gdy brak fiszek)
        ├── LoadingState (warunkowy - podczas ładowania)
        ├── CreateFlashcardDialog
        │   └── FlashcardForm
        ├── EditFlashcardDialog (Desktop) / EditFlashcardDrawer (Mobile)
        │   └── FlashcardForm
        ├── DeleteConfirmDialog
        └── ErrorToast (warunkowy - przy błędach)
```

## 4. Szczegóły komponentów

### FlashcardsView

- **Opis**: Główny komponent kontenerowy widoku "Moje Fiszki". Zarządza stanem całej listy fiszek, obsługuje operacje CRUD oraz koordynuje wyświetlanie modali i dialogów. Jest odpowiedzialny za inicjalizację pobierania danych oraz zarządzanie infinite scroll.
- **Główne elementy**:
  - `<main>` z klasami layoutu (`max-w-4xl mx-auto px-4 py-6`)
  - Warunkowe renderowanie: `FlashcardsHeader`, `FlashcardList`, `EmptyState`, `LoadingState`
  - Modalne komponenty: `CreateFlashcardDialog`, `EditFlashcardDialog`, `DeleteConfirmDialog`
- **Obsługiwane interakcje**:
  - Inicjalizacja pobierania fiszek przy montowaniu
  - Obsługa otwarcia/zamknięcia modali
  - Przekazywanie callbacków CRUD do komponentów dzieci
- **Obsługiwana walidacja**: Brak bezpośredniej - delegowana do formularzy
- **Typy**:
  - `FlashcardsViewState`
  - `FlashcardListItemViewModel[]`
- **Propsy**: Brak (komponent najwyższego poziomu)

### FlashcardsHeader

- **Opis**: Nagłówek widoku zawierający tytuł strony oraz przycisk tworzenia nowej fiszki. Zapewnia główne CTA widoku.
- **Główne elementy**:
  - `<header>` z flexbox layout
  - `<h1>` z tytułem "Moje Fiszki"
  - `CreateFlashcardButton`
- **Obsługiwane interakcje**:
  - `onCreateClick` - otwarcie dialogu tworzenia
- **Obsługiwana walidacja**: Brak
- **Typy**: `FlashcardsHeaderProps`
- **Propsy**:
  - `onCreateClick: () => void`

### CreateFlashcardButton

- **Opis**: Przycisk otwierający dialog tworzenia nowej fiszki. Wyświetla ikonę plus i tekst "Dodaj fiszkę".
- **Główne elementy**:
  - Shadcn/ui `<Button>` z wariantem `default`
  - Ikona `Plus` z lucide-react
  - Tekst "Dodaj fiszkę"
- **Obsługiwane interakcje**:
  - `onClick` - wywołanie `onCreateClick` z rodzica
- **Obsługiwana walidacja**: Brak
- **Typy**: `CreateFlashcardButtonProps`
- **Propsy**:
  - `onClick: () => void`
  - `disabled?: boolean`

### FlashcardList

- **Opis**: Kontener listy fiszek implementujący infinite scroll. Renderuje poszczególne elementy `FlashcardItem` oraz zarządza automatycznym ładowaniem kolejnych stron przy scrollowaniu.
- **Główne elementy**:
  - `<div role="list">` jako kontener listy
  - `FlashcardItem[]` dla każdej fiszki
  - `LoadMoreTrigger` na końcu listy (IntersectionObserver)
  - Wskaźnik ładowania kolejnej strony
- **Obsługiwane interakcje**:
  - Automatyczne wywołanie `onLoadMore` gdy `LoadMoreTrigger` staje się widoczny
  - Delegacja akcji edycji/usuwania do poszczególnych elementów
- **Obsługiwana walidacja**: Brak
- **Typy**: `FlashcardListProps`
- **Propsy**:
  - `flashcards: FlashcardListItemViewModel[]`
  - `onEdit: (flashcard: FlashcardListItemViewModel) => void`
  - `onDelete: (flashcard: FlashcardListItemViewModel) => void`
  - `onLoadMore: () => void`
  - `hasMore: boolean`
  - `isLoadingMore: boolean`

### FlashcardItem

- **Opis**: Pojedynczy element listy reprezentujący fiszkę. Wyświetla podgląd przodu i tyłu fiszki oraz przyciski akcji (edycja, usuwanie). Obsługuje animację usuwania dla Optimistic UI.
- **Główne elementy**:
  - `<article role="listitem">` jako kontener
  - Shadcn/ui `<Card>` z responsywnym layoutem
  - `FlashcardContent` - wyświetlanie front/back
  - `FlashcardItemActions` - przyciski akcji
  - Badge ze źródłem fiszki (AI/Manual)
- **Obsługiwane interakcje**:
  - `onClick` na całej karcie - otwarcie edycji (opcjonalne)
  - Kliknięcie "Edytuj" - wywołanie `onEdit`
  - Kliknięcie "Usuń" - wywołanie `onDelete`
  - Obsługa klawiatury (Enter/Space dla akcji)
- **Obsługiwana walidacja**: Brak (komponent prezentacyjny)
- **Typy**: `FlashcardItemProps`
- **Propsy**:
  - `flashcard: FlashcardListItemViewModel`
  - `onEdit: () => void`
  - `onDelete: () => void`
  - `isDeleting?: boolean` (dla animacji Optimistic UI)

### FlashcardContent

- **Opis**: Komponent prezentacyjny wyświetlający treść fiszki (przód i tył) w czytelnym formacie z odpowiednimi etykietami.
- **Główne elementy**:
  - `<div>` z grid layout (2 kolumny na desktop, 1 na mobile)
  - Sekcja "Przód" z etykietą i treścią
  - Sekcja "Tył" z etykietą i treścią
  - Tekst obcięty z ellipsis dla długich treści
- **Obsługiwane interakcje**: Brak (komponent prezentacyjny)
- **Obsługiwana walidacja**: Brak
- **Typy**: `FlashcardContentProps`
- **Propsy**:
  - `front: string`
  - `back: string`

### FlashcardItemActions

- **Opis**: Zestaw przycisków akcji dla pojedynczej fiszki: edycja i usuwanie.
- **Główne elementy**:
  - `<div>` z flexbox layout
  - `<Button>` Edytuj (ikona `Pencil`, wariant `ghost`)
  - `<Button>` Usuń (ikona `Trash2`, wariant `ghost`, kolor destructive)
- **Obsługiwane interakcje**:
  - `onEdit` - kliknięcie przycisku edycji
  - `onDelete` - kliknięcie przycisku usuwania
- **Obsługiwana walidacja**: Brak
- **Typy**: `FlashcardItemActionsProps`
- **Propsy**:
  - `onEdit: () => void`
  - `onDelete: () => void`
  - `disabled?: boolean`

### LoadMoreTrigger

- **Opis**: Niewidoczny element na końcu listy wykorzystywany przez IntersectionObserver do wykrywania scrollowania i automatycznego ładowania kolejnych stron.
- **Główne elementy**:
  - `<div ref={triggerRef}>` z minimalną wysokością (1px)
  - Opcjonalny spinner gdy `isLoading`
- **Obsługiwane interakcje**:
  - IntersectionObserver callback przy wejściu w viewport
- **Obsługiwana walidacja**: Brak
- **Typy**: `LoadMoreTriggerProps`
- **Propsy**:
  - `onIntersect: () => void`
  - `hasMore: boolean`
  - `isLoading: boolean`

### EmptyState

- **Opis**: Komponent wyświetlany gdy użytkownik nie ma żadnych fiszek. Zawiera ilustrację, komunikat oraz CTA zachęcające do utworzenia fiszki lub wygenerowania przez AI.
- **Główne elementy**:
  - `<div>` wycentrowany kontener
  - Ilustracja/ikona (np. `FileText` z lucide-react)
  - Tekst główny: "Nie masz jeszcze żadnych fiszek"
  - Tekst pomocniczy: "Utwórz pierwszą fiszkę ręcznie lub wygeneruj z AI"
  - `<Button>` "Dodaj fiszkę" (primary)
  - `<Button>` "Generuj z AI" (secondary, link do `/generate`)
- **Obsługiwane interakcje**:
  - `onCreateClick` - otwarcie dialogu tworzenia
  - Nawigacja do `/generate`
- **Obsługiwana walidacja**: Brak
- **Typy**: `EmptyStateProps`
- **Propsy**:
  - `onCreateClick: () => void`

### LoadingState

- **Opis**: Komponent wyświetlający stan ładowania podczas pobierania początkowej listy fiszek. Wykorzystuje skeleton cards dla lepszego UX.
- **Główne elementy**:
  - `<div>` kontener z grid layout
  - Shadcn/ui `<Skeleton>` imitujące karty fiszek (3-5 elementów)
- **Obsługiwane interakcje**: Brak (komponent prezentacyjny)
- **Obsługiwana walidacja**: Brak
- **Typy**: `LoadingStateProps`
- **Propsy**:
  - `count?: number` (domyślnie 3)

### CreateFlashcardDialog

- **Opis**: Modal dialog do tworzenia nowej fiszki ręcznie. Zawiera formularz z polami przód/tył oraz przyciski akcji.
- **Główne elementy**:
  - Shadcn/ui `<Dialog>` z `DialogContent`, `DialogHeader`, `DialogTitle`
  - `FlashcardForm` jako zawartość
  - `DialogFooter` z przyciskami "Anuluj" i "Zapisz"
- **Obsługiwane interakcje**:
  - `onOpenChange` - zmiana stanu otwarcia dialogu
  - `onSubmit` - zapisanie nowej fiszki
  - `onCancel` - zamknięcie bez zapisywania
- **Obsługiwana walidacja**: Delegowana do `FlashcardForm`
- **Typy**: `CreateFlashcardDialogProps`
- **Propsy**:
  - `isOpen: boolean`
  - `onOpenChange: (open: boolean) => void`
  - `onSubmit: (data: FlashcardFormData) => Promise<void>`
  - `isSubmitting: boolean`

### EditFlashcardDialog

- **Opis**: Modal dialog do edycji istniejącej fiszki. Na urządzeniach mobilnych renderowany jako Drawer (z dolnej krawędzi). Zawiera formularz z wypełnionymi danymi fiszki.
- **Główne elementy**:
  - Shadcn/ui `<Dialog>` (desktop) lub `<Drawer>` (mobile - wymaga dodania do UI)
  - `DialogHeader` z tytułem "Edytuj fiszkę"
  - `FlashcardForm` z wartościami początkowymi
  - `DialogFooter` z przyciskami "Anuluj" i "Zapisz zmiany"
- **Obsługiwane interakcje**:
  - `onOpenChange` - zmiana stanu otwarcia
  - `onSubmit` - zapisanie zmian
  - `onCancel` - zamknięcie bez zapisywania
- **Obsługiwana walidacja**: Delegowana do `FlashcardForm`
- **Typy**: `EditFlashcardDialogProps`
- **Propsy**:
  - `isOpen: boolean`
  - `onOpenChange: (open: boolean) => void`
  - `flashcard: FlashcardListItemViewModel | null`
  - `onSubmit: (data: FlashcardFormData) => Promise<void>`
  - `isSubmitting: boolean`

### FlashcardForm

- **Opis**: Formularz do wprowadzania/edycji danych fiszki. Zawiera pola tekstowe dla przodu i tyłu z walidacją i licznikami znaków.
- **Główne elementy**:
  - `<form>` z obsługą submit
  - `<label>` + Shadcn/ui `<Textarea>` dla pola "Przód"
  - `CharacterCounter` dla pola "Przód" (max 200)
  - `<label>` + Shadcn/ui `<Textarea>` dla pola "Tył"
  - `CharacterCounter` dla pola "Tył" (max 500)
  - Komunikaty błędów walidacji pod polami
- **Obsługiwane interakcje**:
  - `onChange` dla każdego pola - aktualizacja stanu i walidacja real-time
  - `onSubmit` - walidacja i wywołanie handlera rodzica
- **Obsługiwana walidacja**:
  - Pole "Przód": wymagane, min 1 znak, max 200 znaków
  - Pole "Tył": wymagane, min 1 znak, max 500 znaków
- **Typy**: `FlashcardFormProps`, `FlashcardFormData`
- **Propsy**:
  - `initialData?: FlashcardFormData`
  - `onSubmit: (data: FlashcardFormData) => void`
  - `onCancel: () => void`
  - `isSubmitting: boolean`
  - `submitLabel?: string` (domyślnie "Zapisz")

### DeleteConfirmDialog

- **Opis**: Dialog potwierdzenia usunięcia fiszki. Wyświetla ostrzeżenie i wymaga jawnego potwierdzenia operacji.
- **Główne elementy**:
  - Shadcn/ui `<AlertDialog>` z `AlertDialogContent`
  - `AlertDialogHeader` z tytułem "Usuń fiszkę"
  - `AlertDialogDescription` z ostrzeżeniem: "Czy na pewno chcesz usunąć tę fiszkę? Tej operacji nie można cofnąć."
  - Podgląd treści fiszki (opcjonalnie)
  - `AlertDialogFooter` z przyciskami "Anuluj" i "Usuń"
- **Obsługiwane interakcje**:
  - `onCancel` - zamknięcie dialogu bez usuwania
  - `onConfirm` - potwierdzenie i usunięcie fiszki
- **Obsługiwana walidacja**: Brak
- **Typy**: `DeleteConfirmDialogProps`
- **Propsy**:
  - `isOpen: boolean`
  - `onOpenChange: (open: boolean) => void`
  - `flashcard: FlashcardListItemViewModel | null`
  - `onConfirm: () => Promise<void>`
  - `isDeleting: boolean`

## 5. Typy

### Istniejące typy (z `src/types.ts`)

```typescript
// Query params dla listy fiszek
type FlashcardListQueryDto = {
  page?: number
  limit?: number
  sort?: "created_at"
  order?: "asc" | "desc"
  source?: "ai-full" | "ai-edited" | "manual"
  generation_id?: string
}

// Element listy fiszek z API
type FlashcardListItemDto = {
  id: string
  front: string
  back: string
  source: "ai-full" | "ai-edited" | "manual"
  created_at: string
  updated_at: string
}

// Szczegóły fiszki z API
type FlashcardDetailDto = FlashcardListItemDto & {
  generation_id: string | null
}

// Odpowiedź listy z paginacją
type FlashcardListResponseDto = {
  data: FlashcardListItemDto[]
  pagination: PaginationMetaDto
}

// Metadane paginacji
type PaginationMetaDto = {
  page: number
  limit: number
  total: number
}

// Komenda tworzenia fiszki
type FlashcardDraftCommand = {
  front: string
  back: string
  source: "ai-full" | "ai-edited" | "manual"
  generation_id: string | null
}

type CreateFlashcardsCommand = {
  flashcards: FlashcardDraftCommand[]
}

// Odpowiedź tworzenia fiszek
type CreateFlashcardsResponseDto = {
  flashcards: FlashcardDetailDto[]
}

// Komenda aktualizacji fiszki
type UpdateFlashcardCommand = {
  front?: string
  back?: string
  source?: "ai-full" | "ai-edited" | "manual"
  generation_id?: string | null
}

// Odpowiedź usunięcia
type DeleteFlashcardResponseDto = {
  message: string
}
```

### Nowe typy ViewModel (do utworzenia w `src/components/flashcards/types.ts`)

```typescript
/**
 * Rozszerzony model fiszki dla warstwy prezentacji
 * Zawiera dane z API oraz metadane UI
 */
export interface FlashcardListItemViewModel {
  /** ID fiszki z bazy danych */
  id: string
  /** Treść przodu fiszki */
  front: string
  /** Treść tyłu fiszki */
  back: string
  /** Źródło fiszki */
  source: "ai-full" | "ai-edited" | "manual"
  /** Data utworzenia */
  createdAt: Date
  /** Data ostatniej aktualizacji */
  updatedAt: Date
  /** Czy fiszka jest w trakcie usuwania (Optimistic UI) */
  isDeleting?: boolean
}

/**
 * Dane formularza tworzenia/edycji fiszki
 */
export interface FlashcardFormData {
  /** Treść przodu fiszki */
  front: string
  /** Treść tyłu fiszki */
  back: string
}

/**
 * Wynik walidacji formularza fiszki
 */
export interface FlashcardFormValidation {
  isValid: boolean
  errors: {
    front?: string
    back?: string
  }
}

/**
 * Stan widoku "Moje Fiszki"
 */
export interface FlashcardsViewState {
  /** Lista fiszek */
  flashcards: FlashcardListItemViewModel[]
  /** Metadane paginacji */
  pagination: {
    page: number
    limit: number
    total: number
    hasMore: boolean
  }
  /** Stan ładowania początkowego */
  isLoading: boolean
  /** Stan ładowania kolejnej strony */
  isLoadingMore: boolean
  /** Błąd (jeśli wystąpił) */
  error: string | null
}

/**
 * Stan dialogów w widoku
 */
export interface FlashcardsDialogState {
  /** Czy dialog tworzenia jest otwarty */
  isCreateDialogOpen: boolean
  /** Czy dialog edycji jest otwarty */
  isEditDialogOpen: boolean
  /** Czy dialog usuwania jest otwarty */
  isDeleteDialogOpen: boolean
  /** Fiszka wybrana do edycji */
  flashcardToEdit: FlashcardListItemViewModel | null
  /** Fiszka wybrana do usunięcia */
  flashcardToDelete: FlashcardListItemViewModel | null
  /** Stan zapisywania (tworzenie/edycja) */
  isSubmitting: boolean
  /** Stan usuwania */
  isDeleting: boolean
}

/**
 * Stałe walidacyjne dla formularza fiszki
 */
export const FLASHCARD_VALIDATION = {
  FRONT_MIN_LENGTH: 1,
  FRONT_MAX_LENGTH: 200,
  BACK_MIN_LENGTH: 1,
  BACK_MAX_LENGTH: 500,
} as const

/**
 * Funkcja mapująca DTO na ViewModel
 */
export function mapFlashcardDtoToViewModel(
  dto: FlashcardListItemDto
): FlashcardListItemViewModel {
  return {
    id: dto.id,
    front: dto.front,
    back: dto.back,
    source: dto.source,
    createdAt: new Date(dto.created_at),
    updatedAt: new Date(dto.updated_at),
  }
}

/**
 * Funkcja mapująca FormData na Command dla tworzenia
 */
export function mapFormDataToCreateCommand(
  data: FlashcardFormData
): FlashcardDraftCommand {
  return {
    front: data.front.trim(),
    back: data.back.trim(),
    source: "manual",
    generation_id: null,
  }
}

/**
 * Funkcja mapująca FormData na Command dla aktualizacji
 */
export function mapFormDataToUpdateCommand(
  data: FlashcardFormData
): UpdateFlashcardCommand {
  return {
    front: data.front.trim(),
    back: data.back.trim(),
  }
}
```

## 6. Zarządzanie stanem

### Custom Hook: `useFlashcards`

Hook zarządzający całym stanem widoku "Moje Fiszki", odpowiedzialny za:

1. **Pobieranie listy fiszek** z obsługą paginacji
2. **Infinite scroll** - automatyczne ładowanie kolejnych stron
3. **Operacje CRUD** - tworzenie, edycja, usuwanie
4. **Optimistic UI** - natychmiastowa aktualizacja UI przy usuwaniu

```typescript
// src/components/flashcards/hooks/useFlashcards.ts

interface UseFlashcardsReturn {
  // Stan listy
  flashcards: FlashcardListItemViewModel[]
  isLoading: boolean
  isLoadingMore: boolean
  error: string | null
  
  // Paginacja
  hasMore: boolean
  totalCount: number
  
  // Akcje listy
  fetchFlashcards: () => Promise<void>
  fetchMoreFlashcards: () => Promise<void>
  refreshFlashcards: () => Promise<void>
  
  // Operacje CRUD
  createFlashcard: (data: FlashcardFormData) => Promise<FlashcardListItemViewModel>
  updateFlashcard: (id: string, data: FlashcardFormData) => Promise<FlashcardListItemViewModel>
  deleteFlashcard: (id: string) => Promise<void>
  
  // Obsługa błędów
  clearError: () => void
}

export function useFlashcards(): UseFlashcardsReturn
```

### Custom Hook: `useFlashcardDialogs`

Hook zarządzający stanem dialogów (modali) w widoku:

```typescript
// src/components/flashcards/hooks/useFlashcardDialogs.ts

interface UseFlashcardDialogsReturn {
  // Dialog tworzenia
  isCreateDialogOpen: boolean
  openCreateDialog: () => void
  closeCreateDialog: () => void
  
  // Dialog edycji
  isEditDialogOpen: boolean
  flashcardToEdit: FlashcardListItemViewModel | null
  openEditDialog: (flashcard: FlashcardListItemViewModel) => void
  closeEditDialog: () => void
  
  // Dialog usuwania
  isDeleteDialogOpen: boolean
  flashcardToDelete: FlashcardListItemViewModel | null
  openDeleteDialog: (flashcard: FlashcardListItemViewModel) => void
  closeDeleteDialog: () => void
  
  // Stan operacji
  isSubmitting: boolean
  setIsSubmitting: (value: boolean) => void
  isDeleting: boolean
  setIsDeleting: (value: boolean) => void
}

export function useFlashcardDialogs(): UseFlashcardDialogsReturn
```

### Custom Hook: `useInfiniteScroll`

Hook do obsługi infinite scroll z IntersectionObserver:

```typescript
// src/components/flashcards/hooks/useInfiniteScroll.ts

interface UseInfiniteScrollOptions {
  hasMore: boolean
  isLoading: boolean
  onLoadMore: () => void
  threshold?: number // domyślnie 0.1
  rootMargin?: string // domyślnie "100px"
}

interface UseInfiniteScrollReturn {
  triggerRef: RefObject<HTMLDivElement>
}

export function useInfiniteScroll(options: UseInfiniteScrollOptions): UseInfiniteScrollReturn
```

### Szczegóły implementacji `useFlashcards`

1. **Inicjalizacja i pobieranie**:
   - Automatyczne pobieranie pierwszej strony przy montowaniu
   - Domyślne parametry: `page=1`, `limit=20`, `sort=created_at`, `order=desc`

2. **Infinite scroll**:
   - `fetchMoreFlashcards` inkrementuje stronę i dodaje wyniki do istniejącej listy
   - Sprawdzanie `hasMore` przed wywołaniem (`page * limit < total`)

3. **Optimistic UI dla usuwania**:
   - Natychmiastowe oznaczenie fiszki jako `isDeleting: true`
   - Usunięcie z listy bez czekania na odpowiedź API
   - Rollback w przypadku błędu (przywrócenie fiszki do listy)

4. **Tworzenie fiszki**:
   - Po sukcesie: dodanie nowej fiszki na początek listy
   - Inkrementacja `totalCount`

5. **Edycja fiszki**:
   - Po sukcesie: aktualizacja fiszki w liście (immutable update)

## 7. Integracja API

### GET `/api/flashcards`

**Cel**: Pobieranie paginowanej listy fiszek użytkownika

**Request**:
```typescript
interface FetchFlashcardsParams {
  page?: number      // domyślnie 1
  limit?: number     // domyślnie 20, max 100
  sort?: "created_at"
  order?: "asc" | "desc" // domyślnie "desc"
}
```

**Response (sukces - 200)**:
```typescript
interface FlashcardListResponse {
  data: FlashcardListItemDto[]
  pagination: {
    page: number
    limit: number
    total: number
  }
}
```

**Implementacja frontendowa**:
```typescript
async function fetchFlashcards(params: FetchFlashcardsParams): Promise<FlashcardListResponse> {
  const searchParams = new URLSearchParams()
  if (params.page) searchParams.set('page', params.page.toString())
  if (params.limit) searchParams.set('limit', params.limit.toString())
  if (params.sort) searchParams.set('sort', params.sort)
  if (params.order) searchParams.set('order', params.order)
  
  const response = await fetch(`/api/flashcards?${searchParams}`)
  
  if (!response.ok) {
    const error = await response.json()
    throw new ApiError(error.message, response.status)
  }
  
  return response.json()
}
```

### POST `/api/flashcards`

**Cel**: Tworzenie nowej fiszki ręcznie

**Request**:
```typescript
interface CreateFlashcardRequest {
  flashcards: [{
    front: string      // max 200 znaków
    back: string       // max 500 znaków
    source: "manual"
    generation_id: null
  }]
}
```

**Response (sukces - 201)**:
```typescript
interface CreateFlashcardResponse {
  flashcards: [FlashcardDetailDto]
}
```

**Implementacja frontendowa**:
```typescript
async function createFlashcard(data: FlashcardFormData): Promise<FlashcardDetailDto> {
  const response = await fetch('/api/flashcards', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      flashcards: [{
        front: data.front.trim(),
        back: data.back.trim(),
        source: 'manual',
        generation_id: null,
      }]
    }),
  })
  
  if (!response.ok) {
    const error = await response.json()
    throw new ApiError(error.message, response.status)
  }
  
  const result = await response.json()
  return result.flashcards[0]
}
```

### PUT `/api/flashcards/{id}`

**Cel**: Aktualizacja istniejącej fiszki

**Request**:
```typescript
interface UpdateFlashcardRequest {
  front?: string   // max 200 znaków
  back?: string    // max 500 znaków
}
```

**Response (sukces - 200)**:
```typescript
type UpdateFlashcardResponse = FlashcardDetailDto
```

**Implementacja frontendowa**:
```typescript
async function updateFlashcard(id: string, data: FlashcardFormData): Promise<FlashcardDetailDto> {
  const response = await fetch(`/api/flashcards/${id}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      front: data.front.trim(),
      back: data.back.trim(),
    }),
  })
  
  if (!response.ok) {
    const error = await response.json()
    throw new ApiError(error.message, response.status)
  }
  
  return response.json()
}
```

### DELETE `/api/flashcards/{id}`

**Cel**: Usunięcie fiszki

**Response (sukces - 200)**:
```typescript
interface DeleteFlashcardResponse {
  message: string
}
```

**Implementacja frontendowa**:
```typescript
async function deleteFlashcard(id: string): Promise<void> {
  const response = await fetch(`/api/flashcards/${id}`, {
    method: 'DELETE',
  })
  
  if (!response.ok) {
    const error = await response.json()
    throw new ApiError(error.message, response.status)
  }
}
```

## 8. Interakcje użytkownika

### 1. Przeglądanie listy fiszek

| Akcja użytkownika | Reakcja systemu |
|-------------------|-----------------|
| Wejście na stronę `/flashcards` | Wyświetlenie loadera, pobranie pierwszej strony fiszek |
| Sukces pobierania | Wyświetlenie listy fiszek |
| Brak fiszek | Wyświetlenie `EmptyState` z CTA |
| Scroll do końca listy | Automatyczne pobranie kolejnej strony (infinite scroll) |
| Błąd pobierania | Wyświetlenie komunikatu błędu z przyciskiem "Spróbuj ponownie" |

### 2. Tworzenie nowej fiszki

| Akcja użytkownika | Reakcja systemu |
|-------------------|-----------------|
| Kliknięcie "Dodaj fiszkę" | Otwarcie `CreateFlashcardDialog` |
| Wpisywanie w pola formularza | Real-time walidacja, aktualizacja liczników znaków |
| Błąd walidacji (pole puste) | Wyświetlenie komunikatu "Pole jest wymagane" |
| Błąd walidacji (za długie) | Wyświetlenie komunikatu "Maksymalnie X znaków" |
| Kliknięcie "Anuluj" | Zamknięcie dialogu bez zapisywania |
| Kliknięcie "Zapisz" (walidacja OK) | Loader na przycisku, wywołanie API |
| Sukces zapisania | Zamknięcie dialogu, dodanie fiszki na początek listy, toast sukcesu |
| Błąd zapisania | Wyświetlenie komunikatu błędu w dialogu |

### 3. Edycja fiszki

| Akcja użytkownika | Reakcja systemu |
|-------------------|-----------------|
| Kliknięcie "Edytuj" na fiszce | Otwarcie `EditFlashcardDialog` z wypełnionymi danymi |
| Modyfikacja pól | Real-time walidacja, aktualizacja liczników |
| Kliknięcie "Anuluj" | Zamknięcie dialogu bez zapisywania zmian |
| Kliknięcie "Zapisz zmiany" | Loader na przycisku, wywołanie API |
| Sukces zapisania | Zamknięcie dialogu, aktualizacja fiszki w liście, toast sukcesu |
| Błąd zapisania | Wyświetlenie komunikatu błędu w dialogu |

### 4. Usuwanie fiszki

| Akcja użytkownika | Reakcja systemu |
|-------------------|-----------------|
| Kliknięcie "Usuń" na fiszce | Otwarcie `DeleteConfirmDialog` |
| Kliknięcie "Anuluj" | Zamknięcie dialogu bez usuwania |
| Kliknięcie "Usuń" (potwierdzenie) | Zamknięcie dialogu, Optimistic UI (natychmiastowe usunięcie z listy) |
| Sukces usunięcia | Toast sukcesu "Fiszka usunięta" |
| Błąd usunięcia | Rollback (przywrócenie fiszki), toast błędu |

### 5. Nawigacja klawiaturą

| Klawisz | Kontekst | Akcja |
|---------|----------|-------|
| `Tab` | Lista | Nawigacja między elementami interaktywnymi |
| `Enter` / `Space` | Przycisk | Aktywacja przycisku |
| `Escape` | Dialog otwarty | Zamknięcie dialogu |
| `Tab` | Dialog | Nawigacja wewnątrz dialogu (focus trap) |

## 9. Warunki i walidacja

### Walidacja formularza fiszki

| Warunek | Komponent | Wpływ na UI |
|---------|-----------|-------------|
| `front.length === 0` | `FlashcardForm` | Pole oznaczone błędem, komunikat "Pole jest wymagane", przycisk "Zapisz" disabled |
| `front.length > 200` | `FlashcardForm` | Pole oznaczone błędem, komunikat "Maksymalnie 200 znaków", licznik czerwony |
| `back.length === 0` | `FlashcardForm` | Pole oznaczone błędem, komunikat "Pole jest wymagane", przycisk "Zapisz" disabled |
| `back.length > 500` | `FlashcardForm` | Pole oznaczone błędem, komunikat "Maksymalnie 500 znaków", licznik czerwony |
| Walidacja OK | `FlashcardForm` | Brak błędów, liczniki zielone, przycisk "Zapisz" enabled |

### Walidacja akcji

| Warunek | Komponent | Wpływ na UI |
|---------|-----------|-------------|
| `isSubmitting === true` | `CreateFlashcardDialog`, `EditFlashcardDialog` | Przycisk "Zapisz" disabled z loaderem, pola formularza disabled |
| `isDeleting === true` | `DeleteConfirmDialog` | Przycisk "Usuń" disabled z loaderem |
| `isLoadingMore === true` | `FlashcardList` | Wyświetlenie spinnera na końcu listy |
| `hasMore === false` | `FlashcardList` | Ukrycie `LoadMoreTrigger`, opcjonalny komunikat "Koniec listy" |

### Funkcja walidacji formularza

```typescript
function validateFlashcardForm(data: FlashcardFormData): FlashcardFormValidation {
  const errors: FlashcardFormValidation['errors'] = {}
  
  // Walidacja pola front
  const frontTrimmed = data.front.trim()
  if (frontTrimmed.length === 0) {
    errors.front = 'Pole jest wymagane'
  } else if (frontTrimmed.length > FLASHCARD_VALIDATION.FRONT_MAX_LENGTH) {
    errors.front = `Maksymalnie ${FLASHCARD_VALIDATION.FRONT_MAX_LENGTH} znaków`
  }
  
  // Walidacja pola back
  const backTrimmed = data.back.trim()
  if (backTrimmed.length === 0) {
    errors.back = 'Pole jest wymagane'
  } else if (backTrimmed.length > FLASHCARD_VALIDATION.BACK_MAX_LENGTH) {
    errors.back = `Maksymalnie ${FLASHCARD_VALIDATION.BACK_MAX_LENGTH} znaków`
  }
  
  return {
    isValid: Object.keys(errors).length === 0,
    errors,
  }
}
```

## 10. Obsługa błędów

### Błędy ładowania listy

| Scenariusz | Komunikat użytkownika | Akcja |
|------------|----------------------|-------|
| 401 Unauthorized | "Sesja wygasła. Zaloguj się ponownie." | Przekierowanie do strony logowania |
| 500 Server Error | "Nie udało się pobrać fiszek. Spróbuj ponownie." | Wyświetlenie przycisku "Spróbuj ponownie" |
| Network Error | "Brak połączenia z serwerem. Sprawdź połączenie internetowe." | Wyświetlenie przycisku "Spróbuj ponownie" |

### Błędy tworzenia fiszki

| Scenariusz | Komunikat użytkownika | Akcja |
|------------|----------------------|-------|
| 400 Validation Error | Szczegółowe błędy przy polach formularza | Wyświetlenie błędów, dialog pozostaje otwarty |
| 500 Server Error | "Nie udało się zapisać fiszki. Spróbuj ponownie." | Wyświetlenie błędu w dialogu |
| Network Error | "Brak połączenia z serwerem." | Wyświetlenie błędu w dialogu |

### Błędy edycji fiszki

| Scenariusz | Komunikat użytkownika | Akcja |
|------------|----------------------|-------|
| 400 Validation Error | Szczegółowe błędy przy polach | Wyświetlenie błędów w formularzu |
| 404 Not Found | "Fiszka nie została znaleziona. Mogła zostać usunięta." | Zamknięcie dialogu, refresh listy |
| 500 Server Error | "Nie udało się zapisać zmian. Spróbuj ponownie." | Wyświetlenie błędu w dialogu |

### Błędy usuwania fiszki

| Scenariusz | Komunikat użytkownika | Akcja |
|------------|----------------------|-------|
| 404 Not Found | "Fiszka nie została znaleziona." | Usunięcie z listy (jeśli jeszcze jest) |
| 500 Server Error | "Nie udało się usunąć fiszki. Spróbuj ponownie." | Rollback (przywrócenie fiszki), toast błędu |
| Network Error | "Brak połączenia z serwerem." | Rollback, toast błędu |

### Implementacja Optimistic UI dla usuwania

```typescript
async function handleDeleteFlashcard(id: string) {
  // 1. Zapisz kopię fiszki przed usunięciem (dla rollbacku)
  const flashcardToDelete = flashcards.find(f => f.id === id)
  const originalIndex = flashcards.findIndex(f => f.id === id)
  
  // 2. Optimistic update - natychmiastowe usunięcie z UI
  setFlashcards(prev => prev.filter(f => f.id !== id))
  closeDeleteDialog()
  
  try {
    // 3. Wywołanie API
    await deleteFlashcard(id)
    
    // 4. Sukces - pokaż toast
    showToast({ type: 'success', message: 'Fiszka usunięta' })
  } catch (error) {
    // 5. Rollback - przywróć fiszkę na oryginalną pozycję
    if (flashcardToDelete) {
      setFlashcards(prev => {
        const newList = [...prev]
        newList.splice(originalIndex, 0, flashcardToDelete)
        return newList
      })
    }
    
    // 6. Pokaż błąd
    showToast({ type: 'error', message: 'Nie udało się usunąć fiszki' })
  }
}
```

## 11. Kroki implementacji

### Faza 1: Przygotowanie struktury (1-2h)

1. Utworzenie pliku strony `src/pages/flashcards.astro` z bazowym layoutem
2. Utworzenie struktury katalogów dla komponentów:
   - `src/components/flashcards/`
   - `src/components/flashcards/hooks/`
   - `src/components/flashcards/types.ts`
3. Zdefiniowanie typów ViewModel w `src/components/flashcards/types.ts`
4. Dodanie brakujących komponentów Shadcn/ui:
   - `Dialog` (jeśli brak)
   - `AlertDialog`
   - `Drawer` (dla mobile edit)
   - Opcjonalnie: `Toast`/`Sonner` dla powiadomień

### Faza 2: Implementacja komponentów prezentacyjnych (3-4h)

5. Implementacja `FlashcardContent` - wyświetlanie front/back
6. Implementacja `FlashcardItemActions` - przyciski edycji/usuwania
7. Implementacja `FlashcardItem` - karta fiszki z contentem i akcjami
8. Implementacja `LoadMoreTrigger` - trigger dla infinite scroll
9. Implementacja `FlashcardList` - kontener listy z elementami
10. Implementacja `EmptyState` - stan pustej listy
11. Implementacja `LoadingState` - skeleton cards

### Faza 3: Implementacja formularza i dialogów (3-4h)

12. Implementacja `FlashcardForm` - formularz tworzenia/edycji z walidacją
13. Reimplementacja `CharacterCounter` (jeśli potrzebny oddzielny) lub użycie z generate
14. Implementacja `CreateFlashcardDialog` - modal tworzenia
15. Implementacja `EditFlashcardDialog` - modal edycji
16. Implementacja `DeleteConfirmDialog` - dialog potwierdzenia usunięcia

### Faza 4: Implementacja logiki biznesowej (4-5h)

17. Implementacja funkcji walidacji formularza
18. Implementacja hooka `useInfiniteScroll`
19. Implementacja hooka `useFlashcardDialogs`
20. Implementacja hooka `useFlashcards`:
    - Pobieranie listy z paginacją
    - Infinite scroll
    - CRUD operations
    - Optimistic UI dla usuwania
    - Obsługa błędów

### Faza 5: Integracja (2-3h)

21. Implementacja komponentów nagłówka: `FlashcardsHeader`, `CreateFlashcardButton`
22. Implementacja głównego komponentu `FlashcardsView`
23. Integracja z stroną Astro `flashcards.astro`
24. Implementacja systemu powiadomień (toast) dla operacji CRUD

### Faza 6: Responsywność i dostępność (2-3h)

25. Implementacja responsywnego `EditFlashcardDrawer` dla mobile
26. Dopracowanie stylów responsywnych (mobile-first)
27. Implementacja obsługi klawiatury:
    - Focus management w dialogach
    - Keyboard navigation w liście
28. Dodanie atrybutów ARIA dla dostępności
29. Testowanie z czytnikiem ekranu

### Faza 7: Testowanie i optymalizacja (2-3h)

30. Testy komponentów (jednostkowe)
31. Testy integracyjne (flow użytkownika)
32. Optymalizacja wydajności:
    - `React.memo` dla `FlashcardItem`
    - `useCallback` dla handlerów
    - Debouncing walidacji formularza
33. Testy edge cases:
    - Pusta lista
    - Błędy API
    - Concurrent operations
