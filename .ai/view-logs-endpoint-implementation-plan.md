## API Endpoint Implementation Plan: GET /generation-error-logs

## 1. Przegląd punktu końcowego

Punkt końcowy zwraca listę logów błędów generowania fiszek (AI) dla bieżącego użytkownika. Użytkownik z uprawnieniami administratora może pobierać logi wszystkich użytkowników (lub wybranego użytkownika). Zwracane są metadane w postaci paginacji.

Kluczowe kody statusu:
- 200: poprawny odczyt listy
- 400: nieprawidłowe parametry zapytania
- 401: brak ważnego tokena (po wdrożeniu uwierzytelniania)
- 403: próba dostępu do cudzych danych bez uprawnień admina
- 500: błąd serwera/bazy danych

## 2. Szczegóły żądania

- Metoda HTTP: GET
- Struktura URL: `/generation-error-logs`
- Parametry:
  - Wymagane: brak
  - Opcjonalne (query):
    - `page` (number, min=1, default=1)
    - `limit` (number, min=1, max=50, default=10)
    - `order` ("asc" | "desc", default="desc")
    - `user_id` (uuid, tylko dla admina; w innym wypadku 403)
- Request Body: brak

## 3. Wykorzystywane typy

Istniejące:
- `GenerationErrorLogDto` — w `src/types.ts` (omija pole `user_id`)
- `GenerationErrorLogListResponseDto` — w `src/types.ts` (zawiera `data` oraz opcjonalnie `pagination`)
- `PaginationMetaDto` — w `src/types.ts`

Do dodania:
- `GenerationErrorLogListQueryDto` (nowy typ):
  - `page?: number`
  - `limit?: number`
  - `order?: "asc" | "desc"`
  - `user_id?: string` (admin-only)

Typy serwisowe (wewnętrzne):
- `ListGenerationErrorLogsParams`:
  - `supabase: SupabaseClient`
  - `page: number`
  - `limit: number`
  - `order: "asc" | "desc"`
  - `userId: string` (ID skutecznie użyte w zapytaniu; dla admina może to być `user_id` z query, dla zwykłego — bieżący użytkownik)

## 4. Szczegóły odpowiedzi

Struktura 200:
```json
{
  "data": [
    {
      "id": "uuid",
      "model": "mock-ai-v1",
      "source_text_hash": "md5hex",
      "source_text_length": 1234,
      "error_code": "AI_GENERATION_FAILED",
      "error_message": "Human-readable error",
      "created_at": "2025-11-16T12:34:56.000Z"
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 10,
    "total": 42
  }
}
```

Kody statusu:
- 200: poprawny zwrot listy logów
- 400: błąd walidacji parametrów (JSON: `{ message, errors }`)
- 401: brak lub niepoprawny token (po integracji auth)
- 403: brak uprawnień do wskazanego `user_id`
- 500: błąd serwera/bazy danych (JSON: `{ message }`)

## 5. Przepływ danych

1. Router (`src/pages/api/generation-error-logs.ts`)
   - Parsuje query przez Zod (`errorLogListQuerySchema`).
   - Ustala `currentUserId` (docelowo z auth; tymczasowo `DEFAULT_USER_ID`).
   - Sprawdza, czy żądanie zawiera `user_id`:
     - Jeśli tak, weryfikuje uprawnienie admina (po integracji auth); w przeciwnym razie 403.
     - Jeśli nie, używa `currentUserId`.
   - Wywołuje serwis `generationService.listGenerationErrorLogs(...)`.
   - Zwraca 200 z danymi lub mapuje błędy na kody 4xx/5xx.

2. Serwis (`GenerationService`)
   - Buduje zapytanie do tabeli `generation_error_logs`.
   - Filtruje po `user_id`.
   - Stosuje paginację (`range`) i sortowanie po `created_at`.
   - Zwraca listę zmapowaną do `GenerationErrorLogDto` oraz `pagination`.

3. Baza danych (Supabase / Postgres)
   - Źródło danych: `generation_error_logs`.
   - Indeks na `user_id` (wg planu DB) zapewnia szybkie filtrowanie per użytkownik.

## 6. Względy bezpieczeństwa

- Uwierzytelnianie:
  - Docelowo: w middleware ustalać `locals.user` na podstawie nagłówka `Authorization: Bearer <jwt>` i `supabase.auth.getUser()`.
  - `401` jeśli brak/niepoprawny token.
- Autoryzacja:
  - Zwykły użytkownik: dostęp tylko do własnych logów (filtr `user_id = currentUserId`).
  - Admin: może przekazać `user_id` i przeglądać logi dowolnego użytkownika.
  - `403` jeśli nie-admin próbuje ustawić `user_id` innego użytkownika.
- RLS:
  - Jeśli RLS włączone i poprawnie skonfigurowane, powinno egzekwować `auth.uid() = user_id`.
  - Aplikacja i tak wymusza filtr `user_id` (obrona w głąb).
- Wycieki informacji:
  - `error_message` może zawierać fragmenty wejścia — ograniczamy długość już przy logowaniu (jest w serwisie).
  - Brak zwrotu `user_id` w DTO (jest jawnie pominięte w `GenerationErrorLogDto`).

## 7. Obsługa błędów

- 400: nieprawidłowe `page`, `limit`, `order` lub niepoprawny `user_id` (uuid).
- 401: brak/niepoprawny token (po integracji auth).
- 403: próba ustawienia `user_id` bez uprawnień admina.
- 404: nie dotyczy listowania (nie zwracamy 404 dla pustych list).
- 500: błąd bazy (select/count) lub nieoczekiwany wyjątek.
- Logowanie operacyjne: `console.error` w handlerze przy 5xx (bez wrażliwych danych).

## 8. Rozważania dotyczące wydajności

- Paginacja: `limit` max 50, offset wyliczany z `page`.
- Indeksy: `user_id` (wg planu DB) — krytyczny dla szybkości.
- Kolumny: wybieramy tylko potrzebne pola (bez `user_id`).
- Sortowanie: po `created_at` (domyślnie `desc`), zgodnie z indeksem czasu tworzenia.
- Liczenie: `count: "exact"` — rozważyć w przyszłości `planned` lub rezygnację z `total` w bardzo dużych zbiorach.

## 9. Etapy wdrożenia

1) Schemat walidacji query (Zod)
- Dodaj plik `src/lib/generation-error-log.schema.ts`:
  - `errorLogListQuerySchema = z.object({ page, limit, order, user_id?: z.string().uuid() })`
  - Typ `ErrorLogListQueryInput = z.infer<typeof errorLogListQuerySchema>`

2) Typy
- W `src/types.ts` dodaj `GenerationErrorLogListQueryDto` (jeśli chcemy spójnie typować zapytania).

3) Serwis
- W `src/lib/generation.service.ts` dodaj:
  - `async listGenerationErrorLogs(params: ListGenerationErrorLogsParams): Promise<GenerationErrorLogListResponseDto>`
  - Zapytanie:
    - `from("generation_error_logs").select("id, model, source_text_hash, source_text_length, error_code, error_message, created_at", { count: "exact" })`
    - `.eq("user_id", userId)`
    - `.order("created_at", { ascending: order === "asc" })`
    - `.range(offset, offset + limit - 1)`
  - Mapowanie wyników do `GenerationErrorLogDto` oraz `pagination`.

4) Router API
- Utwórz `src/pages/api/generation-error-logs.ts`:
  - `export const prerender = false`
  - `GET`:
    - Pobierz `supabase` z `locals`.
    - Sparsuj query przez `errorLogListQuerySchema`.
    - Ustal `currentUserId` (tymczasowo `DEFAULT_USER_ID`).
    - Ustal efektywny `userId`:
      - Jeśli `query.user_id` ustawione — zweryfikuj admina; w razie braku uprawnień 403.
      - W przeciwnym razie `currentUserId`.
    - Wywołaj serwis `listGenerationErrorLogs`.
    - Zwróć 200 z wynikami lub odpowiedni kod błędu (400/401/403/500).

5) Uprawnienia administratora (docelowo)
- Po integracji auth:
  - W middleware pobierz `user` przez `supabase.auth.getUser()`, dołącz `locals.user`.
  - Dodaj prostą kontrolę roli admina:
    - np. env `ADMIN_USER_IDS` (CSV) i sprawdzaj `locals.user.id` ∈ zbioru.
    - Alternatywnie: tabela profili/claims.
  - Zaimplementuj `401/403` zgodnie ze specyfikacją.

6) Testy ręczne (przykłady)
- Lista bieżącego użytkownika:
  - `curl -sS "http://localhost:4321/api/generation-error-logs?page=1&limit=10"`
- Admin — lista wskazanego użytkownika:
  - `curl -sS "http://localhost:4321/api/generation-error-logs?user_id=<uuid>&limit=20"`

7) Obserwowalność
- Minimalne logowanie `console.error` przy 5xx (bez PII).
- Ewentualnie metryki czasu odpowiedzi i liczby rekordów (do rozważenia później).

8) Dokumentacja
- Zaktualizuj README i `.ai/api-plan.md` (sekcja endpointów).


