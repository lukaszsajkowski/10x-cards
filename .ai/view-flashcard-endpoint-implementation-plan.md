# API Endpoint Implementation Plan: GET /flashcards/{id}

## 1. Przegląd punktu końcowego

Punkt końcowy zwraca szczegóły pojedynczej fiszki (flashcard) należącej do uwierzytelnionego użytkownika. Odpowiedź zawiera podstawowe pola fiszki i opcjonalny identyfikator powiązanej generacji.

## 2. Szczegóły żądania

- Metoda HTTP: GET
- Struktura URL: `/flashcards/{id}`
- Parametry:
  - Wymagane:
    - `id` (path): UUID fiszki
  - Opcjonalne:
    - brak
- Request Body: brak

## 3. Wykorzystywane typy

- DTO:
  - `FlashcardDetailDto` (z `src/types.ts`)
    - Pola: `id`, `front`, `back`, `source`, `generation_id`, `created_at`, `updated_at`
- Dodatkowe typy (do dodania):
  - `flashcardIdParamSchema` (Zod) w `src/lib/flashcard.schema.ts`:
    - `{ id: z.string().uuid() }`
  - (opcjonalnie) `FlashcardIdParamInput` jako `z.infer<typeof flashcardIdParamSchema>`

## 3. Szczegóły odpowiedzi

- 200 OK
  - Body (application/json): `FlashcardDetailDto`
- 400 Bad Request
  - Body: `{ message: "Validation error", errors: Record<string, string[]> }`
- 401 Unauthorized
  - Body: `{ message: "Unauthorized" }`
- 404 Not Found
  - Body: `{ message: "Flashcard not found" }`
- 500 Internal Server Error
  - Body: `{ message: "Failed to fetch flashcard" }`

Przykład 200:
```json
{
  "id": "a8f3e7f0-3f75-4a5c-bf2a-b2f8f6d1b5d2",
  "front": "What is the capital of France?",
  "back": "Paris",
  "source": "manual",
  "generation_id": null,
  "created_at": "2025-11-16T12:00:00.000Z",
  "updated_at": "2025-11-16T12:00:00.000Z"
}
```

## 4. Przepływ danych

1. Router Astro przyjmuje żądanie GET pod ścieżką `/flashcards/{id}`.
2. Middleware (`src/middleware/index.ts`) podstawia `locals.supabase`.
3. Endpoint:
   - Waliduje obecność `locals.supabase`.
   - Odczytuje token z nagłówka `Authorization: Bearer <jwt>` i wywołuje `supabase.auth.getUser(jwt)`:
     - Gdy brak tokena lub błąd — 401.
   - Waliduje parametr `{ id }` przez `flashcardIdParamSchema`:
     - Gdy niepoprawny UUID — 400 + szczegóły walidacji.
   - Wywołuje serwis `flashcardService.getFlashcardDetail({ supabase, userId, flashcardId })`.
     - Serwis wybiera rekord z tabeli `flashcards` ograniczony przez `user_id` i `id`.
   - Gdy brak rekordu — 404.
   - Gdy sukces — 200 + `FlashcardDetailDto`.

## 5. Względy bezpieczeństwa

- Uwierzytelnianie:
  - Wymagany nagłówek `Authorization: Bearer <jwt>`, weryfikacja przez `supabase.auth.getUser(jwt)`.
- Autoryzacja:
  - Serwis filtruje po `user_id = authenticatedUser.id` oraz `id = flashcardId`. Zapobiega IDOR.
  - RLS (jeśli włączone): upewnić się, że polityki wymuszają `auth.uid() = user_id`. Mimo RLS, nadal filtrujemy po `user_id` po stronie aplikacji.
- Minimalizacja danych:
  - Nie zwracamy `user_id` w odpowiedzi. Zwracamy tylko potrzebne pola.
- Nagłówki:
  - `content-type: application/json`.
- Błędy:
  - Nie logować wrażliwych danych wejściowych, logować komunikaty błędów bez tokenów.

## 6. Obsługa błędów

- 400: niepoprawny `id` (nie-UUID).
- 401: brak/niepoprawny token, `supabase.auth.getUser` zwraca błąd/brak użytkownika.
- 404: fiszka nie istnieje lub nie należy do użytkownika.
- 500: błąd po stronie Supabase/serwisu lub brak `locals.supabase`.
- Rejestrowanie błędów:
  - W tym endpointcie nie zapisujemy do `generation_error_logs` (dotyczy tylko procesów generacyjnych).
  - Log `console.error` z bezpiecznym komunikatem.

## 7. Rozważania dotyczące wydajności

- Zapytanie po kluczach (`id`, `user_id`) — bardzo szybkie; indeksy standardowe na `id` i `user_id` wystarczające.
- Projekcja tylko potrzebnych kolumn minimalizuje transfer.
- Brak joinów, pojedyncze zapytanie.
- Brak cache (dane prywatne użytkownika).

## 8. Etapy wdrożenia

1. Schemat walidacji parametru
   - Plik: `src/lib/flashcard.schema.ts`
   - Dodaj:
     ```ts
     export const flashcardIdParamSchema = z.object({
       id: z.string().uuid(),
     })
     export type FlashcardIdParamInput = z.infer<typeof flashcardIdParamSchema>
     ```
2. Serwis: pobieranie szczegółów fiszki
   - Plik: `src/lib/flashcard.service.ts`
   - Dodaj metodę:
     ```ts
     async getFlashcardDetail(params: {
       supabase: SupabaseClient
       userId: string
       flashcardId: string
     }): Promise<FlashcardDetailDto | null> {
       const { supabase, userId, flashcardId } = params
       const { data, error } = await supabase
         .from("flashcards")
         .select("id, front, back, source, generation_id, created_at, updated_at")
         .eq("id", flashcardId)
         .eq("user_id", userId)
         .maybeSingle()
       if (error) throw new Error("Failed to fetch flashcard")
       if (!data) return null
       return {
         id: data.id,
         front: data.front,
         back: data.back,
         source: data.source,
         generation_id: data.generation_id,
         created_at: data.created_at,
         updated_at: data.updated_at,
       }
     }
     ```
3. Endpoint API
   - Plik: `src/pages/api/flashcards/[id].ts`
   - Założenia:
     - `export const prerender = false`
     - `locals.supabase` pochodzi z middleware.
     - Autoryzacja: odczyt `Authorization` i `supabase.auth.getUser(jwt)`.
     - Walidacja `id` przez `flashcardIdParamSchema`.
     - Wywołanie serwisu i mapowanie kodów statusu.
   - Szkic:
     ```ts
     import type { APIRoute } from "astro"
     import { flashcardIdParamSchema } from "../../../lib/flashcard.schema"
     import { flashcardService } from "../../../lib/flashcard.service"
     
     export const prerender = false
     const JSON_HEADERS = { "content-type": "application/json" } as const
     
     export const GET: APIRoute = async ({ params, locals, request }) => {
       const supabase = locals.supabase
       if (!supabase) {
         return new Response(JSON.stringify({ message: "Supabase client not available" }), { status: 500, headers: JSON_HEADERS })
       }
       
       const authHeader = request.headers.get("authorization") ?? request.headers.get("Authorization")
       const token = authHeader?.startsWith("Bearer ") ? authHeader.slice(7) : null
       if (!token) {
         return new Response(JSON.stringify({ message: "Unauthorized" }), { status: 401, headers: JSON_HEADERS })
       }
       const { data: userData, error: authError } = await supabase.auth.getUser(token)
       if (authError || !userData?.user) {
         return new Response(JSON.stringify({ message: "Unauthorized" }), { status: 401, headers: JSON_HEADERS })
       }
       
       const parsed = flashcardIdParamSchema.safeParse({ id: params?.id })
       if (!parsed.success) {
         return new Response(JSON.stringify({ message: "Validation error", errors: parsed.error.flatten().fieldErrors }), { status: 400, headers: JSON_HEADERS })
       }
       
       try {
         const result = await flashcardService.getFlashcardDetail({
           supabase,
           userId: userData.user.id,
           flashcardId: parsed.data.id,
         })
         if (!result) {
           return new Response(JSON.stringify({ message: "Flashcard not found" }), { status: 404, headers: JSON_HEADERS })
         }
         return new Response(JSON.stringify(result), { status: 200, headers: JSON_HEADERS })
       } catch (error) {
         console.error("Failed to fetch flashcard", error)
         return new Response(JSON.stringify({ message: "Failed to fetch flashcard" }), { status: 500, headers: JSON_HEADERS })
       }
     }
     ```
4. Testy manualne (smoke)
   - Brak tokena → 401.
   - Nie-UUID w `{id}` → 400.
   - Prawidłowy token, brak zasobu → 404.
   - Prawidłowy token i zasób należący do użytkownika → 200 + `FlashcardDetailDto`.
5. Jakości i zgodność
   - Lint i TypeScript — brak błędów.
   - Zgodność z regułami:
     - Użycie `locals.supabase`.
     - Walidacja Zod.
     - Handlery `GET` z `prerender = false`.
     - Logika w serwisie.
6. (Opcjonalnie) Polityki RLS
   - Jeśli RLS włączone, potwierdź politykę: `USING (auth.uid() = user_id)`.
   - Endpoint nadal filtruje po `user_id` dla Defense-in-Depth.


