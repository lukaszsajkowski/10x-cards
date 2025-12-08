# Plan Testów - 10x Cards

## 1. Wprowadzenie i Cele Testowania

### 1.1 Opis Projektu
10x Cards to aplikacja webowa do tworzenia fiszek edukacyjnych z wykorzystaniem sztucznej inteligencji. Użytkownicy mogą wprowadzać tekst źródłowy, na podstawie którego system AI generuje propozycje fiszek do nauki. Aplikacja umożliwia również ręczne tworzenie, edycję i zarządzanie fiszkami.

### 1.2 Cele Testowania
- Zapewnienie poprawności funkcjonalnej wszystkich modułów aplikacji
- Weryfikacja integracji z zewnętrznymi usługami (Supabase, OpenRouter)
- Sprawdzenie bezpieczeństwa autoryzacji i izolacji danych użytkowników
- Walidacja poprawności walidacji danych wejściowych
- Potwierdzenie stabilności i wydajności aplikacji
- Zapewnienie poprawnego działania UI/UX

---

## 2. Zakres Testów

### 2.1 Moduły Objęte Testami

| Moduł | Priorytet | Opis |
|-------|-----------|------|
| Autentykacja | Krytyczny | Login, rejestracja, reset hasła, ochrona tras |
| Generowanie fiszek AI | Krytyczny | Integracja z OpenRouter, walidacja, przetwarzanie |
| Zarządzanie fiszkami | Wysoki | CRUD operacje, paginacja, filtry |
| Historia generacji | Średni | Lista generacji, szczegóły, błędy |
| Nawigacja i UI | Średni | Responsywność, dark mode, nawigacja |
| API Endpoints | Krytyczny | Wszystkie endpointy REST |

### 2.2 Elementy Wyłączone z Testów
- Wewnętrzne funkcjonalności Supabase Auth
- Infrastruktura OpenRouter
- Komponenty Shadcn/ui (przetestowane przez społeczność)

---

## 3. Typy Testów

### 3.1 Testy Jednostkowe (Unit Tests)

**Zakres:**
- Serwisy: `flashcard.service.ts`, `generation.service.ts`, `openrouter.service.ts`
- Schematy walidacji: `flashcard.schema.ts`, `generation.schema.ts`
- Hooki React: `useFlashcardGeneration`, `useFlashcards`, `useAuthForm`
- Funkcje pomocnicze: `utils.ts`

**Priorytety testów jednostkowych:**

| Komponent | Priorytet | Przypadki testowe |
|-----------|-----------|-------------------|
| `FlashcardService` | Krytyczny | Tworzenie, aktualizacja, usuwanie, walidacja źródeł |
| `GenerationService` | Krytyczny | Generowanie, obsługa błędów, logowanie |
| `OpenRouterService` | Krytyczny | Retry logic, timeout, parsowanie odpowiedzi |
| Schematy Zod | Wysoki | Walidacja granic, formaty, relacje |
| Hooki React | Średni | Stan, efekty uboczne, optimistic UI |

### 3.2 Testy Integracyjne

**Zakres:**
- Integracja API endpoints z serwisami
- Integracja middleware z Supabase Auth
- Flow generowania: tekst → AI → propozycje → zapisanie fiszek
- Powiązania między flashcards a generations

**Kluczowe scenariusze integracyjne:**

1. **Flow autentykacji:**
   - Rejestracja → automatyczne logowanie → dostęp do chronionych zasobów
   - Logowanie → sesja cookie → dostęp do API

2. **Flow generowania fiszek:**
   - Walidacja tekstu → request do OpenRouter → zapis generacji → propozycje → akceptacja → zapis fiszek

3. **Izolacja danych użytkowników:**
   - RLS (Row Level Security) - użytkownik widzi tylko swoje dane

### 3.3 Testy End-to-End (E2E)

**Scenariusze krytyczne:**

| ID | Scenariusz | Priorytet |
|----|------------|-----------|
| E2E-01 | Pełny flow nowego użytkownika | Krytyczny |
| E2E-02 | Generowanie i akceptacja fiszek | Krytyczny |
| E2E-03 | Edycja i usuwanie fiszek | Wysoki |
| E2E-04 | Reset hasła | Wysoki |
| E2E-05 | Infinite scroll fiszek | Średni |
| E2E-06 | Przełączanie dark/light mode | Niski |

### 3.4 Testy Bezpieczeństwa

**Obszary:**
- Autoryzacja API (401 dla niezalogowanych)
- Izolacja danych (RLS policies w Supabase)
- Walidacja danych wejściowych (injection attacks)
- CSRF ochrona
- Rate limiting (po stronie OpenRouter)

### 3.5 Testy Wydajnościowe

**Metryki:**
- Czas odpowiedzi API < 200ms (bez generacji AI)
- Czas generacji AI < 30s
- Ładowanie listy fiszek < 500ms
- First Contentful Paint < 1.5s

---

## 4. Scenariusze Testowe dla Kluczowych Funkcjonalności

### 4.1 Moduł Autentykacji

#### TC-AUTH-001: Rejestracja nowego użytkownika
**Warunki wstępne:** Brak sesji, formularz rejestracji otwarty
**Kroki:**
1. Wprowadź poprawny email
2. Wprowadź hasło (min. 6 znaków)
3. Potwierdź hasło
4. Kliknij "Zarejestruj się"

**Oczekiwany wynik:** Przekierowanie do `/generate`, sesja aktywna

#### TC-AUTH-002: Logowanie z niepoprawnym hasłem
**Warunki wstępne:** Istniejące konto użytkownika
**Kroki:**
1. Wprowadź poprawny email
2. Wprowadź niepoprawne hasło
3. Kliknij "Zaloguj się"

**Oczekiwany wynik:** Komunikat błędu "Niepoprawne dane logowania"

#### TC-AUTH-003: Ochrona tras chronionych
**Warunki wstępne:** Brak sesji
**Kroki:**
1. Spróbuj wejść na `/generate` bezpośrednio

**Oczekiwany wynik:** Przekierowanie do `/auth/login`

#### TC-AUTH-004: Ochrona API endpoints
**Warunki wstępne:** Brak sesji
**Kroki:**
1. Wyślij GET `/api/flashcards` bez cookie sesji

**Oczekiwany wynik:** HTTP 401 z `{"message": "Unauthorized"}`

### 4.2 Moduł Generowania Fiszek

#### TC-GEN-001: Generowanie fiszek z poprawnym tekstem
**Warunki wstępne:** Użytkownik zalogowany, strona `/generate`
**Kroki:**
1. Wprowadź tekst 1000-10000 znaków
2. Kliknij "Generuj fiszki"
3. Poczekaj na odpowiedź AI

**Oczekiwany wynik:** Wyświetlenie 3-10 propozycji fiszek

#### TC-GEN-002: Walidacja minimalnej długości tekstu
**Warunki wstępne:** Strona `/generate`
**Kroki:**
1. Wprowadź tekst < 1000 znaków
2. Sprawdź stan przycisku "Generuj"

**Oczekiwany wynik:** Przycisk zablokowany, komunikat o wymaganej długości

#### TC-GEN-003: Edycja propozycji przed akceptacją
**Warunki wstępne:** Wygenerowane propozycje fiszek
**Kroki:**
1. Kliknij "Edytuj" na propozycji
2. Zmień treść frontu/backu
3. Zapisz zmiany
4. Zaakceptuj i zapisz wszystkie

**Oczekiwany wynik:** Fiszka zapisana z `source: "ai-edited"`

#### TC-GEN-004: Odrzucenie wszystkich propozycji
**Warunki wstępne:** Wygenerowane propozycje fiszek
**Kroki:**
1. Kliknij "Odrzuć wszystkie"

**Oczekiwany wynik:** Powrót do formularza, propozycje usunięte

#### TC-GEN-005: Obsługa błędu AI
**Warunki wstępne:** Mock błędu OpenRouter
**Kroki:**
1. Wprowadź poprawny tekst
2. Kliknij "Generuj" (przy symulowanym błędzie)

**Oczekiwany wynik:** Komunikat błędu, log w `generation_error_logs`

### 4.3 Moduł Zarządzania Fiszkami

#### TC-FLASH-001: Wyświetlanie listy fiszek
**Warunki wstępne:** Min. 1 fiszka w bazie
**Kroki:**
1. Przejdź do `/flashcards`

**Oczekiwany wynik:** Lista fiszek posortowana od najnowszych

#### TC-FLASH-002: Infinite scroll
**Warunki wstępne:** > 20 fiszek w bazie
**Kroki:**
1. Przejdź do `/flashcards`
2. Przewiń do końca listy

**Oczekiwany wynik:** Automatyczne doładowanie kolejnych fiszek

#### TC-FLASH-003: Tworzenie fiszki ręcznie
**Warunki wstępne:** Strona `/flashcards`
**Kroki:**
1. Kliknij "Nowa fiszka"
2. Wypełnij front (max 200 znaków)
3. Wypełnij back (max 500 znaków)
4. Zapisz

**Oczekiwany wynik:** Fiszka dodana na początek listy z `source: "manual"`

#### TC-FLASH-004: Edycja fiszki
**Warunki wstępne:** Min. 1 fiszka w bazie
**Kroki:**
1. Kliknij "Edytuj" na fiszce
2. Zmień treść
3. Zapisz

**Oczekiwany wynik:** Fiszka zaktualizowana, `updated_at` zmieniony

#### TC-FLASH-005: Usuwanie fiszki z Optimistic UI
**Warunki wstępne:** Min. 1 fiszka w bazie
**Kroki:**
1. Kliknij "Usuń" na fiszce
2. Potwierdź usunięcie

**Oczekiwany wynik:** Fiszka natychmiast znika z listy (przed odpowiedzią serwera)

#### TC-FLASH-006: Rollback przy błędzie usuwania
**Warunki wstępne:** Mock błędu API
**Kroki:**
1. Kliknij "Usuń" (przy symulowanym błędzie sieci)

**Oczekiwany wynik:** Fiszka wraca na listę, komunikat błędu

### 4.4 Walidacja Danych

#### TC-VAL-001: Walidacja frontu fiszki
| Dane wejściowe | Oczekiwany wynik |
|----------------|------------------|
| Pusty string | Błąd: "front is required" |
| 201 znaków | Błąd: "front must be at most 200 characters" |
| 200 znaków | Sukces |

#### TC-VAL-002: Walidacja źródła fiszki
| Dane wejściowe | Oczekiwany wynik |
|----------------|------------------|
| `source: "manual", generation_id: null` | Sukces |
| `source: "manual", generation_id: "uuid"` | Błąd |
| `source: "ai-full", generation_id: null` | Błąd |
| `source: "ai-full", generation_id: "uuid"` | Sukces |

#### TC-VAL-003: Walidacja tekstu źródłowego
| Dane wejściowe | Oczekiwany wynik |
|----------------|------------------|
| 999 znaków | Błąd: min 1000 |
| 10001 znaków | Błąd: max 10000 |
| 5000 znaków | Sukces |

---

## 5. Środowisko Testowe

### 5.1 Środowiska

| Środowisko | Cel | Baza danych | AI Service |
|------------|-----|-------------|------------|
| Lokalne | Development | Supabase local | Mock |
| CI/CD | Automated tests | Supabase test | Mock |
| Staging | Integration | Supabase staging | OpenRouter sandbox |
| Produkcja | Smoke tests | Supabase prod | OpenRouter prod |

### 5.2 Dane Testowe

**Użytkownicy testowi:**
- `test-user-1@example.com` - standardowy użytkownik
- `test-user-2@example.com` - użytkownik z dużą liczbą fiszek
- `new-user@example.com` - rejestracja nowych kont

**Fixtures:**
- Tekst źródłowy 1000 znaków (minimum)
- Tekst źródłowy 10000 znaków (maximum)
- Zestaw 100 fiszek dla testów paginacji

### 5.3 Mockowanie Zewnętrznych Usług

**OpenRouter Mock:**
```typescript
// Mock dla testów jednostkowych i integracyjnych
const mockOpenRouterResponse = {
  flashcards: [
    { front: "Pytanie 1", back: "Odpowiedź 1" },
    { front: "Pytanie 2", back: "Odpowiedź 2" },
  ],
};
```

---

## 6. Narzędzia do Testowania

### 6.1 Rekomendowany Stack Testowy

| Typ testów | Narzędzie | Uzasadnienie |
|------------|-----------|--------------|
| Unit | Vitest | Natywna integracja z Vite/Astro, szybki |
| Integracyjne | Vitest + MSW | Mockowanie HTTP requests |
| E2E | Playwright | Cross-browser, stabilny, dobre wsparcie Astro |
| Komponenty React | React Testing Library | Standard dla testów React |
| API | Supertest / Vitest | Testowanie endpoints |
| Coverage | c8 / istanbul | Wbudowane w Vitest |

### 6.2 Konfiguracja CI/CD

```yaml
# .github/workflows/test.yml
name: Tests
on: [push, pull_request]
jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: '20'
      - run: npm ci
      - run: npm run test:unit
      - run: npm run test:integration
      - run: npm run test:e2e
```

---

## 7. Harmonogram Testów

### 7.1 Faza 1: Setup (Tydzień 1)
- [ ] Konfiguracja Vitest
- [ ] Konfiguracja Playwright
- [ ] Setup MSW dla mockowania
- [ ] Utworzenie fixtures i seedów

### 7.2 Faza 2: Testy Jednostkowe (Tydzień 2-3)
- [ ] Testy serwisów (flashcard, generation, openrouter)
- [ ] Testy schematów walidacji
- [ ] Testy hooków React
- [ ] Target: 80% code coverage dla lib/

### 7.3 Faza 3: Testy Integracyjne (Tydzień 4)
- [ ] Testy API endpoints
- [ ] Testy middleware
- [ ] Testy integracji z Supabase

### 7.4 Faza 4: Testy E2E (Tydzień 5)
- [ ] Scenariusze krytyczne (E2E-01 do E2E-04)
- [ ] Testy responsywności
- [ ] Testy cross-browser

### 7.5 Faza 5: Testy Bezpieczeństwa i Wydajności (Tydzień 6)
- [ ] Audyt bezpieczeństwa
- [ ] Testy obciążeniowe
- [ ] Optymalizacja

---

## 8. Kryteria Akceptacji Testów

### 8.1 Kryteria Wejścia
- Kod przechodzi linting (ESLint)
- Kod przechodzi type-checking (TypeScript)
- Build aplikacji kończy się sukcesem

### 8.2 Kryteria Sukcesu

| Metryka | Wymagane | Docelowe |
|---------|----------|----------|
| Code coverage (unit) | > 70% | > 85% |
| Testy jednostkowe passing | 100% | 100% |
| Testy integracyjne passing | 100% | 100% |
| Testy E2E passing | 95% | 100% |
| Krytyczne scenariusze | 100% | 100% |

### 8.3 Kryteria Wyjścia
- Wszystkie testy krytyczne przechodzą
- Brak otwartych bugów o priorytecie krytycznym
- Code coverage powyżej progu minimalnego
- Dokumentacja testów kompletna

---

## 9. Role i Odpowiedzialności

| Rola | Odpowiedzialność |
|------|------------------|
| QA Lead | Planowanie, koordynacja, raportowanie |
| Developer | Testy jednostkowe, code review testów |
| QA Engineer | Testy E2E, scenariusze testowe |
| DevOps | CI/CD, środowiska testowe |

---

## 10. Procedury Raportowania Błędów

### 10.1 Szablon Raportu Błędu

```markdown
## Tytuł: [Krótki opis błędu]

**Środowisko:** [lokalne/staging/produkcja]
**Przeglądarka:** [Chrome/Firefox/Safari] [wersja]
**Priorytet:** [Krytyczny/Wysoki/Średni/Niski]

### Kroki do reprodukcji:
1. 
2. 
3. 

### Oczekiwany wynik:


### Aktualny wynik:


### Załączniki:
- Screenshots
- Logi konsoli
- Network requests
```

### 10.2 Klasyfikacja Priorytetów

| Priorytet | Opis | SLA naprawy |
|-----------|------|-------------|
| Krytyczny | Blokuje kluczową funkcjonalność, brak workaround | 24h |
| Wysoki | Znaczący wpływ na użytkowników | 3 dni |
| Średni | Ograniczony wpływ, istnieje workaround | 1 tydzień |
| Niski | Kosmetyczny, minimal impact | Następny sprint |

### 10.3 Workflow Błędów

```
Nowy → W analizie → W naprawie → W testach → Zamknięty
                 ↓
            Nie do naprawy
```

---

## 11. Ryzyka i Mitygacja

| Ryzyko | Prawdopodobieństwo | Wpływ | Mitygacja |
|--------|-------------------|-------|-----------|
| Niestabilność OpenRouter API | Średnie | Wysoki | Mocki w testach, retry logic |
| Zmiany w API Supabase | Niskie | Wysoki | Pinowanie wersji, monitoring |
| Flaky E2E tests | Wysokie | Średni | Stabilne selectory, waity |
| Brak pokrycia edge cases | Średnie | Średni | Mutation testing |

---

## 12. Załączniki

### A. Mapa Pokrycia Testami

```
src/
├── lib/
│   ├── flashcard.service.ts    [UNIT] [INT]
│   ├── flashcard.schema.ts     [UNIT]
│   ├── generation.service.ts   [UNIT] [INT]
│   ├── generation.schema.ts    [UNIT]
│   ├── openrouter.service.ts   [UNIT]
│   └── openrouter.errors.ts    [UNIT]
├── pages/api/
│   ├── flashcards.ts           [INT]
│   ├── flashcards/[id].ts      [INT]
│   ├── generations.ts          [INT]
│   └── auth/                   [INT]
├── middleware/
│   └── index.ts                [INT]
└── components/
    ├── generate/               [E2E]
    ├── flashcards/             [E2E]
    └── auth/                   [E2E]
```

### B. Checklist przed Release

- [ ] Wszystkie testy automatyczne przechodzą
- [ ] Manualne testy smoke wykonane
- [ ] Performance budgety spełnione
- [ ] Security audit przeprowadzony
- [ ] Dokumentacja zaktualizowana
- [ ] Rollback plan przygotowany
