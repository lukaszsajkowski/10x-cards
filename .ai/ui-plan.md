# Architektura UI dla 10x-cards

## 1. Przegląd struktury UI

Architektura interfejsu użytkownika 10x-cards została zaprojektowana w modelu **hybrydowym (Astro + React Islands)**, kładąc nacisk na wydajność ("Mobile First") oraz płynność interakcji.

*   **Szkielet aplikacji (App Shell):** Statyczny layout renderowany przez Astro, zapewniający szybki Time-to-First-Byte (TTFB).
*   **Interaktywność:** Kluczowe funkcjonalności (Dashboard, Generator, Edycja) realizowane są jako "wyspy" React (`client:only="react"`), komunikujące się z API poprzez **TanStack Query** (zarządzanie stanem serwera i cache).
*   **Stylistyka:** Wykorzystanie Tailwind CSS v4 oraz biblioteki komponentów Shadcn/ui zapewnia spójny, dostępny i responsywny design z obsługą trybu ciemnego (Dark Mode).

System nawigacji dynamicznie dostosowuje się do urządzenia:
*   **Desktop:** Stały pasek boczny (Sidebar).
*   **Mobile:** Dolny pasek nawigacyjny (Bottom Navigation) dla głównych widoków + Drawery (wysuwane panele) dla akcji edycji.

## 2. Lista widoków

### 2.1. App Shell (Globalny Layout)
*   **Ścieżka:** Wrappery w `src/layouts`
*   **Główny cel:** Zapewnienie spójnej nawigacji, kontekstu sesji i obsługi globalnych powiadomień.
*   **Kluczowe komponenty:**
    *   `Sidebar` (Desktop) / `BottomNav` (Mobile).
    *   `ThemeToggle` (Przełącznik motywu).
    *   `Toaster` (Globalny kontener powiadomień).
    *   `AuthGuard` (Middleware przekierowujący niezalogowanych użytkowników).

### 2.2. Strona Logowania / Rejestracji
*   **Ścieżka:** `/auth/login`, `/auth/register`
*   **Główny cel:** Uwierzytelnienie użytkownika (US-001, US-002).
*   **Kluczowe informacje:** Formularze wprowadzania danych, komunikaty błędów walidacji.
*   **Kluczowe komponenty:**
    *   `AuthForm` (zintegrowany z Supabase Auth).
    *   Link do odzyskiwania hasła.
*   **UX/Bezpieczeństwo:** Walidacja client-side przed wysłaniem, jasne komunikaty błędów, przekierowanie do Dashboardu po sukcesie.

### 2.3. Dashboard "Moje Fiszki"
*   **Ścieżka:** `/flashcards` 
*   **Główny cel:** Przeglądanie, wyszukiwanie i zarządzanie kolekcją fiszek (US-005, US-006, US-007).
*   **Kluczowe informacje:** Lista fiszek użytkownika, statusy ładowania/błędów.
*   **Kluczowe komponenty:**
    *   `FlashcardList`: Wirtualizowana lista (dla wydajności przy dużej liczbie elementów).
    *   `FlashcardItem`: Pojedyncza karta z podglądem przód/tył.
    *   `CreateFlashcardDialog`: Modal do ręcznego dodawania (US-007).
    *   `EditFlashcardDrawer`: Panel edycji (Mobile) / Modal (Desktop).
    *   `EmptyState`: Ilustracja + CTA "Generuj z AI" gdy brak fiszek.
*   **UX/Dostępność:** Infinite Scroll, Optimistic UI (natychmiastowe usunięcie z widoku przy delete), pełna obsługa klawiaturą akcji na kartach.

### 2.4. Generator AI
*   **Ścieżka:** `/generate` (Strona startowa po zalogowaniu)
*   **Główny cel:** Tworzenie fiszek na podstawie tekstu (US-003, US-004).
*   **Kluczowe informacje:** Pole wprowadzania, podgląd generowanych treści, tryb weryfikacji.
*   **Kluczowe komponenty:**
    *   `SourceTextInput`: Textarea z licznikiem znaków i walidacją (1k-10k znaków).
    *   `GenerationLoader`: Skeleton UI + paski postępu/statusy.
    *   `ReviewBoard`: Lista propozycji fiszek w formie edytowalnych formularzy.
    *   `SourceTextPreview`: Zwijany panel ("akordeon") z oryginalnym tekstem do weryfikacji.
    *   `BulkActionsBar`: Pasek (Sticky Footer) z przyciskami "Zapisz X fiszek" / "Odrzuć".
*   **UX:** Ochrona przed utratą danych (localStorage dla draftu inputu), jasne rozróżnienie między "Propozycją" a "Zapisaną fiszką".

### 2.5. Historia Generowań
*   **Ścieżka:** `/generations`
*   **Główny cel:** Wgląd w historyczne operacje generowania.
*   **Kluczowe informacje:** Data, fragment tekstu źródłowego, liczba wygenerowanych fiszek.
*   **Kluczowe komponenty:**
    *   `GenerationsTable` lub `GenerationsList`.
*   **UX:** Read-only widok audytowy.

### 2.6. Ustawienia (Profil)
*   **Ścieżka:** `/settings`
*   **Główny cel:** Zarządzanie kontem (US-009).
*   **Kluczowe informacje:** Email użytkownika, strefa niebezpieczna (usuwanie konta).
*   **Kluczowe komponenty:**
    *   `SignOutButton`.
    *   `DeleteAccountZone` (z podwójnym potwierdzeniem).

## 3. Mapa podróży użytkownika (User Journey)

### Scenariusz główny: Nowy użytkownik generuje pierwszy zestaw

1.  **Wejście:** Użytkownik wchodzi na stronę, widzi ekran logowania.
2.  **Auth:** Rejestruje się i zostaje automatycznie przekierowany do `/generate`.
4.  **Input:** Wkleja tekst z podręcznika.
5.  **Generowanie:** Klika "Generuj". Widok przechodzi w stan ładowania (Skeletony imitujące karty).
6.  **Recenzja (Review Mode):**
    *   AI zwraca 10 propozycji.
    *   Użytkownik usuwa 2 błędne propozycje (znikają z listy).
    *   Użytkownik edytuje treść jednej fiszki (poprawia literówkę).
7.  **Zapis:** Użytkownik klika "Zapisz 8 fiszek".
8.  **Sukces:** Aplikacja wysyła request `POST /flashcards`, wyświetla Toast "Zapisano pomyślnie" i przekierowuje do `/flashcards`.
9.  **Wynik:** Dashboard wyświetla teraz 8 nowych fiszek.

## 4. Układ i struktura nawigacji

### Desktop (Szerokie ekrany)
*   **Sidebar (Lewa strona):**
    *   Logo (Góra).
    *   Menu Główne:
        *   Ikona + Label: "Moje Fiszki" (Link do `/flashcards`).
        *   Ikona + Label: "Generator AI" (Link do `/generate`).
        *   Ikona + Label: "Historia" (Link do `/generations`).
    *   Menu Użytkownika (Dół):
        *   Avatar / Email (Link do `/settings` lub Popover).
        *   Przełącznik Motywu.

### Mobile (Wąskie ekrany)
*   **Top Bar:**
    *   Logo.
    *   Menu Hamburgera lub Ikona Użytkownika (dostęp do Ustawień).
*   **Bottom Navigation (Fixed):**
    *   3 równe sekcje: "Fiszki", "Generator" (wyróżniony, centralny lub pierwszy), "Historia".
*   **Interakcje:**
    *   Otwieranie szczegółów/edycji fiszki powoduje wysunięcie "Drawer" (panelu od dołu) na ~80% wysokości ekranu, zachowując kontekst listy pod spodem.

## 5. Kluczowe komponenty UI

### 5.1. Flashcard Card (Prezentacja)
Karta z opcją "Flip" (obrót) lub wyraźnym podziałem na sekcję Pytanie/Odpowiedź. Zawiera menu kontekstowe (trzy kropki) z akcjami: Edytuj, Usuń. W trybie generatora posiada dodatkowy checkbox "Zatwierdź" (domyślnie zaznaczony) lub przycisk "Odrzuć" (X).

### 5.2. Review Board (Generator)
Kontener zarządzający stanem tablicy propozycji (`draftFlashcards`). Obsługuje logikę:
*   Usunięcie elementu z tablicy lokalnej (nie wymaga API call).
*   Edycja pola `front`/`back` w pamięci podręcznej.
*   Masowy zapis (konwersja tablicy draftów na payload do API).

### 5.3. Feedback Indicators
*   **Skeletony:** Używane zamiast spinnerów podczas ładowania danych (np. kształt karty fiszki).
*   **Character Counter:** Wizualny wskaźnik przy textarea (np. zmienia kolor na żółty/czerwony blisko limitu).
*   **Toast Notifications:** Dymki powiadomień (Prawy dolny róg desktop, Góra mobile) informujące o sukcesie zapisu lub błędzie API.

### 5.4. Modal / Drawer System
Uniwersalny wrapper, który na desktopie renderuje się jako wyśrodkowany `Dialog`, a na urządzeniach mobilnych jako wysuwany od dołu `Drawer` (Shadcn/ui `Vaul`). Kluczowe dla zachowania "Mobile First" przy formularzach edycji.

