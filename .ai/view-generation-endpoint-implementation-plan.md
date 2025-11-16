## API Endpoint Implementation Plan: GET /generations/{id}

### 1. Przegląd punktu końcowego

- **Cel**: Zwraca szczegółowe informacje o pojedynczej generacji wraz z listą powiązanych fiszek (flashcards).
- **Środowisko**: Astro 5 (server endpoints), TypeScript 5, Supabase (Postgres), Zod do walidacji.
- **Routing (Astro)**: Plik `src/pages/api/generations/[id].ts` będzie wystawiał endpoint pod adresem `/api/generations/{id}` (logicznie odpowiadający specyfikacji: `GET /generations/{id}`).


### 2. Szczegóły żądania

- **Metoda HTTP**: GET
- **URL**: `/api/generations/{id}`
- **Parametry**:
  - **Wymagane (path param)**:
    - `id`: UUID generacji.
  - **Opcjonalne (query)**: brak.
- **Nagłówki**: `content-type: application/json` (odpowiedź).
- **Request Body**: brak.
- **Uwierzytelnienie**: aktualnie wykorzystujemy `DEFAULT_USER_ID` (brak sesji), docelowo z `locals` po integracji z Supabase Auth.


### 3. Wykorzystywane typy

- **Z `src/types.ts`**:
  - **GenerationDetailDto**: `Omit<GenerationRow, "user_id"> & { flashcards: FlashcardDetailDto[] }`
  - **FlashcardDetailDto**: `Pick<FlashcardRow, "id" | "front" | "back" | "source" | "created_at" | "updated_at"> & Pick<FlashcardRow, "generation_id">`
- **Nowe/rozszerzone schematy Zod (w `src/lib/generation.schema.ts`)**:
  - `generationIdParamSchema = z.object({ id: z.string().uuid() })`
  - `export type GenerationIdParamInput = z.infer<typeof generationIdParamSchema>`


### 4. Szczegóły odpowiedzi

- **200 OK**: Zwraca obiekt `GenerationDetailDto`.
- **404 Not Found**: Gdy zasób nie istnieje lub nie należy do użytkownika.
- **400 Bad Request**: Gdy `id` nie jest poprawnym UUID.
- **401 Unauthorized**: Docelowo, gdy brak sesji (po integracji z Auth). W bieżącej implementacji używamy `DEFAULT_USER_ID`.
- **500 Internal Server Error**: Niespodziewane błędy serwera/bazy.

Przykładowa odpowiedź 200:

```json
{
  "id": "2d89d9f1-7a3a-4b3f-9e30-3d2a33a9c111",
  "source_text": "…",
  "source_text_length": 2450,
  "generated_count": 5,
  "accepted_unedited_count": null,
  "accepted_edited_count": null,
  "created_at": "2025-11-15T12:00:00.000Z",
  "updated_at": "2025-11-15T12:00:00.000Z",
  "flashcards": [
    {
      "id": "…",
      "front": "…",
      "back": "…",
      "source": "ai-full",
      "created_at": "…",
      "updated_at": "…",
      "generation_id": "2d89d9f1-7a3a-4b3f-9e30-3d2a33a9c111"
    }
  ]
}
```


### 5. Przepływ danych

1. Router `GET /api/generations/{id}`:
   - Pobiera `supabase` z `locals`.
   - Waliduje `params.id` przez `generationIdParamSchema` (UUID).
   - Ustala `userId` (teraz: `DEFAULT_USER_ID`; docelowo: z Supabase Auth).
2. Service `GenerationService.getGenerationDetail`:
   - Pobiera rekord z `generations` filtrowany po `id` i `user_id` (ważne przy braku RLS).
   - Jeżeli brak danych → zwraca `null` (route → 404).
   - Pobiera listę fiszek z `flashcards` filtrowaną po `generation_id` i `user_id`.
   - Mapuje rekordy na `GenerationDetailDto` (bez `user_id`).
3. Router:
   - Zwraca `200` z JSON-em DTO lub `404`/`400`/`500` w zależności od scenariusza.


### 6. Względy bezpieczeństwa

- **Brak RLS (tymczasowo)**: Obowiązkowo filtrujemy po `user_id` w obu zapytaniach (`generations` i `flashcards`), aby uniknąć wycieku danych.
- **Walidacja wejścia**: Zod dla `id` (UUID) chroni przed błędnymi wartościami i minimalizuje ryzyko błędów SQL w RPC.
- **Ekspozycja danych**: Nie zwracamy `user_id` (typ DTO go wyklucza).
- **Uwierzytelnianie**: Po integracji z Auth, w przypadku braku użytkownika zwracamy `401` i nie korzystamy z `DEFAULT_USER_ID`.
- **Nagłówki**: `content-type: application/json` dla spójności.
- **Logowanie błędów**: Tylko log systemowy dla GET; tabela `generation_error_logs` jest przeznaczona do błędów procesu generacji, nie odczytu.


### 7. Obsługa błędów

- **400 Bad Request**: `id` nie jest UUID → zwróć komunikat walidacji.
- **401 Unauthorized** (docelowo): Brak zalogowanego użytkownika (po wdrożeniu Auth).
- **404 Not Found**: Brak generacji o `id` dla danego `user_id` (rekord nie istnieje lub nie należy do użytkownika).
- **500 Internal Server Error**: Błędy Supabase/połączenia/inne nieoczekiwane.

Zwracane komunikaty powinny być krótkie, bez wrażliwych informacji. W 400 dołącz `errors` z `ZodError.flatten().fieldErrors` dla lepszej DX.


### 8. Rozważania dotyczące wydajności

- **Indeksy**: Wg planu DB istnieją indeksy na `generations.user_id`, `flashcards.user_id`, `flashcards.generation_id` — zapytania będą selektywne.
- **Liczność fiszek**: Jeśli potencjalnie bardzo duża liczba fiszek, w przyszłości rozważyć stronicowanie `flashcards` lub lazy-load w osobnym endpointzie. Obecna specyfikacja wymaga pełnej listy.
- **Kolejność**: Sortowanie fiszek po `created_at` rosnąco dla deterministycznego porządku.
- **Koszt zapytań**: Dwa proste zapytania są wystarczające i czytelne (zamiast zagnieżdżonych relacji). Można ewentualnie rozważyć `select` z relacją, jeśli typy mają zdefiniowane relacje w `database.types`.
- **Cache**: Po wdrożeniu Auth można dodać krótki `Cache-Control: private, max-age=60` (ostrożnie, bo dane użytkownika).


### 9. Etapy wdrożenia

1) **Dodaj walidację parametru id (Zod)**
   - Plik: `src/lib/generation.schema.ts`
   - Dodaj:
     - `export const generationIdParamSchema = z.object({ id: z.string().uuid() })`
     - `export type GenerationIdParamInput = z.infer<typeof generationIdParamSchema>`

2) **Dodaj metodę serwisową do pobierania szczegółów generacji**
   - Plik: `src/lib/generation.service.ts`
   - Dodaj typ wejściowy, np.:
     - `export type GetGenerationDetailParams = { supabase: SupabaseClient; userId: string; generationId: string }`
   - Dodaj metodę `getGenerationDetail(params: GetGenerationDetailParams): Promise<GenerationDetailDto | null>`:
     - Zapytanie 1 (pojedynczy rekord):
       - `from("generations").select("id, source_text, source_text_length, generated_count, accepted_edited_count, accepted_unedited_count, created_at, updated_at")`
       - `.eq("id", generationId).eq("user_id", userId).single()`
     - Gdy brak danych → `return null`.
     - Zapytanie 2 (lista fiszek powiązanych):
       - `from("flashcards").select("id, front, back, source, created_at, updated_at, generation_id")`
       - `.eq("generation_id", generationId).eq("user_id", userId).order("created_at", { ascending: true })`
     - Zmapuj wynik do `GenerationDetailDto` i zwróć.
   - Obsługa błędów: W metodzie rzuć `Error` dla błędów serwera (nie `404`), a `null` niech sygnalizuje brak danych.

3) **Dodaj endpoint API**
   - Plik: `src/pages/api/generations/[id].ts`
   - `export const prerender = false`
   - `export const GET: APIRoute = async ({ params, locals }) => { ... }`
   - Kroki w handlerze:
     - Guard: sprawdź `locals.supabase`; jeśli brak → `500` (spójnie z istniejącym stylem).
     - Waliduj `params` przez `generationIdParamSchema`; gdy błąd → `400` z `errors`.
     - Ustal `userId = DEFAULT_USER_ID` (jak w istniejących endpointach).
     - Wywołaj `generationService.getGenerationDetail({ supabase, userId, generationId: parsed.data.id })`.
     - Gdy wynik `null` → `404` z `{ message: "Generation not found" }`.
     - Gdy wynik jest → `200` z JSON i nagłówkiem `content-type: application/json`.
     - W `catch` → `500` i log do `console.error` (bez wrażliwych danych w odpowiedzi).

4) **Spójność typów i importów**
   - Używaj `SupabaseClient` z `src/db/supabase.client.ts`.
   - Nie importuj klienta Supabase bezpośrednio w route — korzystaj z `locals.supabase` (middleware już to ustawia).

5) **Manualne testy**
   - Utwórz generację przez `POST /api/generations` (już istnieje).
   - Wywołaj `GET /api/generations/{id}` z prawidłowym UUID.
   - Przypadki:
     - Nieprawidłowy UUID → 400
     - Prawidłowy UUID, brak rekordu → 404
     - Rekord istnieje i należy do `DEFAULT_USER_ID` → 200

6) **(Opcjonalnie, później) Uwierzytelnianie**
   - Po integracji z Supabase Auth pobieraj `userId` z sesji (`locals`) i wymuszaj `401` przy braku użytkownika.
   - Po ponownym włączeniu RLS usuń jawne `.eq("user_id", userId)` (zostaw w razie potrzeby jako dodatkową warstwę bezpieczeństwa).


### 10. Kody statusu — podsumowanie

- **200 OK**: Pomyślny odczyt.
- **400 Bad Request**: Nieprawidłowy `id` (UUID).
- **401 Unauthorized**: Brak autoryzacji (po wdrożeniu Auth).
- **404 Not Found**: Zasób nie istnieje lub nie należy do użytkownika.
- **500 Internal Server Error**: Błąd serwera/Bazy/Supabase.


