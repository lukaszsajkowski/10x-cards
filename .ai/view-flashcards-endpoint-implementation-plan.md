## API Endpoint Implementation Plan: GET /flashcards

### 1. Przegląd punktu końcowego

Punkt końcowy zwraca stronicowaną, filtrowaną i sortowalną listę fiszek (flashcards) należących do uwierzytelnionego użytkownika. Zgodny z Astro Server Endpoints oraz Supabase jako warstwą DB. Dane wejściowe walidowane Zod-em, logika zapytania wydzielona do serwisu.

### 2. Szczegóły żądania

- Metoda HTTP: GET
- URL: `/flashcards`
- Parametry zapytania:
  - Wymagane: brak
  - Opcjonalne:
    - `page`: liczba całkowita, domyślnie 1, minimalnie 1
    - `limit`: liczba całkowita, domyślnie 10, minimalnie 1, maksymalnie 100
    - `sort`: dozwolone wartości: `created_at` (domyślnie `created_at`)
    - `order`: `asc` | `desc` (domyślnie `desc`)
    - `source`: `ai-full` | `ai-edited` | `manual`
    - `generation_id`: UUID
- Nagłówki:
  - `Authorization: Bearer <token>` (docelowo). Na etapie bieżącej implementacji wykorzystywany jest `DEFAULT_USER_ID`; w produkcji zastąpić pozyskaniem `userId` z kontekstu uwierzytelnienia.
- Body: brak

### 3. Wykorzystywane typy

- DTO (istniejące w `src/types.ts`):
  - `FlashcardListQueryDto`
  - `FlashcardListItemDto`
  - `FlashcardListResponseDto`
- Schematy Zod (do dodania w `src/lib/flashcard.schema.ts`):
  - `flashcardListQuerySchema` do walidacji i domyślnych wartości parametrów zapytania
- Modele poleceń (Command): nie dotyczy dla `GET`

Minimalny schemat odpowiedzi (przykład):

```json
{
  "data": [
    {
      "id": "uuid",
      "front": "Question",
      "back": "Answer",
      "source": "manual",
      "created_at": "2025-01-01T10:00:00.000Z",
      "updated_at": "2025-01-02T10:00:00.000Z"
    }
  ],
  "pagination": { "page": 1, "limit": 10, "total": 100 }
}
```

### 4. Szczegóły odpowiedzi

- 200: Zwraca `FlashcardListResponseDto`
- 400: Nieprawidłowe dane wejściowe (parametry zapytania)
- 401: Brak/nieprawidłowy token (gdy nie można ustalić `userId`)
- 500: Błąd serwera/bazy danych
- 404: Nieużywany dla listy (pusta lista zwraca 200 z `data: []`)

### 5. Przepływ danych

1. Handler `GET` w `src/pages/api/flashcards.ts`:
   - Ustal `supabase` z `locals.supabase`; zwróć 500, jeśli brak klienta.
   - (Docelowo) Ustal `userId` z kontekstu uwierzytelnienia; tymczasowo użyj `DEFAULT_USER_ID`.
   - Odczytaj `URLSearchParams` i zbuduj obiekt do walidacji.
   - Waliduj parametry przez `flashcardListQuerySchema`. W razie błędu: 400 z listą błędów.
   - Wywołaj `flashcardService.listFlashcards({ supabase, userId, query })`.
   - Zwróć 200 z `FlashcardListResponseDto`.
2. Serwis `FlashcardService.listFlashcards` (nowy, w `src/lib/flashcard.service.ts`):
   - Przyjmij `supabase`, `userId`, `query`.
   - Wylicz `page`, `limit`, `offset`.
   - Zbuduj zapytanie:
     - `.from("flashcards")`
     - `.select("id, front, back, source, created_at, updated_at", { count: "exact" })`
     - `.eq("user_id", userId)`
     - Opcjonalnie `.eq("source", query.source)`, `.eq("generation_id", query.generation_id)`
     - `.order(query.sort ?? "created_at", { ascending: query.order === "asc" })`
     - `.range(offset, offset + limit - 1)`
   - Mapuj wynik do `FlashcardListItemDto[]`, policz `total` z pola `count`.
   - Zwróć `FlashcardListResponseDto`.

### 6. Względy bezpieczeństwa

- Autoryzacja: zwracaj wyłącznie rekordy użytkownika (`.eq("user_id", userId)`).
- Uwierzytelnianie: w produkcji pobieraj `userId` z Supabase Auth (np. token Bearer → `auth.getUser()` lub sesja), a w razie braku → 401.
- RLS: docelowo włączone polityki RLS spójne z `user_id`. Obecne filtrowanie po `user_id` zachowaj nawet przy RLS (obrona warstwowa).
- Walidacja: whitelist dla `sort` i `order`; walidacja UUID `generation_id`; ograniczenia `page`/`limit`.
- Dane wrażliwe: nie eksponuj `user_id` w odpowiedzi.
- Prerendering: `export const prerender = false` (już obecne w pliku).

### 7. Obsługa błędów

- 400 Validation Error:
  - Nieprawidłowe wartości `page`, `limit`, `order`, `sort`, `source`, `generation_id`
  - Odpowiedź: `{ "message": "Validation error", "errors": { ... } }`
- 401 Unauthorized:
  - Brak możliwości ustalenia `userId` z kontekstu auth (po wdrożeniu auth)
  - Odpowiedź: `{ "message": "Unauthorized" }`
- 500 Server Error:
  - Błąd zapytania do DB (`error` z Supabase)
  - Odpowiedź: `{ "message": "Failed to fetch flashcards" }`
- 404 Not Found:
  - Nie dotyczy listy; pusta lista = 200 z `data: []`

Logowanie błędów do DB: nie dotyczy tego endpointu (tabela `generation_error_logs` służy wyłącznie dla generacji). Loguj na serwerze (`console.error`) i w przyszłości rozważ ogólną tabelę błędów API.

### 8. Rozważania dotyczące wydajności

- Limit górny `limit` = 100, domyślnie 10.
- Wybieramy tylko potrzebne kolumny.
- Używamy `count: "exact"`; dla dużych zbiorów rozważ:
  - brak liczenia (`total`) lub
  - `count: "planned"` albo osobne, rzadziej wykonywane zapytanie z `head: true`.
- Indeksy (wg planu DB):
  - `flashcards(user_id)` i `flashcards(generation_id)` (już przewidziane)
  - Zalecane: indeks złożony `flashcards(user_id, created_at DESC)` dla domyślnego sortowania
- Unikaj nadmiernych filtrów bez indeksów.

### 9. Etapy wdrożenia

1) Walidacja zapytania (Zod):
   - Dodaj w `src/lib/flashcard.schema.ts`:
     - `flashcardListQuerySchema` z `z.object({ page, limit, sort, order, source, generation_id })`
     - Użyj `z.preprocess` do konwersji `string` → `number` dla `page`/`limit`
     - Domyślne: `page=1`, `limit=10`, `sort="created_at"`, `order="desc"`
     - Ograniczenia: `limit <= 100`, `page >= 1`

2) Serwis:
   - W `src/lib/flashcard.service.ts` dodaj metodę:
     - `listFlashcards(params: { supabase: SupabaseClient; userId: string; query: FlashcardListQueryDto; }): Promise<FlashcardListResponseDto>`
   - Zaimplementuj zapytanie z filtrami, sortowaniem, `range` i `count: "exact"`.

3) Endpoint:
   - W `src/pages/api/flashcards.ts`:
     - Dodaj `export const GET: APIRoute = async ({ request, locals }) => { ... }`
     - Pobierz `locals.supabase`, ustal `userId` (tymczasowo `DEFAULT_USER_ID`)
     - Waliduj parametry: `flashcardListQuerySchema.safeParse(...)`
     - Wywołaj serwis i zwróć `{ status: 200, body: FlashcardListResponseDto }`
     - Błędy: 400 (walidacja), 401 (brak `userId` po wdrożeniu auth), 500 (inne)

4) Zgodność ze stackiem i zasadami:
   - Użyj `SupabaseClient` z `src/db/supabase.client.ts`
   - Nie importuj klienta Supabase bezpośrednio w endpointzie — korzystaj z `locals.supabase`
   - `export const prerender = false` w pliku endpointu

5) Indeksy (opcjonalna migracja optymalizacyjna):
   - Dodać migrację tworzącą indeks złożony `flashcards(user_id, created_at DESC)` jeśli wolumen rośnie

6) Testy manualne:
   - `/flashcards?page=1&limit=10`
   - `/flashcards?order=asc`
   - `/flashcards?source=manual`
   - `/flashcards?generation_id=<uuid>`
   - Parametry nieprawidłowe → 400

7) Future-proof (po wdrożeniu auth):
   - Zastąpić `DEFAULT_USER_ID` realnym `userId` z Supabase Auth
   - Dodać obsługę 401/403 na podstawie sesji/tokena
   - Włączyć RLS i zweryfikować polityki dla `flashcards`


