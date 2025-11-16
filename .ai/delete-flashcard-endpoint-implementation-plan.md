## API Endpoint Implementation Plan: DELETE /flashcards/{id}

### 1. Przegląd punktu końcowego

- Cel: Usunąć pojedynczą fiszkę należącą do uwierzytelnionego użytkownika.
- Środowisko: Astro 5 (server endpoints), TypeScript 5, Supabase (DB/Auth), Zod (walidacja).
- Lokalizacja: `src/pages/api/flashcards/[id].ts` (handler `DELETE`), z logiką domenową w `src/lib/flashcard.service.ts`.

### 2. Szczegóły żądania

- Metoda HTTP: DELETE
- Ścieżka URL: `/api/flashcards/{id}`
- Parametry:
  - Wymagane (Path): `id` — UUID (walidowany Zod).
  - Opcjonalne: brak.
- Body: brak
- Nagłówki: standardowe (`Accept: application/json`). `export const prerender = false` ustawione w pliku endpointu.

### 3. Wykorzystywane typy

- Z `src/types.ts`:
  - `DeleteFlashcardResponseDto` — `{ message: string }`
- Z `src/lib/flashcard.schema.ts`:
  - `flashcardIdParamSchema` — walidacja parametru `id` jako UUID
  - `FlashcardIdParamInput` — typ wejścia (opcjonalnie w adnotacjach)
- Z `src/db/supabase.client.ts`:
  - `SupabaseClient` — typ klienta Supabase używany w serwisie

### 4. Szczegóły odpowiedzi

- Statusy:
  - 200 — sukces usunięcia (z treścią `{ message: "Flashcard deleted" }`)
  - 400 — nieprawidłowy parametr `id` (walidacja Zod)
  - 401 — brak uwierzytelnienia (docelowo przy aktywnym Supabase Auth)
  - 404 — zasób nie istnieje lub nie należy do użytkownika
  - 500 — błąd serwera/bazy danych
- Struktura (200):
  - `DeleteFlashcardResponseDto` — `{ message: "Flashcard deleted" }`

### 5. Przepływ danych

1. Klient wywołuje `DELETE /api/flashcards/{id}`.
2. Endpoint Astro (`src/pages/api/flashcards/[id].ts`):
   - Pobiera `locals.supabase`.
   - Waliduje `params.id` przez `flashcardIdParamSchema.safeParse({ id: params?.id })`.
   - Ustala `userId`:
     - Aktualnie w projekcie (DEV): `DEFAULT_USER_ID`.
     - Docelowo: z Supabase Auth; brak użytkownika => 401.
   - Wywołuje `flashcardService.deleteFlashcard({ supabase, userId, flashcardId })`.
3. Serwis (`src/lib/flashcard.service.ts`):
   - Wykonuje operację:
     - `from("flashcards").delete().eq("id", flashcardId).eq("user_id", userId).select("id").maybeSingle()`
   - Zwraca `true` jeśli rekord usunięty, `false` jeśli nie znaleziono; w razie błędu rzuca wyjątek serwisowy.
4. Endpoint:
   - `true` => 200 i `{ message: "Flashcard deleted" }`
   - `false` => 404
   - Błędy walidacji => 400, błędy serwerowe => 500

### 6. Względy bezpieczeństwa

- Uwierzytelnianie: docelowo Supabase Auth (401 przy braku sesji). Aktualny fallback `DEFAULT_USER_ID` tylko dla DEV.
- Autoryzacja: filtrowanie po `user_id` w zapytaniu kasującym + RLS na tabeli `flashcards` (w PROD), co zapobiega IDOR.
- Walidacja wejścia: `id` jako UUID (redukcja ryzyka wstrzyknięć/niepoprawnych zapytań).
- Minimalizacja ujawniania informacji: ten sam komunikat 404 dla rekordów nieistniejących i cudzych (brak ujawnienia istnienia cudzych zasobów).

### 7. Obsługa błędów

- 400 — niepoprawny `id` (Zod `safeParse`, zwraca `message` i `errors`).
- 401 — brak użytkownika (po włączeniu auth); w obecnym stanie projektu nieegzekwowane.
- 404 — brak rekordu do usunięcia (0 wierszy usuniętych).
- 500 — błędy z Supabase (np. `error` podczas `.delete()`), logowane po stronie serwera.
- Logowanie:
  - `console.error("Failed to delete flashcard", error)` w handlerze 500.
  - Brak wpisów do `generation_error_logs` (tabela dotyczy procesu generacji AI, nie operacji CRUD na fiszkach).

### 8. Rozważania dotyczące wydajności

- Operacja dotyczy jednego rekordu — koszt minimalny.
- Indeksy:
  - PK po `id` jest wystarczający do szybkiego odszukania; dodatkowy filtr `user_id` zwiększa bezpieczeństwo (oraz może korzystać z indeksu po `user_id` jeśli istnieje).
- Brak payloadu w Body i minimalna odpowiedź JSON ogranicza narzut sieciowy.

### 9. Etapy wdrożenia

1) Serwis domenowy — usuwanie fiszki  
   - Plik: `src/lib/flashcard.service.ts`  
   - Dodaj metodę:
     - `deleteFlashcard(params: { supabase: SupabaseClient; userId: string; flashcardId: string }): Promise<boolean>`  
   - Implementacja:
     - Wykonaj `.delete().eq("id", flashcardId).eq("user_id", userId).select("id").maybeSingle()`
     - Przy błędzie — rzuć `FlashcardServiceError("Failed to delete flashcard", "FLASHCARDS_PERSISTENCE_FAILED", error)`
     - `!data` => `return false`; w przeciwnym razie `return true`

2) Endpoint API — handler `DELETE`  
   - Plik: `src/pages/api/flashcards/[id].ts`  
   - Dodaj:
     - Walidację `params.id` przez `flashcardIdParamSchema`
     - Wywołanie `flashcardService.deleteFlashcard(...)`
     - Mapowanie wyników:
       - `true` => `return new Response(JSON.stringify({ message: "Flashcard deleted" }), { status: 200, headers: JSON_HEADERS })`
       - `false` => `return new Response(JSON.stringify({ message: "Flashcard not found" }), { status: 404, headers: JSON_HEADERS })`
     - Obsługa wyjątków `FlashcardServiceError` -> 500 (spójnie z innymi handlerami)
     - Zachowaj `export const prerender = false`

3) Walidacja i spójność typów  
   - Reużyj `flashcardIdParamSchema` (brak nowych schematów).
   - Odpowiedź zgodna z `DeleteFlashcardResponseDto`.
   - Upewnij się, że typ `SupabaseClient` pochodzi z `src/db/supabase.client.ts`.

4) Testy manualne  
   - 200: usuń istniejącą fiszkę użytkownika.
   - 404: usuń nieistniejący `id` (UUID) lub cudzy rekord (symulacja przez inny `userId` w DEV).
   - 400: niepoprawny `id` (np. nie-UUID).
   - 500: zasymuluj błąd Supabase (np. tymczasowy brak klienta — 500 już obsługiwane).
   - (Po wdrożeniu auth) 401: brak sesji.

5) Dokumentacja  
   - Uaktualnij opis endpointu w dokumentacji API oraz przykłady odpowiedzi.


