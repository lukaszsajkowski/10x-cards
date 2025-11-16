## API Endpoint Implementation Plan: POST /flashcards

### 1. Przegląd punktu końcowego

Punkt końcowy tworzy jedną lub wiele fiszek. Obsługuje zarówno ręczne tworzenie, jak i zapis fiszek pochodzących z procesu generowania AI. Waliduje dane wejściowe zgodnie ze specyfikacją oraz spójnością z danymi w bazie (np. istnienie `generation_id` dla źródeł AI).

Cele:
- Walidacja wejścia (długości pól, dozwolone wartości, zależności `source` ↔ `generation_id`).
- Weryfikacja, że podane `generation_id` istnieją i należą do bieżącego użytkownika.
- Zapis fiszek w trybie zbiorczym.
- Zwrócenie listy utworzonych fiszek.

Zgodności:
- Astro 5 Server Endpoints.
- Zod do walidacji.
- Supabase z `locals.supabase`.
- Typy DTO/Command z `src/types.ts`.

### 2. Szczegóły żądania

- Metoda HTTP: POST
- Struktura URL: `/api/flashcards` (plik: `src/pages/api/flashcards.ts`)
- Parametry:
  - Wymagane (w treści): `flashcards` – tablica obiektów fiszek.
  - Opcjonalne: brak parametrów query.
- Request Body (typy i ograniczenia):
  - `flashcards`: array (zalecany limit np. ≤ 100)
    - `front`: string, max 200 znaków
    - `back`: string, max 500 znaków
    - `source`: enum `ai-full | ai-edited | manual`
    - `generation_id`: string UUID lub null
  - Reguły warunkowe:
    - Jeśli `source === "manual"` → `generation_id` musi być null.
    - Jeśli `source in {"ai-full","ai-edited"}` → `generation_id` jest wymagane (UUID).
  - Dodatkowa spójność:
    - Każde wymagane `generation_id` musi istnieć w tabeli `generations` i należeć do bieżącego użytkownika.

Przykład:

```json
{
  "flashcards": [
    { "front": "Question 1", "back": "Answer 1", "source": "manual", "generation_id": null },
    { "front": "Question 2", "back": "Answer 2", "source": "ai-full", "generation_id": "1c4f3b43-13c5-43a2-9c86-4e1f819a7f0a" }
  ]
}
```

### 3. Wykorzystywane typy

Z `src/types.ts`:
- `FlashcardDraftCommand` – element tablicy `flashcards` w żądaniu (`front`, `back`, `source`, `generation_id`).
- `CreateFlashcardsCommand` – obiekt żądania `{ flashcards: FlashcardDraftCommand[] }`.
- `FlashcardDetailDto` – element tablicy odpowiedzi: `id`, `front`, `back`, `source`, `created_at`, `updated_at`, `generation_id`.
- `CreateFlashcardsResponseDto` – odpowiedź `{ flashcards: FlashcardDetailDto[] }`.

Zastosowanie:
- Schemat Zod odzwierciedla `CreateFlashcardsCommand`.
- Serwis zwraca `CreateFlashcardsResponseDto`.

### 4. Szczegóły odpowiedzi

- Status 201 (Created) w przypadku sukcesu.
- Body (JSON):

```json
{
  "flashcards": [
    { "id": "uuid-1", "front": "Question 1", "back": "Answer 1", "source": "manual", "generation_id": null, "created_at": "...", "updated_at": "..." },
    { "id": "uuid-2", "front": "Question 2", "back": "Answer 2", "source": "ai-full", "generation_id": "1c4f3b43-13c5-43a2-9c86-4e1f819a7f0a", "created_at": "...", "updated_at": "..." }
  ]
}
```

Kody statusu:
- 201 – utworzono fiszki.
- 400 – błędne dane wejściowe (walidacja Zod, naruszenie reguł zależności).
- 401 – brak autoryzacji użytkownika (gdy wdrożone uwierzytelnienie).
- 404 – wskazane `generation_id` nie istnieje lub nie należy do użytkownika.
- 500 – błąd po stronie serwera (np. błąd Supabase).

### 5. Przepływ danych

1. Klient wysyła POST `/api/flashcards` z JSON `CreateFlashcardsCommand`.
2. Endpoint:
   - Pobiera `locals.supabase`.
   - Ustala `userId` (docelowo z sesji Supabase; w dev zgodnie ze wzorcem projektu można użyć `DEFAULT_USER_ID`).
   - Parsuje JSON; waliduje Zod-em w tym reguły warunkowe.
   - Zbiera unikalne `generation_id` (dla źródeł AI) i sprawdza ich istnienie w `generations` z `eq("user_id", userId)` oraz `in("id", ids)`.
   - Jeśli weryfikacja przejdzie, woła serwis do wstawienia fiszek zbiorczo do `flashcards` z `user_id`.
   - Zwraca 201 i listę wstawionych fiszek (z `select(...)`).
3. Błędy walidacji lub brakujących generacji → odpowiednio 400/404.

### 6. Względy bezpieczeństwa

- Autoryzacja:
  - Preferowane: pobrać `userId` z zalogowanego użytkownika (np. `locals.supabase.auth.getUser()`), zwrócić 401 gdy brak sesji.
  - Obecny kod w repo używa `DEFAULT_USER_ID` – do zachowania spójności w dev można utrzymać ten wzorzec i dodać komentarz TODO do pełnej autoryzacji.
- Separacja danych:
  - Wszystkie zapytania do `generations` i `flashcards` filtrować po `user_id`.
  - RLS: jeśli polityki włączone, zapewniają dodatkową ochronę; jeśli wyłączone w dev, kod musi zawsze przekazywać i filtrować `user_id`.
- Walidacja wejścia:
  - Zod musi egzekwować długości i dopuszczalne wartości.
  - Super-refinement dla zależności `source` ↔ `generation_id`.
- Unikanie enumeracji zasobów:
  - W przypadku nieistniejących `generation_id` zwracać 404 bez ujawniania szczegółów innych zasobów.

### 7. Obsługa błędów

Scenariusze i odpowiedzi:
- Nieprawidłowy JSON: 400 + `{ message: "Invalid JSON payload" }`
- Walidacja Zod nieudana: 400 + `{ message: "Validation error", errors: <flattened> }`
- `generation_id` (AI) nie istnieje/nie należy do usera: 404 + `{ message: "Generation not found" }`
- Brak `locals.supabase`: 500 + `{ message: "Supabase client not available" }`
- Brak autoryzacji (po wdrożeniu auth): 401 + `{ message: "Unauthorized" }`
- Błąd wstawiania do DB: 500 + `{ message: "Failed to create flashcards" }`

Logowanie:
- Konsola dla błędów serwerowych.
- Tabela `generation_error_logs` nie dotyczy tego endpointu; brak logowania do DB na tym etapie (opcjonalnie można rozważyć osobną tabelę logów dla flashcards w przyszłości).

### 8. Rozważania dotyczące wydajności

- Walidacja: Zod działa w pamięci – koszty liniowe względem liczby fiszek.
- Spójność generacji: sprawdzenie istnienia `generation_id` grupowo jednym zapytaniem `in("id", ids)`.
- Wstawianie: jedna operacja `.insert([...])` z wyborem kolumn poprzez `.select(...)` – zazwyczaj atomowa (cała lista lub nic).
- Limit rozmiaru wsadu: rozważyć limit np. 100 fiszek na żądanie (Zod `.max(100)`), aby ograniczyć rozmiar payloadu i czas operacji.

### 9. Kroki implementacji

1) Schematy Zod
- Plik: `src/lib/flashcard.schema.ts`
  - `flashcardDraftSchema`:
    - `front: z.string().min(1).max(200)`
    - `back: z.string().min(1).max(500)`
    - `source: z.enum(["ai-full","ai-edited","manual"])`
    - `generation_id: z.string().uuid().nullable()`
    - `.superRefine(...)` do walidacji zależności `source` ↔ `generation_id`.
  - `createFlashcardsCommandSchema`:
    - `{ flashcards: z.array(flashcardDraftSchema).min(1).max(100) }`
  - Eksport typów inferowanych z powyższych schematów (opcjonalnie).

2) Serwis
- Plik: `src/lib/flashcard.service.ts`
  - Typy parametrów: `{ supabase: SupabaseClient; userId: string; flashcards: FlashcardDraftCommand[] }`
  - Metoda: `createFlashcards(...) : Promise<CreateFlashcardsResponseDto>`
    - Zbierz `requiredGenerationIds = unique(generation_id where source in AI)` (bez null).
    - Jeśli `requiredGenerationIds.length > 0`:
      - `select id from generations where user_id = :userId and id in (:ids)`
      - Sprawdź, czy znalezione ID pokrywają wszystkie wymagane; w przeciwnym razie rzuć błąd domenowy `GENERATION_NOT_FOUND` (mapowany do 404).
    - Zbuduj wiersze do wstawienia:
      - `front`, `back`, `source`, `generation_id`, `user_id: userId`
    - `insert(rows).select("id, front, back, source, generation_id, created_at, updated_at")`
      - Jeśli błąd lub pusta odpowiedź → rzuć błąd `FLASHCARDS_PERSISTENCE_FAILED`.
    - Zwróć `{ flashcards: mappedRows }`.
  - (Opcjonalnie) Klasa błędów domenowych `FlashcardServiceError` z kodami:
    - `GENERATION_NOT_FOUND`, `FLASHCARDS_PERSISTENCE_FAILED`

3) Endpoint
- Plik: `src/pages/api/flashcards.ts`
  - `export const prerender = false`
  - `export const POST: APIRoute = async ({ request, locals }) => { ... }`
  - Stałe nagłówków JSON jak w istniejących endpointach.
  - Kroki:
    1. Sprawdź `locals.supabase` (w razie braku → 500).
    2. Parsuj `request.json()`; w razie błędu → 400.
    3. `safeParse` `createFlashcardsCommandSchema`; w razie błędu → 400.
    4. Ustal `userId`:
       - Docelowo: z sesji (`locals.supabase.auth.getUser()` → 401 jeśli brak).
       - Dev/konsystencja z projektem: `DEFAULT_USER_ID` z `src/db/supabase.client.ts`.
    5. Wywołaj `flashcardService.createFlashcards({ supabase, userId, flashcards: parsed.data.flashcards })`.
       - Mapuj błędy:
         - `GENERATION_NOT_FOUND` → 404
         - `FLASHCARDS_PERSISTENCE_FAILED` → 500
         - pozostałe → 500
    6. Zwróć 201 oraz wynik.

4) Testy ręczne (Postman/curl)
- Przypadki:
  - Prawidłowe: manual bez `generation_id`.
  - Prawidłowe: ai-full/ai-edited z istniejącym `generation_id` użytkownika.
  - Błędne: zbyt długie `front`/`back`.
  - Błędne: `source` spoza zakresu.
  - Błędne: manual z nie-null `generation_id`.
  - Błędne: ai-full/ai-edited z `generation_id` = null lub nie-UUID.
  - 404: ai-full/ai-edited z `generation_id` nieistniejącym lub innego użytkownika.

5) Spójność stylu i zasad
- Zgodne z istniejącym stylem w `src/pages/api/generations*.ts`:
  - `JSON_HEADERS`, `prerender = false`, `safeParse`, wyraźne kody statusów.
- Typy z `src/types.ts` i `SupabaseClient` z `src/db/supabase.client.ts`.
- Brak bezpośredniego importu SDK Supabase poza typem klienta.

6) Przyszłe usprawnienia (opcjonalne)
- Uwierzytelnianie użytkownika i usunięcie `DEFAULT_USER_ID`.
- RLS i polityki dla `flashcards` (jeśli jeszcze nieaktywne), aby egzekwować `user_id = auth.uid()`.
- Dodatkowa tabela logów błędów dla operacji na fiszkach, jeśli zajdzie potrzeba audytu.


