## API Endpoint Implementation Plan: PUT /flashcards/{id}

### 1. Przegląd punktu końcowego
- Cel: Aktualizacja istniejącej fiszki użytkownika.
- Zakres: Aktualizacja wybranych pól: `front`, `back`, `source`, `generation_id` z zachowaniem reguł spójności (zależności `source` ↔ `generation_id`) oraz własności zasobu przez użytkownika.
- Kontekst: Astro 5 (server endpoints), Zod (walidacja), Supabase (DB, auth), TypeScript 5.

### 2. Szczegóły żądania
- Metoda HTTP: PUT
- Struktura URL: `/api/flashcards/{id}`
- Parametry:
  - Wymagane (path):
    - `id` (UUID): identyfikator fiszki do aktualizacji
  - Opcjonalne (query): brak
- Nagłówki wymagane:
  - `Content-Type: application/json`
  - Autoryzacja: docelowo kontekst uwierzytelnienia przez Supabase (sesja w `locals.supabase`). W implementacji lokalnej tymczasowo `DEFAULT_USER_ID`.
- Request Body (JSON): pola do aktualizacji (częściowa aktualizacja)
  - `front?: string` (1..200)
  - `back?: string` (1..500)
  - `source?: "ai-full" | "ai-edited" | "manual"`
  - `generation_id?: string | null` (UUID lub null)
- Reguły walidacyjne ciała:
  - Co najmniej jedno pole musi zostać dostarczone (nie pusta aktualizacja).
  - Jeśli podano jednocześnie `source` i `generation_id`:
    - `source === "manual"` wymaga `generation_id === null`
    - `source ∈ {"ai-full","ai-edited"}` wymaga `generation_id` jako UUID (nie null)
  - Jeśli podano tylko `source`:
    - Dla `manual` ustawimy `generation_id` na null (serwis).
    - Dla źródeł AI wymagane jest dostarczenie `generation_id` (walidacja Zod na poziomie żądania).
  - Jeśli podano tylko `generation_id`:
    - Serwis zweryfikuje spójność względem aktualnego `source` w DB:
      - przy aktualnym `source === "manual"` — odrzuci żądanie (400).
      - przy aktualnym `source ∈ AI` — zweryfikuje własność i istnienie generacji.

Przykład żądania (zmiana treści i oznaczenie jako edytowane AI z linkiem do generacji):

```json
{
  "front": "Pytanie: Co to jest closure w JS?",
  "back": "Odpowiedź: Funkcja pamiętająca leksykalne środowisko.",
  "source": "ai-edited",
  "generation_id": "2e6a9e00-8bf9-47a4-bd3a-1a6a2e1f9b39"
}
```

### 3. Wykorzystywane typy
- Z `src/types.ts`:
  - `UpdateFlashcardCommand` — wejściowy model aktualizacji: `Pick<TablesUpdate<"flashcards">, "front" | "back" | "source" | "generation_id">`
  - `UpdateFlashcardResponseDto` — alias do `FlashcardDetailDto` (obiekt fiszki po aktualizacji)
  - `FlashcardDetailDto`
- Z `src/lib/flashcard.schema.ts` (do dodania):
  - `updateFlashcardCommandSchema` — Zod walidacja request body (częściowa aktualizacja + reguły krzyżowe)
  - istniejący `flashcardIdParamSchema` dla walidacji `{ id }`

### 4. Szczegóły odpowiedzi
- Sukces:
  - Status: 200 OK
  - Body: `UpdateFlashcardResponseDto` (tożsame z `FlashcardDetailDto`)
  - Nagłówki: `Content-Type: application/json`

Przykład odpowiedzi:

```json
{
  "id": "c2a0c2c6-1d96-4a3a-9a7d-2d1f0e2c8d5f",
  "front": "Pytanie: Co to jest closure w JS?",
  "back": "Odpowiedź: Funkcja pamiętająca leksykalne środowisko.",
  "source": "ai-edited",
  "generation_id": "2e6a9e00-8bf9-47a4-bd3a-1a6a2e1f9b39",
  "created_at": "2025-11-16T10:12:00.000Z",
  "updated_at": "2025-11-16T11:02:12.000Z"
}
```

- Błędy:
  - 400: nieprawidłowe dane wejściowe (np. walidacja Zod, pusta aktualizacja, niespójność `source`/`generation_id`)
  - 401: brak uwierzytelnienia (docelowo: brak sesji / brak userId)
  - 404: fiszka nie istnieje lub nie należy do użytkownika
  - 500: nieoczekiwany błąd serwera / błąd zapisu

### 5. Przepływ danych
1) Klient → API (Astro route `src/pages/api/flashcards/[id].ts`):
   - Odczyt `locals.supabase` (guard; 500, gdy brak).
   - Walidacja `params.id` przez `flashcardIdParamSchema`.
   - Parsowanie JSON, walidacja przez `updateFlashcardCommandSchema`.
   - Wywołanie `flashcardService.updateFlashcard({ supabase, userId, flashcardId, command })`.
   - Mapowanie wyjątków serwisu na kody statusu i odpowiedzi JSON.
   - Zwrócenie 200 z obiektem fiszki.

2) Warstwa serwisu (`src/lib/flashcard.service.ts`):
   - Pobranie bieżącej fiszki: `select ... where id = :id and user_id = :userId` (guard 404 jeśli brak).
   - Wyznaczenie docelowych wartości:
     - Jeżeli `source === "manual"` → ustawić `generation_id = null`.
     - Jeżeli `source ∈ AI` → wymaga `generation_id` (z żądania).
     - Jeżeli zmienia się tylko `generation_id` → sprawdzić, czy aktualny `source` w DB jest ∈ AI (inaczej 400).
   - Walidacja własności/istnienia generacji:
     - Jeżeli docelowe `generation_id` ≠ null → select w `generations` z `user_id = :userId` i `id = :generation_id` (gdy brak → 404 `GENERATION_NOT_FOUND`).
   - Aktualizacja fiszki: `update ... returning` ograniczona do `id` i `user_id` (atomicznie).
   - Mapowanie na `FlashcardDetailDto`.

3) Baza danych (Supabase / Postgres):
   - Tabele: `flashcards`, `generations` (wg `db-plan.md`).
   - Indeksy: `flashcards.user_id`, `flashcards.generation_id`, `generations.user_id` (zgodnie z planem DB).

### 6. Względy bezpieczeństwa
- Autoryzacja:
  - Użycie `locals.supabase` i filtrowanie po `user_id` w każdej operacji (select/update).
  - Docelowo: wyprowadzenie `userId` z sesji; w wersji deweloperskiej `DEFAULT_USER_ID`.
- Walidacja wejścia:
  - Zod schemat z limitami długości i regułami krzyżowymi `source` ↔ `generation_id`.
  - Odrzucanie nieznanych pól (whitelist).
- Spójność referencyjna:
  - Weryfikacja, że `generation_id` (gdy ustawiane) istnieje i należy do tego samego użytkownika.
- RLS:
  - Nawet przy wyłączonym RLS wymuszamy `user_id` w zapytaniach; przy włączonym — pozostaje dodatkowa linia obrony.
- Ekspozycja błędów:
  - Zwracamy przyjazne komunikaty; szczegóły techniczne wyłącznie w logach serwera.

### 7. Obsługa błędów
- 400 Bad Request:
  - Nieprawidłowy JSON (błąd parsowania).
  - Walidacja Zod (front/back length, enum source, uuid).
  - Pusta aktualizacja (brak pól do zmiany).
  - Niespójność: `source === "manual"` i `generation_id !== null` lub próba ustawienia `generation_id` przy aktualnym `source === "manual"`.
- 401 Unauthorized:
  - Brak kontekstu użytkownika (docelowo: brak sesji).
- 404 Not Found:
  - Fiszka o `id` nie istnieje lub nie należy do użytkownika.
  - Wskazana `generation_id` nie istnieje lub nie należy do użytkownika.
- 500 Internal Server Error:
  - Błąd komunikacji z DB lub inny nieoczekiwany wyjątek.

Kontrakty błędów (przykłady):

```json
{ "message": "Validation error", "errors": { "front": ["too long"] } }
```

```json
{ "message": "Flashcard not found" }
```

```json
{ "message": "Generation not found", "code": "GENERATION_NOT_FOUND" }
```

### 8. Rozważania dotyczące wydajności
- Operacja punktowa (pojedynczy rekord) — niska złożoność.
- Unikamy nadmiarowych round-tripów:
  - Jedno `select` do pobrania stanu i weryfikacji.
  - Warunkowe `select` do weryfikacji generacji (tylko jeśli potrzebne).
  - Pojedyncze `update ... returning` ograniczone do potrzebnych kolumn.
- Zwracamy tylko pola wymagane przez DTO.

### 9. Kroki implementacji
1) Schemat Zod:
   - Plik: `src/lib/flashcard.schema.ts`
   - Dodać:
     - `export const updateFlashcardCommandSchema = z.object({ front?: z.string().min(1).max(200), back?: z.string().min(1).max(500), source?: z.enum(["ai-full","ai-edited","manual"]), generation_id?: z.string().uuid().nullable() }).refine(obj => Object.keys(obj).length > 0, { message: "No fields to update" }).superRefine(...)`
       - `superRefine`: reguły krzyżowe, gdy podano oba pola `source` i `generation_id`. Wymóg `generation_id` przy zmianie `source` na AI.
   - Eksport typu: `export type UpdateFlashcardCommandInput = z.infer<typeof updateFlashcardCommandSchema>`

2) Serwis:
   - Plik: `src/lib/flashcard.service.ts`
   - Rozszerzyć `FlashcardServiceErrorCode` o:
     - `"FLASHCARD_NOT_FOUND" | "INVALID_UPDATE_PAYLOAD" | "INVALID_GENERATION_LINK"`
   - Dodać metodę:
     - `updateFlashcard(params: { supabase: SupabaseClient; userId: string; flashcardId: string; command: UpdateFlashcardCommand }): Promise<FlashcardDetailDto | null>`
   - Implementacja:
     - Select bieżącej fiszki po `id` i `user_id`; jeśli brak → `return null`.
     - Jeśli `command` puste → rzuć `FlashcardServiceError("No fields to update","INVALID_UPDATE_PAYLOAD")`.
     - Wyznacz docelowy `source` i `generation_id` (na bazie `command` i stanu).
     - Jeżeli docelowy `generation_id` ≠ null → zweryfikuj istnienie i własność w `generations` (w razie braku: rzuć z kodem `"GENERATION_NOT_FOUND"`).
     - Wykonaj `update ... returning` ograniczone po `id` i `user_id`; w razie błędu: `"FLASHCARDS_PERSISTENCE_FAILED"`.
     - Zmapuj wynik do `FlashcardDetailDto` i zwróć.

3) Endpoint:
   - Plik: `src/pages/api/flashcards/[id].ts`
   - Dodać handler `export const PUT: APIRoute = async (...) => { ... }`:
     - Guard `locals.supabase`.
     - Walidacja `{ id }` przez `flashcardIdParamSchema`.
     - Parsowanie JSON i walidacja `updateFlashcardCommandSchema`.
     - Wywołanie `flashcardService.updateFlashcard(...)`.
     - Mapowanie błędów:
       - `INVALID_UPDATE_PAYLOAD` → 400
       - `INVALID_GENERATION_LINK` → 400
       - `GENERATION_NOT_FOUND` → 404
       - `null` wynik (brak fiszki) → 404
       - Pozostałe → 500
     - Sukces → 200 z `UpdateFlashcardResponseDto`.

4) Testy ręczne (Postman/curl):
   - Aktualizacja treści (front/back).
   - Zmiana `source` na `manual` → `generation_id` zostaje `null`.
   - Zmiana `source` na `ai-edited` z prawidłowym `generation_id`.
   - Ustawienie `generation_id` przy aktualnym `source === "manual"` → 400.
   - `generation_id` nieistniejący / innego użytkownika → 404.

5) Porządki:
   - Lint/format.
   - Konsolidacja logów błędów (bez wrażliwych danych).


