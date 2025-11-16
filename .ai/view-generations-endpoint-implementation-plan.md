## API Endpoint Implementation Plan: GET /generations

### 1. Przegląd punktu końcowego

- Cel: Zwrócić listę żądań generacji (generations) dla uwierzytelnionego użytkownika.
- Zakres danych: Podsumowanie generacji bez pełnego `source_text` (projekcja kolumn na metadane), z metadanymi paginacji.
- Środowisko: Astro 5 (server endpoints), TypeScript 5, Supabase (DB i opcjonalnie Auth), Zod (walidacja).

### 2. Szczegóły żądania

- Metoda HTTP: GET
- Ścieżka URL: `/api/generations`
- Parametry zapytania:
  - Wymagane: brak
  - Opcjonalne:
    - `page` (number, domyślnie 1, min 1)
    - `limit` (number, domyślnie 10, min 1, max 50)
    - `order` (`"asc"` | `"desc"`, domyślnie `"desc"`) — sortowanie po `created_at`
- Body: brak
- Nagłówki: standardowe (`Accept: application/json`). Jeśli w przyszłości zostanie dodane uwierzytelnianie Supabase, nagłówki/autoryzacja będą obsługiwane poprzez sesję Supabase (middleware + cookies/headers).
- Wymóg Astro: `export const prerender = false` w pliku endpointu.

### 3. Wykorzystywane typy

- Z `src/types.ts`:
  - `GenerationListQueryDto` — model zapytania (page, limit, order).
  - `GenerationSummaryDto` — element listy (projekcja pól generacji: `id`, `generated_count`, `accepted_edited_count`, `accepted_unedited_count`, `source_text_length`, `created_at`, `updated_at`).
  - `GenerationListResponseDto` — wynik listowania: `{ data: GenerationSummaryDto[]; pagination: PaginationMetaDto }`.
  - `PaginationMetaDto` — `{ page, limit, total }`.
- Z `src/db/supabase.client.ts`:
  - `SupabaseClient` — typ klienta, którego należy używać w serwisie.

Dodatkowo w `src/lib/generation.schema.ts` należy dodać schemat zod: `generationListQuerySchema` (page, limit, order) oraz eksportowany typ wejścia z niego wyprowadzony (opcjonalnie).

### 4. Szczegóły odpowiedzi

- Statusy:
  - 200 — sukces (zwraca listę + metadane).
  - 400 — nieprawidłowe parametry zapytania (walidacja Zod).
  - 401 — brak uwierzytelnienia (jeśli egzekwowane; w obecnym stanie projektu możliwy fallback do `DEFAULT_USER_ID` tylko dla DEV).
  - 500 — błąd serwera/bazy danych.
- Struktura (200):
  - `data`: `GenerationSummaryDto[]`
  - `pagination`: `{ page: number; limit: number; total: number }`

### 5. Przepływ danych

1. Klient wywołuje `GET /api/generations?page=&limit=&order=`.
2. Endpoint Astro (`src/pages/api/generations.ts`):
   - Pozyskuje `locals.supabase` (wymóg z zasad backendowych).
   - Parsuje i waliduje query przez `generationListQuerySchema` (Zod).
   - Pozyskuje `userId`:
     - Docelowo: z Supabase Auth (np. `locals.supabase.auth.getUser()`), zgodnie z zasadami backendowymi.
     - Aktualnie w projekcie: fallback do `DEFAULT_USER_ID` (tylko środowisko DEV). Jeśli auth będzie aktywne — dla braku usera zwracamy 401.
   - Wywołuje serwis domenowy `generationService.listGenerations({ supabase, userId, page, limit, order })`.
3. Serwis (`src/lib/generation.service.ts`):
   - Buduje zapytanie do tabeli `generations`:
     - `select("id, generated_count, accepted_edited_count, accepted_unedited_count, source_text_length, created_at, updated_at", { count: "exact" })`
     - filtr: `eq("user_id", userId)`
     - sortowanie: `order("created_at", { ascending: order === "asc" })`
     - paginacja: `range(offset, offset + limit - 1)` gdzie `offset = (page - 1) * limit`
   - Zwraca `GenerationListResponseDto` z `data` i `pagination` (count -> total).
4. Endpoint formatuje odpowiedź JSON z nagłówkiem `content-type: application/json` i zwraca 200.

### 6. Względy bezpieczeństwa

- Uwierzytelnianie i autoryzacja:
  - Docelowo: identyfikacja usera przez Supabase Auth z `locals.supabase`. Twardo odrzucaj brak usera (401) w PROD.
  - RLS: zgodnie z planem DB, RLS powinien ograniczać odczyty do `user_id = auth.uid()`. Jeśli RLS jest wyłączony w DEV (migracja `disable_rls_policies.sql`), endpoint mimo to filtruje `user_id`.
- Walidacja wejścia:
  - `page` min 1, `limit` min 1, max 50, `order` w whitelist (`"asc" | "desc"`).
- Minimalizacja wycieku danych:
  - Projekcja pól — nie zwracamy `source_text`.
  - Komunikaty błędów: nie wypisujemy szczegółów DB do klienta.
- Ochrona zasobów:
  - Limit `limit` chroni przed nadmiernym obciążeniem.
  - `prerender = false` uniemożliwia statyczne budowanie endpointu.

### 7. Obsługa błędów

- 400 — błędne parametry zapytania (Zod `.safeParse` -> zwrot informacji o polach).
- 401 — brak sesji użytkownika (gdy auth aktywne i brak usera).
- 500 — błąd zapytań Supabase (np. `error` w odpowiedzi) lub brak spójności danych.
- Logowanie błędów:
  - Endpoint loguje `console.error("Failed to list generations", error)` przy 500.
  - Brak wpisu do `generation_error_logs` (ta tabela rejestruje błędy procesu generacji, nie listowania).

### 8. Rozważania dotyczące wydajności

- Indeksy:
  - Wg planu DB istnieją indeksy po `user_id`; rozważ dołożenie indeksu złożonego `(user_id, created_at)` dla stabilnego sortowania.
- Projekcja kolumn ograniczona do potrzeb listy — mniejsze payloady.
- Paginacja offsetowa z rozsądnym `limit` (max 50).
- `count: "exact"` — kosztowne przy dużych zbiorach; jeśli będzie wąskie gardło, można:
  - Przejść na `planned`/`estimated` count albo
  - Zwracać `hasMore` zamiast `total`.
- Stabilne sortowanie: `created_at` + ewentualnie fallback po `id` w przypadku równych timestampów (jeśli okaże się potrzebne).

### 9. Etapy wdrożenia

1) Walidacja wejścia (Zod):
   - Plik: `src/lib/generation.schema.ts`
   - Dodaj:
     - `export const generationListQuerySchema = z.object({ page: z.coerce.number().int().min(1).default(1), limit: z.coerce.number().int().min(1).max(50).default(10), order: z.enum(["asc", "desc"]).default("desc") })`
     - Typ wejścia z infer (opcjonalny).

2) Serwis domenowy — listowanie generacji:
   - Plik: `src/lib/generation.service.ts`
   - Dodaj metodę:
     - `listGenerations(params: { supabase: SupabaseClient; userId: string; page: number; limit: number; order: "asc" | "desc"; }): Promise<GenerationListResponseDto>`
   - Implementacja:
     - Wylicz `offset`.
     - Wykonaj zapytanie z `select(..., { count: "exact" })`, `eq("user_id", userId)`, `order("created_at", { ascending })`, `range(offset, offset + limit - 1)`.
     - Zmapuj wynik do `GenerationSummaryDto[]` (projekcja 1:1) i policz `pagination`.
     - W przypadku błędu rzuć `Error` (bez wrażliwych detali).

3) Endpoint API — GET handler:
   - Plik: `src/pages/api/generations.ts`
   - Dodaj na górze pliku: `export const prerender = false` (jeśli nie istnieje).
   - Dodaj `export const GET: APIRoute = async ({ url, locals }) => { ... }`
     - Pobierz `supabase` z `locals` i zwróć 500, jeśli brak (spójne z POST).
     - Parsuj i waliduj query przez `generationListQuerySchema.safeParse({ page: url.searchParams.get("page"), limit: url.searchParams.get("limit"), order: url.searchParams.get("order") })`.
     - Ustal `userId`:
       - Obecnie: `DEFAULT_USER_ID` (zachowanie DEV jak w POST).
       - Docelowo: z Supabase Auth — jeśli brak usera -> 401.
     - Wywołaj `generationService.listGenerations(...)`.
     - Zwróć 200 i JSON z wynikiem.
     - Obsłuż błędy: 400 (walidacja), 500 (inne), 401 (gdy auth aktywne i brak usera).

4) Spójność typów i importów:
   - Używaj `SupabaseClient` z `src/db/supabase.client.ts` (nie z `@supabase/supabase-js`).
   - DTO z `src/types.ts`.
   - Brak importu globalnego klienta w endpointach — wyłącznie `locals.supabase` (zgodnie z zasadami backendowymi).

5) Testy manualne:
   - Scenariusze:
     - Bez parametrów (defaults: `page=1&limit=10&order=desc`).
     - Granice walidacji: `page=0` (400), `limit=51` (400), `order=foo` (400).
     - Paginacja z wieloma stronami; weryfikacja `total`.
     - Brak `locals.supabase` (500) — symulacja.
     - Brak usera (401) — po włączeniu auth.

6) Względy bezpieczeństwa/produkcyjne:
   - Po wdrożeniu auth: usuń fallback `DEFAULT_USER_ID` w endpointach lub trzymaj w bloku DEV.
   - Upewnij się, że RLS jest aktywne w PROD.

7) Dokumentacja:
   - Uaktualnij `README.md` o parametry i przykładowe wywołania `GET /api/generations`.

---

### Załączniki i zgodność z regułami

- Zgodność ze stackiem: Astro 5, TS 5, Zod, Supabase, podejście SSR dla endpointu, brak prerender.
- Zgodność z regułami implementacji:
  - Walidacja Zod w endpointach.
  - Logika domenowa wyodrębniona do serwisu (`generation.service.ts`).
  - Supabase z `locals.supabase`; typ `SupabaseClient` z `src/db/supabase.client.ts`.
  - Kody statusu: 200, 400, 401, 500 zgodnie z opisem.


