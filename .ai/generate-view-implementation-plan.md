# Plan implementacji widoku Generator AI

## 1. Przegląd

Widok Generator AI jest głównym narzędziem aplikacji 10x-cards umożliwiającym szybkie tworzenie fiszek edukacyjnych przy użyciu sztucznej inteligencji. Użytkownik wkleja tekst źródłowy (1000-10000 znaków), a aplikacja komunikuje się z modelem LLM, który generuje propozycje fiszek (pytanie/odpowiedź). Użytkownik może następnie przeglądać, edytować, akceptować lub odrzucać poszczególne propozycje, a następnie zapisać wybrane fiszki do bazy danych.

Widok realizuje historyjki użytkownika US-003 (Generowanie fiszek przy użyciu AI) oraz US-004 (Przegląd i zatwierdzanie propozycji fiszek).

## 2. Routing widoku

- **Ścieżka**: `/generate`
- **Plik**: `src/pages/generate.astro`
- **Dostęp**: Strona startowa po zalogowaniu (wymaga autoryzacji)
- **Prerender**: `false` (dynamiczne renderowanie)

## 3. Struktura komponentów

```
GeneratePage (Astro)
└── Layout
    └── GenerateView (React, client:load)
        ├── SourceTextForm
        │   ├── SourceTextInput (textarea)
        │   ├── CharacterCounter
        │   └── GenerateButton
        ├── GenerationLoader (warunkowy - podczas generowania)
        │   └── SkeletonCard[]
        ├── ReviewSection (warunkowy - po wygenerowaniu)
        │   ├── SourceTextPreview (akordeon)
        │   ├── ReviewBoard
        │   │   └── FlashcardProposalCard[]
        │   │       ├── ProposalContent (front/back display)
        │   │       ├── ProposalEditForm (warunkowy - tryb edycji)
        │   │       └── ProposalActions (przyciski akcji)
        │   └── BulkActionsBar (sticky footer)
        └── ErrorAlert (warunkowy - w przypadku błędu)
```

## 4. Szczegóły komponentów

### GenerateView

- **Opis**: Główny komponent kontenerowy widoku generatora, zarządzający stanem całego flow generowania i akceptacji fiszek. Renderuje odpowiednie podkomponenty w zależności od aktualnego stanu (formularz wejściowy, loader, sekcja recenzji).
- **Główne elementy**:
  - `<main>` z klasami layoutu (max-width, padding)
  - Warunkowe renderowanie `SourceTextForm`, `GenerationLoader`, `ReviewSection`, `ErrorAlert`
- **Obsługiwane interakcje**:
  - Inicjalizacja stanu z localStorage (draft tekstu źródłowego)
  - Przekazywanie callbacków do komponentów dzieci
- **Obsługiwana walidacja**: Brak bezpośredniej walidacji - delegowana do dzieci
- **Typy**: 
  - `GenerationState` (union type stanów)
  - `FlashcardProposalViewModel[]`
- **Propsy**: Brak (komponent najwyższego poziomu)

### SourceTextForm

- **Opis**: Formularz wprowadzania tekstu źródłowego z licznikiem znaków i przyciskiem generowania. Odpowiada za walidację długości tekstu przed wysłaniem żądania.
- **Główne elementy**:
  - `<form>` z obsługą submit
  - `SourceTextInput` (komponent textarea)
  - `CharacterCounter` (wyświetlanie liczby znaków)
  - `GenerateButton` (przycisk submit)
- **Obsługiwane interakcje**:
  - `onChange` - aktualizacja tekstu i zapis do localStorage
  - `onSubmit` - walidacja i wywołanie generowania
- **Obsługiwana walidacja**:
  - Tekst musi mieć od 1000 do 10000 znaków
  - Przycisk generowania jest nieaktywny gdy walidacja nie przechodzi
- **Typy**:
  - `SourceTextFormProps`
- **Propsy**:
  - `sourceText: string`
  - `onSourceTextChange: (text: string) => void`
  - `onGenerate: () => void`
  - `isGenerating: boolean`
  - `validationError: string | null`

### SourceTextInput

- **Opis**: Pole tekstowe (textarea) do wklejania tekstu źródłowego z obsługą placeholder i automatycznego rozszerzania.
- **Główne elementy**:
  - `<textarea>` z odpowiednimi atrybutami ARIA
  - `<label>` dla dostępności
- **Obsługiwane interakcje**:
  - `onChange` - propagacja zmian do rodzica
  - `onPaste` - obsługa wklejania tekstu
- **Obsługiwana walidacja**: Wizualne oznaczenie błędu (obramowanie czerwone) gdy tekst jest za krótki/za długi
- **Typy**: `SourceTextInputProps`
- **Propsy**:
  - `value: string`
  - `onChange: (value: string) => void`
  - `disabled: boolean`
  - `hasError: boolean`
  - `placeholder?: string`

### CharacterCounter

- **Opis**: Komponent wyświetlający aktualną liczbę znaków oraz dozwolony zakres (1000-10000). Zmienia kolor w zależności od stanu walidacji.
- **Główne elementy**:
  - `<span>` z dynamicznymi klasami kolorów
- **Obsługiwane interakcje**: Brak (komponent prezentacyjny)
- **Obsługiwana walidacja**: Brak (tylko wyświetlanie stanu)
- **Typy**: `CharacterCounterProps`
- **Propsy**:
  - `current: number`
  - `min: number`
  - `max: number`

### GenerateButton

- **Opis**: Przycisk uruchamiający proces generowania fiszek. Wyświetla stan ładowania podczas generowania.
- **Główne elementy**:
  - `<Button>` z Shadcn/ui
  - Ikona loadera (warunkowa)
  - Tekst przycisku
- **Obsługiwane interakcje**:
  - `onClick` - submit formularza (przez formularz nadrzędny)
- **Obsługiwana walidacja**: Przycisk `disabled` gdy `isGenerating` lub walidacja nie przechodzi
- **Typy**: `GenerateButtonProps`
- **Propsy**:
  - `isLoading: boolean`
  - `disabled: boolean`

### GenerationLoader

- **Opis**: Komponent wyświetlający skeleton UI podczas oczekiwania na odpowiedź z API. Imituje wygląd kart fiszek dla lepszego UX.
- **Główne elementy**:
  - `<div>` kontener z flexbox/grid
  - Shadcn/ui `Skeleton` komponenty imitujące karty
  - Opcjonalny tekst statusu
- **Obsługiwane interakcje**: Brak (komponent prezentacyjny)
- **Obsługiwana walidacja**: Brak
- **Typy**: `GenerationLoaderProps`
- **Propsy**:
  - `skeletonCount?: number` (domyślnie 3-5)

### ReviewSection

- **Opis**: Kontener dla sekcji recenzji propozycji fiszek. Zawiera podgląd tekstu źródłowego, listę propozycji oraz pasek akcji zbiorczych.
- **Główne elementy**:
  - `<section>` z odpowiednim `aria-label`
  - `SourceTextPreview`
  - `ReviewBoard`
  - `BulkActionsBar`
- **Obsługiwane interakcje**: Przekazywanie callbacków do dzieci
- **Obsługiwana walidacja**: Brak
- **Typy**: `ReviewSectionProps`
- **Propsy**:
  - `sourceText: string`
  - `proposals: FlashcardProposalViewModel[]`
  - `generationId: string`
  - `onProposalUpdate: (id: string, updates: Partial<FlashcardProposalViewModel>) => void`
  - `onProposalAccept: (id: string) => void`
  - `onProposalReject: (id: string) => void`
  - `onSaveAccepted: () => void`
  - `onRejectAll: () => void`
  - `isSaving: boolean`
  - `acceptedCount: number`

### SourceTextPreview

- **Opis**: Zwijany panel (akordeon) wyświetlający oryginalny tekst źródłowy, umożliwiający użytkownikowi weryfikację kontekstu podczas recenzji propozycji.
- **Główne elementy**:
  - Shadcn/ui `Collapsible` lub własny akordeon
  - `<button>` toggle z ikoną rozwijania
  - `<div>` z tekstem (scrollable, max-height)
- **Obsługiwane interakcje**:
  - `onClick` toggle - rozwijanie/zwijanie panelu
- **Obsługiwana walidacja**: Brak
- **Typy**: `SourceTextPreviewProps`
- **Propsy**:
  - `text: string`
  - `defaultExpanded?: boolean`

### ReviewBoard

- **Opis**: Lista propozycji fiszek w formie edytowalnych kart. Zarządza lokalnym stanem tablicy propozycji i propaguje zmiany do rodzica.
- **Główne elementy**:
  - `<ul>` lub `<div role="list">` kontener
  - `FlashcardProposalCard[]` dla każdej propozycji
  - Informacja o pustej liście gdy wszystkie odrzucone
- **Obsługiwane interakcje**:
  - Delegacja akcji do poszczególnych kart
- **Obsługiwana walidacja**: Brak bezpośredniej
- **Typy**: `ReviewBoardProps`
- **Propsy**:
  - `proposals: FlashcardProposalViewModel[]`
  - `onProposalUpdate: (id: string, updates: Partial<FlashcardProposalViewModel>) => void`
  - `onProposalAccept: (id: string) => void`
  - `onProposalReject: (id: string) => void`

### FlashcardProposalCard

- **Opis**: Pojedyncza karta propozycji fiszki z możliwością podglądu, edycji, akceptacji i odrzucenia. Wyświetla przód i tył fiszki oraz przyciski akcji.
- **Główne elementy**:
  - `<li>` lub `<article>` jako kontener karty
  - `ProposalContent` - wyświetlanie front/back (tryb podglądu)
  - `ProposalEditForm` - formularz edycji (tryb edycji)
  - `ProposalActions` - przyciski akcji
  - Wizualne oznaczenie stanu (zaakceptowana/edytowana/odrzucona)
- **Obsługiwane interakcje**:
  - Przełączanie trybu edycji
  - Edycja pól front/back
  - Akceptacja propozycji
  - Odrzucenie propozycji
  - Cofnięcie odrzucenia
- **Obsługiwana walidacja**:
  - `front`: wymagane, max 200 znaków
  - `back`: wymagane, max 500 znaków
  - Wyświetlanie błędów walidacji przy polach
- **Typy**: 
  - `FlashcardProposalCardProps`
  - `FlashcardProposalViewModel`
- **Propsy**:
  - `proposal: FlashcardProposalViewModel`
  - `onUpdate: (updates: Partial<FlashcardProposalViewModel>) => void`
  - `onAccept: () => void`
  - `onReject: () => void`

### ProposalActions

- **Opis**: Zestaw przycisków akcji dla pojedynczej propozycji fiszki.
- **Główne elementy**:
  - `<Button>` Edytuj (ikona ołówka)
  - `<Button>` Akceptuj (ikona check, warunkowy)
  - `<Button>` Odrzuć (ikona X)
  - `<Button>` Cofnij odrzucenie (warunkowy)
- **Obsługiwane interakcje**:
  - `onEditToggle` - przełączenie trybu edycji
  - `onAccept` - akceptacja propozycji
  - `onReject` - odrzucenie propozycji
  - `onUndoReject` - cofnięcie odrzucenia
- **Obsługiwana walidacja**: Brak
- **Typy**: `ProposalActionsProps`
- **Propsy**:
  - `isEditing: boolean`
  - `isAccepted: boolean`
  - `isRejected: boolean`
  - `onEditToggle: () => void`
  - `onAccept: () => void`
  - `onReject: () => void`
  - `onUndoReject: () => void`
  - `hasValidationErrors: boolean`

### BulkActionsBar

- **Opis**: Sticky footer z przyciskami akcji zbiorczych - zapisanie zaakceptowanych fiszek oraz odrzucenie wszystkich.
- **Główne elementy**:
  - `<div>` sticky na dole ekranu
  - `<Button>` "Zapisz X fiszek" (primary, z licznikiem)
  - `<Button>` "Odrzuć wszystkie" (destructive/outline)
  - Komunikat gdy brak zaakceptowanych
- **Obsługiwane interakcje**:
  - `onSave` - zapisanie zaakceptowanych fiszek
  - `onRejectAll` - odrzucenie wszystkich propozycji
- **Obsługiwana walidacja**: 
  - Przycisk "Zapisz" disabled gdy `acceptedCount === 0` lub `isSaving`
  - Przycisk "Zapisz" disabled gdy jakiekolwiek zaakceptowane mają błędy walidacji
- **Typy**: `BulkActionsBarProps`
- **Propsy**:
  - `acceptedCount: number`
  - `onSave: () => void`
  - `onRejectAll: () => void`
  - `isSaving: boolean`
  - `hasValidationErrors: boolean`

### ErrorAlert

- **Opis**: Komponent wyświetlający komunikaty błędów (błędy API, błędy sieci) z możliwością zamknięcia.
- **Główne elementy**:
  - Shadcn/ui `Alert` z wariantem `destructive`
  - Ikona błędu
  - Tekst komunikatu
  - Przycisk zamknięcia
- **Obsługiwane interakcje**:
  - `onDismiss` - zamknięcie alertu
- **Obsługiwana walidacja**: Brak
- **Typy**: `ErrorAlertProps`
- **Propsy**:
  - `message: string`
  - `onDismiss: () => void`

## 5. Typy

### Istniejące typy (z `src/types.ts`)

```typescript
// Komenda tworzenia generacji
type CreateGenerationCommand = {
  source_text: string
}

// Odpowiedź z API generacji
type CreateGenerationResponseDto = {
  generation_id: string
  flashcards_proposals: GenerationFlashcardProposalDto[]
  generated_count: number
}

// Pojedyncza propozycja fiszki z API
type GenerationFlashcardProposalDto = {
  front: string
  back: string
  source: "ai-full" | "ai-edited" | "manual"
}

// Komenda tworzenia fiszek
type FlashcardDraftCommand = {
  front: string
  back: string
  source: "ai-full" | "ai-edited" | "manual"
  generation_id: string | null
}

type CreateFlashcardsCommand = {
  flashcards: FlashcardDraftCommand[]
}

// Odpowiedź z API tworzenia fiszek
type CreateFlashcardsResponseDto = {
  flashcards: FlashcardDetailDto[]
}
```

### Nowe typy ViewModel (do utworzenia w `src/components/generate/types.ts`)

```typescript
/**
 * Stan pojedynczej propozycji fiszki rozszerzony o metadane UI
 */
export interface FlashcardProposalViewModel {
  /** Tymczasowy identyfikator frontendowy (np. crypto.randomUUID()) */
  id: string
  /** Treść przodu fiszki */
  front: string
  /** Treść tyłu fiszki */
  back: string
  /** Oryginalna treść przodu (do wykrywania edycji) */
  originalFront: string
  /** Oryginalna treść tyłu (do wykrywania edycji) */
  originalBack: string
  /** Czy propozycja została zaakceptowana */
  isAccepted: boolean
  /** Czy propozycja została odrzucona */
  isRejected: boolean
  /** Czy propozycja jest w trybie edycji */
  isEditing: boolean
  /** Błędy walidacji dla poszczególnych pól */
  validationErrors: {
    front?: string
    back?: string
  }
}

/**
 * Stałe walidacyjne
 */
export const VALIDATION_LIMITS = {
  SOURCE_TEXT_MIN: 1000,
  SOURCE_TEXT_MAX: 10000,
  FRONT_MAX: 200,
  BACK_MAX: 500,
} as const

/**
 * Możliwe stany widoku generatora
 */
export type GenerationViewState = 
  | { status: "idle" }
  | { status: "generating" }
  | { status: "review"; generationId: string; proposals: FlashcardProposalViewModel[] }
  | { status: "saving" }
  | { status: "success"; savedCount: number }
  | { status: "error"; message: string }

/**
 * Props dla głównego komponentu widoku
 */
export interface GenerateViewState {
  sourceText: string
  viewState: GenerationViewState
  proposals: FlashcardProposalViewModel[]
}

/**
 * Wynik walidacji tekstu źródłowego
 */
export interface SourceTextValidationResult {
  isValid: boolean
  error: string | null
  characterCount: number
}

/**
 * Wynik walidacji propozycji fiszki
 */
export interface ProposalValidationResult {
  isValid: boolean
  errors: {
    front?: string
    back?: string
  }
}
```

## 6. Zarządzanie stanem

### Custom Hook: `useFlashcardGeneration`

Hook zarządzający całym flow generowania fiszek, odpowiedzialny za:

1. **Stan tekstu źródłowego** z persystencją w localStorage
2. **Stan generowania** (idle → generating → review/error)
3. **Stan propozycji** z operacjami CRUD
4. **Stan zapisywania** fiszek

```typescript
// src/components/generate/hooks/useFlashcardGeneration.ts

interface UseFlashcardGenerationReturn {
  // Stan tekstu źródłowego
  sourceText: string
  setSourceText: (text: string) => void
  sourceTextValidation: SourceTextValidationResult
  
  // Stan generowania
  isGenerating: boolean
  generateFlashcards: () => Promise<void>
  
  // Stan propozycji
  proposals: FlashcardProposalViewModel[]
  generationId: string | null
  updateProposal: (id: string, updates: Partial<FlashcardProposalViewModel>) => void
  acceptProposal: (id: string) => void
  rejectProposal: (id: string) => void
  rejectAllProposals: () => void
  
  // Statystyki
  acceptedCount: number
  hasValidationErrors: boolean
  
  // Zapisywanie
  isSaving: boolean
  saveAcceptedFlashcards: () => Promise<void>
  
  // Błędy
  error: string | null
  clearError: () => void
  
  // Reset
  resetToInitial: () => void
}

export function useFlashcardGeneration(): UseFlashcardGenerationReturn
```

### Szczegóły implementacji hooka

1. **Persystencja tekstu źródłowego**:
   - Klucz localStorage: `flashcard-generator-draft`
   - Debounced zapis (500ms delay)
   - Ładowanie przy inicjalizacji

2. **Walidacja tekstu źródłowego**:
   - Real-time walidacja przy każdej zmianie
   - Min 1000 znaków, max 10000 znaków

3. **Generowanie propozycji**:
   - Wywołanie POST `/api/generations`
   - Transformacja `GenerationFlashcardProposalDto[]` → `FlashcardProposalViewModel[]`
   - Dodanie ID, stanu początkowego (isAccepted: true)

4. **Zarządzanie propozycjami**:
   - Wszystkie operacje na immutable state
   - Automatyczna walidacja przy edycji
   - Wykrywanie edycji (porównanie z oryginałem)

5. **Zapisywanie fiszek**:
   - Filtrowanie zaakceptowanych propozycji
   - Mapowanie na `FlashcardDraftCommand[]` z właściwym `source`:
     - `ai-full` jeśli nieedytowana
     - `ai-edited` jeśli zmodyfikowana
   - Wywołanie POST `/api/flashcards`
   - Czyszczenie localStorage po sukcesie

## 7. Integracja API

### POST `/api/generations`

**Cel**: Inicjalizacja procesu generowania propozycji fiszek przez AI

**Request**:
```typescript
interface CreateGenerationRequest {
  source_text: string // 1000-10000 znaków
}
```

**Response (sukces - 201)**:
```typescript
interface CreateGenerationResponse {
  generation_id: string
  flashcards_proposals: Array<{
    front: string
    back: string
    source: "ai-full"
  }>
  generated_count: number
}
```

**Błędy**:
- `400` - Błąd walidacji (tekst za krótki/za długi)
- `500` - Błąd serwisu AI (logowane w `generation_error_logs`)

**Implementacja frontendowa**:
```typescript
async function createGeneration(sourceText: string): Promise<CreateGenerationResponse> {
  const response = await fetch('/api/generations', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ source_text: sourceText }),
  })
  
  if (!response.ok) {
    const error = await response.json()
    throw new GenerationError(error.message, response.status)
  }
  
  return response.json()
}
```

### POST `/api/flashcards`

**Cel**: Zapisanie zaakceptowanych fiszek do bazy danych

**Request**:
```typescript
interface CreateFlashcardsRequest {
  flashcards: Array<{
    front: string      // max 200 znaków
    back: string       // max 500 znaków
    source: "ai-full" | "ai-edited" | "manual"
    generation_id: string | null
  }>
}
```

**Response (sukces - 201)**:
```typescript
interface CreateFlashcardsResponse {
  flashcards: Array<{
    id: string
    front: string
    back: string
    source: string
    generation_id: string | null
    created_at: string
    updated_at: string
  }>
}
```

**Błędy**:
- `400` - Błąd walidacji (przekroczone limity znaków, nieprawidłowy source)
- `404` - Generacja nie znaleziona (dla source ai-full/ai-edited)
- `500` - Błąd serwera

**Implementacja frontendowa**:
```typescript
async function saveFlashcards(
  flashcards: FlashcardDraftCommand[]
): Promise<CreateFlashcardsResponse> {
  const response = await fetch('/api/flashcards', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ flashcards }),
  })
  
  if (!response.ok) {
    const error = await response.json()
    throw new SaveFlashcardsError(error.message, response.status)
  }
  
  return response.json()
}
```

## 8. Interakcje użytkownika

### 1. Wprowadzanie tekstu źródłowego

| Akcja użytkownika | Reakcja systemu |
|-------------------|-----------------|
| Wklejenie/wpisanie tekstu | Aktualizacja stanu, zapis do localStorage, aktualizacja licznika znaków |
| Tekst < 1000 znaków | Licznik zmienia kolor na czerwony, przycisk "Generuj" nieaktywny |
| Tekst > 10000 znaków | Licznik zmienia kolor na czerwony, przycisk "Generuj" nieaktywny |
| Tekst w zakresie 1000-10000 | Licznik zielony, przycisk "Generuj" aktywny |

### 2. Generowanie propozycji

| Akcja użytkownika | Reakcja systemu |
|-------------------|-----------------|
| Kliknięcie "Generuj" | Wyświetlenie loadera (skeleton cards), wywołanie API |
| Sukces API | Wyświetlenie listy propozycji, wszystkie domyślnie zaakceptowane |
| Błąd API | Wyświetlenie komunikatu błędu, możliwość ponowienia |

### 3. Recenzja propozycji

| Akcja użytkownika | Reakcja systemu |
|-------------------|-----------------|
| Kliknięcie "Edytuj" na karcie | Przełączenie karty w tryb edycji (formularze input) |
| Edycja pola front/back | Real-time walidacja, oznaczenie jako "edytowana" |
| Kliknięcie "Zapisz" w trybie edycji | Walidacja, wyjście z trybu edycji jeśli poprawne |
| Kliknięcie "Anuluj" w trybie edycji | Przywrócenie oryginalnych wartości, wyjście z trybu edycji |
| Kliknięcie "Akceptuj" | Oznaczenie karty jako zaakceptowanej (jeśli nie była) |
| Kliknięcie "Odrzuć" | Oznaczenie karty jako odrzuconej, wizualne wygaszenie |
| Kliknięcie "Cofnij" na odrzuconej | Przywrócenie karty do stanu zaakceptowanej |
| Rozwinięcie "Tekst źródłowy" | Wyświetlenie akordeonu z oryginalnym tekstem |

### 4. Akcje zbiorcze

| Akcja użytkownika | Reakcja systemu |
|-------------------|-----------------|
| Kliknięcie "Zapisz X fiszek" | Loader na przycisku, wywołanie API, przekierowanie po sukcesie |
| Kliknięcie "Odrzuć wszystkie" | Dialog potwierdzenia, reset widoku do formularza |

## 9. Warunki i walidacja

### Walidacja tekstu źródłowego

| Warunek | Komponent | Wpływ na UI |
|---------|-----------|-------------|
| `length < 1000` | `SourceTextForm`, `CharacterCounter` | Przycisk "Generuj" disabled, licznik czerwony, komunikat "Minimum 1000 znaków" |
| `length > 10000` | `SourceTextForm`, `CharacterCounter` | Przycisk "Generuj" disabled, licznik czerwony, komunikat "Maximum 10000 znaków" |
| `1000 <= length <= 10000` | `SourceTextForm`, `CharacterCounter` | Przycisk "Generuj" enabled, licznik zielony |

### Walidacja propozycji fiszek

| Warunek | Komponent | Wpływ na UI |
|---------|-----------|-------------|
| `front.length === 0` | `FlashcardProposalCard` | Pole oznaczone błędem, komunikat "Pole wymagane" |
| `front.length > 200` | `FlashcardProposalCard` | Pole oznaczone błędem, komunikat "Maksymalnie 200 znaków" |
| `back.length === 0` | `FlashcardProposalCard` | Pole oznaczone błędem, komunikat "Pole wymagane" |
| `back.length > 500` | `FlashcardProposalCard` | Pole oznaczone błędem, komunikat "Maksymalnie 500 znaków" |

### Walidacja akcji zbiorczych

| Warunek | Komponent | Wpływ na UI |
|---------|-----------|-------------|
| `acceptedCount === 0` | `BulkActionsBar` | Przycisk "Zapisz" disabled, komunikat "Brak zaakceptowanych fiszek" |
| Którakolwiek zaakceptowana ma błędy | `BulkActionsBar` | Przycisk "Zapisz" disabled, komunikat "Popraw błędy walidacji" |
| `isSaving === true` | `BulkActionsBar` | Oba przyciski disabled, loader na "Zapisz" |

### Logika określania `source` przy zapisie

```typescript
function determineSource(proposal: FlashcardProposalViewModel): "ai-full" | "ai-edited" {
  const isEdited = 
    proposal.front !== proposal.originalFront || 
    proposal.back !== proposal.originalBack
  
  return isEdited ? "ai-edited" : "ai-full"
}
```

## 10. Obsługa błędów

### Błędy walidacji (frontend)

| Scenariusz | Obsługa |
|------------|---------|
| Tekst źródłowy poza zakresem | Wyświetlenie komunikatu inline pod textarea, przycisk disabled |
| Pole fiszki puste | Wyświetlenie komunikatu pod polem, oznaczenie pola czerwonym obramowaniem |
| Pole fiszki przekracza limit | Wyświetlenie komunikatu z liczbą znaków, oznaczenie pola |

### Błędy API - Generowanie

| Kod błędu | Komunikat użytkownika | Akcja |
|-----------|----------------------|-------|
| 400 | "Tekst źródłowy musi mieć od 1000 do 10000 znaków" | Wyświetlenie alertu, powrót do formularza |
| 500 (AI error) | "Wystąpił problem z usługą AI. Spróbuj ponownie później." | Wyświetlenie alertu z przyciskiem "Spróbuj ponownie" |
| Network error | "Brak połączenia z serwerem. Sprawdź połączenie internetowe." | Wyświetlenie alertu z przyciskiem "Spróbuj ponownie" |

### Błędy API - Zapisywanie

| Kod błędu | Komunikat użytkownika | Akcja |
|-----------|----------------------|-------|
| 400 | "Niektóre fiszki zawierają nieprawidłowe dane." | Wyświetlenie szczegółów błędów przy odpowiednich kartach |
| 404 | "Sesja generowania wygasła. Wygeneruj fiszki ponownie." | Wyświetlenie alertu, reset do formularza |
| 500 | "Nie udało się zapisać fiszek. Spróbuj ponownie." | Wyświetlenie alertu, dane propozycji zachowane |
| Network error | "Brak połączenia z serwerem." | Wyświetlenie alertu, dane propozycji zachowane |

### Ochrona przed utratą danych

1. **localStorage dla draftu tekstu** - tekst źródłowy zapisywany automatycznie
2. **Potwierdzenie przed opuszczeniem** - `beforeunload` event gdy są niezapisane propozycje
3. **Retry dla nieudanych zapisów** - możliwość ponowienia operacji bez utraty danych

## 11. Kroki implementacji

### Faza 1: Przygotowanie struktury

1. Utworzenie pliku strony `src/pages/generate.astro` z bazowym layoutem
2. Utworzenie struktury katalogów dla komponentów:
   - `src/components/generate/`
   - `src/components/generate/hooks/`
   - `src/components/generate/types.ts`
3. Zdefiniowanie typów ViewModel w `src/components/generate/types.ts`
4. Instalacja brakujących komponentów Shadcn/ui (Skeleton, Alert, Collapsible, Textarea)

### Faza 2: Implementacja komponentów prezentacyjnych

5. Implementacja `CharacterCounter` - prosty komponent wyświetlający licznik
6. Implementacja `SourceTextInput` - textarea z obsługą dostępności
7. Implementacja `GenerateButton` - przycisk z obsługą stanu ładowania
8. Implementacja `SourceTextForm` - kompozycja powyższych z walidacją
9. Implementacja `GenerationLoader` - skeleton cards

### Faza 3: Implementacja komponentów recenzji

10. Implementacja `ProposalActions` - przyciski akcji dla karty
11. Implementacja `FlashcardProposalCard` - karta z trybem podglądu i edycji
12. Implementacja `ReviewBoard` - lista kart z obsługą pustego stanu
13. Implementacja `SourceTextPreview` - zwijany akordeon
14. Implementacja `BulkActionsBar` - sticky footer z akcjami zbiorczymi
15. Implementacja `ReviewSection` - kontener sekcji recenzji

### Faza 4: Implementacja logiki biznesowej

16. Implementacja funkcji pomocniczych walidacji
17. Implementacja hooka `useFlashcardGeneration`:
    - Stan tekstu źródłowego z localStorage
    - Wywołania API (generowanie, zapisywanie)
    - Zarządzanie propozycjami
18. Implementacja obsługi błędów i komunikatów

### Faza 5: Integracja

19. Implementacja głównego komponentu `GenerateView`
20. Integracja z stroną Astro
21. Implementacja `ErrorAlert` i globalnej obsługi błędów
22. Dodanie ochrony przed utratą danych (`beforeunload`)

### Faza 6: Stylowanie i UX

23. Dopracowanie stylów (responsive, dark mode)
24. Implementacja animacji i przejść
25. Dostępność (ARIA, focus management, keyboard navigation)

### Faza 7: Testowanie i optymalizacja

26. Testy komponentów (jednostkowe)
27. Testy integracyjne (flow użytkownika)
28. Optymalizacja wydajności (React.memo, useMemo, useCallback)
29. Testy dostępności (screen reader, keyboard)

