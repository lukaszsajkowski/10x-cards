# Specyfikacja Modułu Autentykacji - 10x Cards

## 1. Wprowadzenie

Niniejsza specyfikacja opisuje architekturę modułu rejestracji, logowania i odzyskiwania hasła dla aplikacji 10x Cards. Dokument bazuje na wymaganiach US-001 (Rejestracja konta), US-002 (Logowanie do aplikacji) oraz US-009 (Bezpieczny dostęp i autoryzacja) z pliku PRD.

### 1.1 Stack technologiczny

- **Frontend**: Astro 5 (SSR, output: "server") + React 19 + TypeScript 5
- **Stylowanie**: Tailwind 4 + Shadcn/ui
- **Backend**: Supabase (PostgreSQL + Auth)
- **Adapter**: Node.js (standalone)

### 1.2 Założenia

- Wykorzystanie wbudowanego systemu Supabase Auth dla obsługi rejestracji, logowania i resetowania hasła
- Autentykacja oparta na email + hasło
- Sesja zarządzana przez tokeny JWT (access + refresh token)
- Server-side rendering z weryfikacją sesji w middleware Astro

---

## 2. Architektura interfejsu użytkownika

### 2.1 Struktura stron i layoutów

#### 2.1.1 Layouty

| Layout | Przeznaczenie | Plik |
|--------|--------------|------|
| `AuthLayout` | Strony publiczne (login, register, reset-password) - wycentrowany formularz bez nawigacji | `src/layouts/AuthLayout.astro` |
| `AppShellLayout` | Strony chronione (generate, flashcards, generations, settings) - pełna nawigacja z menu użytkownika | `src/layouts/AppShellLayout.astro` |

#### 2.1.2 Strony autentykacji (publiczne)

| Strona | Ścieżka | Plik | Opis |
|--------|---------|------|------|
| Logowanie | `/auth/login` | `src/pages/auth/login.astro` | Formularz logowania (email + hasło) |
| Rejestracja | `/auth/register` | `src/pages/auth/register.astro` | Formularz rejestracji (email + hasło + potwierdzenie) |
| Reset hasła | `/auth/reset-password` | `src/pages/auth/reset-password.astro` | **NOWA** - Formularz żądania resetu hasła |
| Nowe hasło | `/auth/update-password` | `src/pages/auth/update-password.astro` | **NOWA** - Formularz ustawienia nowego hasła (callback) |

#### 2.1.3 Strony chronione (wymagające autentykacji)

| Strona | Ścieżka | Plik |
|--------|---------|------|
| Generator fiszek | `/generate` | `src/pages/generate.astro` |
| Moje fiszki | `/flashcards` | `src/pages/flashcards.astro` |
| Historia generacji | `/generations` | `src/pages/generations.astro` |
| Sesja nauki | `/study` | `src/pages/study.astro` |
| Ustawienia | `/settings` | `src/pages/settings.astro` |

#### 2.1.4 Strona główna

| Strona | Ścieżka | Zachowanie |
|--------|---------|------------|
| Landing | `/` | Przekierowanie do `/generate` dla zalogowanych lub `/auth/login` dla niezalogowanych |

### 2.2 Komponenty React

#### 2.2.1 Istniejące komponenty do modyfikacji

| Komponent | Plik | Wymagane zmiany |
|-----------|------|-----------------|
| `AuthForm` | `src/components/auth/AuthForm.tsx` | Rozszerzenie o tryb `reset-password` i `update-password` |
| `AuthFormFields` | `src/components/auth/AuthFormFields.tsx` | Warunkowe wyświetlanie pól w zależności od trybu |
| `AuthLinks` | `src/components/auth/AuthLinks.tsx` | Dostosowanie linków dla każdego trybu |
| `useAuthForm` | `src/components/auth/hooks/useAuthForm.ts` | Dodanie logiki dla resetowania i aktualizacji hasła |
| `useAuth` | `src/components/navigation/hooks/useAuth.ts` | **Pełna reimplementacja** - integracja z Supabase Auth |
| `UserMenu` | `src/components/navigation/UserMenu.tsx` | Wykorzystanie rzeczywistego emaila z sesji |

#### 2.2.2 Nowe komponenty

| Komponent | Plik | Odpowiedzialność |
|-----------|------|------------------|
| `ResetPasswordSuccess` | `src/components/auth/ResetPasswordSuccess.tsx` | Komunikat potwierdzający wysłanie linku resetującego |

#### 2.2.3 Typy komponentów auth

Rozszerzenie typu `AuthMode` w `src/components/auth/types.ts`:

```typescript
export type AuthMode = "login" | "register" | "reset-password" | "update-password";
```

### 2.3 Podział odpowiedzialności

#### 2.3.1 Strony Astro (Server-Side)

Strony Astro odpowiadają za:
- Weryfikację sesji użytkownika w middleware przed renderowaniem
- Przekierowania dla nieautoryzowanych użytkowników
- Przekazywanie danych sesji do komponentów React przez props
- Renderowanie layoutów i struktury HTML

#### 2.3.2 Komponenty React (Client-Side)

Komponenty React odpowiadają za:
- Interaktywne formularze (walidacja, wysyłanie)
- Komunikację z Supabase Auth API
- Zarządzanie stanem UI (loading, błędy)
- Nawigację po akcjach użytkownika (przekierowania po logowaniu/wylogowaniu)

### 2.4 Przepływy użytkownika (User Flows)

#### 2.4.1 Rejestracja (US-001)

```
1. Użytkownik wchodzi na /auth/register
2. Wypełnia formularz (email, hasło, potwierdzenie hasła)
3. Walidacja client-side:
   - Email: wymagany, format email
   - Hasło: wymagane, min. 6 znaków
   - Potwierdzenie: wymagane, zgodność z hasłem
4. Submit → Supabase auth.signUp()
5. Sukces:
   - Jeśli email confirmation wyłączony: automatyczne logowanie → przekierowanie do /generate
   - Jeśli email confirmation włączony: komunikat o wysłaniu maila weryfikacyjnego
6. Błąd: wyświetlenie komunikatu (np. "Użytkownik już istnieje")
```

#### 2.4.2 Logowanie (US-002)

```
1. Użytkownik wchodzi na /auth/login
2. Wypełnia formularz (email, hasło)
3. Walidacja client-side:
   - Email: wymagany, format email
   - Hasło: wymagane
4. Submit → Supabase auth.signInWithPassword()
5. Sukces: przekierowanie do /generate
6. Błąd: wyświetlenie komunikatu ("Nieprawidłowy email lub hasło")
```

#### 2.4.3 Resetowanie hasła

```
1. Użytkownik wchodzi na /auth/reset-password
2. Wypełnia formularz (email)
3. Walidacja: email wymagany, format email
4. Submit → Supabase auth.resetPasswordForEmail()
5. Sukces: wyświetlenie komunikatu o wysłaniu linku
6. Błąd: wyświetlenie komunikatu
```

#### 2.4.4 Ustawienie nowego hasła

```
1. Użytkownik klika link z maila → /auth/update-password#access_token=...
2. Supabase automatycznie parsuje token z URL hash
3. Użytkownik wypełnia formularz (nowe hasło, potwierdzenie)
4. Walidacja: hasło min. 6 znaków, zgodność
5. Submit → Supabase auth.updateUser({ password })
6. Sukces: przekierowanie do /auth/login z komunikatem
7. Błąd: wyświetlenie komunikatu (np. "Link wygasł")
```

#### 2.4.5 Wylogowanie

```
1. Użytkownik klika "Wyloguj" w UserMenu
2. Wywołanie Supabase auth.signOut()
3. Przekierowanie do /auth/login
```

### 2.5 Walidacja i komunikaty błędów

#### 2.5.1 Walidacja client-side

| Pole | Reguły | Komunikat błędu |
|------|--------|-----------------|
| Email | Wymagane | "Adres email jest wymagany" |
| Email | Format | "Podaj poprawny adres email" |
| Hasło | Wymagane | "Hasło jest wymagane" |
| Hasło | Min. 6 znaków | "Hasło musi mieć minimum 6 znaków" |
| Potwierdzenie hasła | Wymagane | "Potwierdzenie hasła jest wymagane" |
| Potwierdzenie hasła | Zgodność | "Hasła muszą być identyczne" |

#### 2.5.2 Błędy Supabase Auth

| Błąd Supabase | Komunikat dla użytkownika |
|---------------|---------------------------|
| Invalid login credentials | "Nieprawidłowy email lub hasło" |
| Email not confirmed | "Potwierdź swój adres email przed zalogowaniem" |
| User already registered | "Użytkownik z tym adresem email już istnieje" |
| Password should be at least 6 characters | "Hasło musi mieć minimum 6 znaków" |
| Email rate limit exceeded | "Zbyt wiele prób. Spróbuj ponownie później" |
| Invalid token | "Link resetowania hasła wygasł lub jest nieprawidłowy" |

#### 2.5.3 Komunikaty sukcesu

| Akcja | Komunikat |
|-------|-----------|
| Rejestracja (bez potwierdzenia) | Przekierowanie do /generate (brak komunikatu) |
| Rejestracja (z potwierdzeniem) | "Sprawdź swoją skrzynkę email i potwierdź rejestrację" |
| Reset hasła | "Link do resetowania hasła został wysłany na podany adres email" |
| Zmiana hasła | "Hasło zostało zmienione. Możesz się teraz zalogować" |

---

## 3. Logika backendowa

### 3.1 Middleware Astro

#### 3.1.1 Rozszerzenie pliku `src/middleware/index.ts`

Middleware musi realizować następujące zadania:

1. **Inicjalizacja klienta Supabase Server-Side**
   - Utworzenie klienta Supabase z obsługą cookies (dla SSR)
   - Przekazanie klienta do `context.locals`

2. **Weryfikacja i odświeżanie sesji**
   - Pobranie sesji z cookies
   - Automatyczne odświeżanie tokenu jeśli wygasł
   - Zapisanie odświeżonej sesji do cookies

3. **Przekazanie danych użytkownika**
   - Dodanie obiektu `user` do `context.locals` (lub `null` dla niezalogowanych)

4. **Ochrona tras**
   - Definicja list ścieżek publicznych i chronionych
   - Przekierowanie niezalogowanych z chronionych tras do `/auth/login`
   - Przekierowanie zalogowanych ze stron auth do `/generate`

#### 3.1.2 Rozszerzenie typu `Astro.locals`

Aktualizacja pliku `src/env.d.ts`:

```typescript
declare namespace App {
  interface Locals {
    supabase: SupabaseClient;
    user: User | null;
  }
}
```

#### 3.1.3 Logika ochrony tras

| Ścieżka | Wymagana autentykacja | Zachowanie dla niezalogowanych | Zachowanie dla zalogowanych |
|---------|----------------------|-------------------------------|----------------------------|
| `/auth/login` | Nie | Renderuj stronę | Przekieruj do `/generate` |
| `/auth/register` | Nie | Renderuj stronę | Przekieruj do `/generate` |
| `/auth/reset-password` | Nie | Renderuj stronę | Przekieruj do `/generate` |
| `/auth/update-password` | Nie* | Renderuj stronę | Renderuj stronę |
| `/generate` | Tak | Przekieruj do `/auth/login` | Renderuj stronę |
| `/flashcards` | Tak | Przekieruj do `/auth/login` | Renderuj stronę |
| `/generations` | Tak | Przekieruj do `/auth/login` | Renderuj stronę |
| `/study` | Tak | Przekieruj do `/auth/login` | Renderuj stronę |
| `/settings` | Tak | Przekieruj do `/auth/login` | Renderuj stronę |
| `/` | Nie | Przekieruj do `/auth/login` | Przekieruj do `/generate` |
| `/api/*` | Tak** | Zwróć 401 | Kontynuuj |

*Strona update-password dostępna dla wszystkich - token w URL hash
**API wymaga autentykacji, ale obsługa przez sam endpoint

### 3.2 Modyfikacja klienta Supabase

#### 3.2.1 Nowy moduł `src/db/supabase.server.ts`

Utworzenie klienta Supabase dla SSR z obsługą cookies:

```typescript
// Kontakt: createServerClient z @supabase/ssr
// Parametry: context Astro (request, cookies)
// Return: SupabaseClient skonfigurowany dla SSR
```

Funkcjonalność:
- Odczyt cookies z request
- Zapis cookies do response
- Automatyczna obsługa refresh tokenów

#### 3.2.2 Zachowanie istniejącego klienta

Plik `src/db/supabase.client.ts` pozostaje bez zmian - używany przez komponenty React po stronie klienta.

**Usunięcie `DEFAULT_USER_ID`** - ta stała była tymczasowym rozwiązaniem i musi zostać usunięta po wdrożeniu autentykacji.

### 3.3 Modyfikacja endpointów API

#### 3.3.1 Ogólna zmiana

Wszystkie endpointy API muszą:
1. Pobierać `user` z `locals` zamiast używać `DEFAULT_USER_ID`
2. Zwracać 401 jeśli `user` jest `null`
3. Używać `user.id` jako `userId` w serwisach

#### 3.3.2 Lista endpointów do modyfikacji

| Endpoint | Plik | Zmiana |
|----------|------|--------|
| GET/POST `/api/flashcards` | `src/pages/api/flashcards.ts` | Użycie `locals.user.id` |
| GET/PUT/DELETE `/api/flashcards/[id]` | `src/pages/api/flashcards/[id].ts` | Użycie `locals.user.id` |
| GET/POST `/api/generations` | `src/pages/api/generations.ts` | Użycie `locals.user.id` |
| GET `/api/generations/[id]` | `src/pages/api/generations/[id].ts` | Użycie `locals.user.id` |
| GET/POST `/api/generation-error-logs` | `src/pages/api/generation-error-logs.ts` | Użycie `locals.user.id` |

#### 3.3.3 Wzorzec obsługi autoryzacji w API

```typescript
export const GET: APIRoute = async ({ locals }) => {
  const { user, supabase } = locals;
  
  if (!user) {
    return new Response(
      JSON.stringify({ message: "Unauthorized" }),
      { status: 401, headers: { "content-type": "application/json" } }
    );
  }
  
  // Dalsze operacje z user.id
};
```

### 3.4 Modyfikacja stron Astro

#### 3.4.1 AppShellLayout

Zmiana w `src/layouts/AppShellLayout.astro`:

```diff
- const userEmail = "user@example.com";
+ const userEmail = Astro.locals.user?.email ?? "";
```

#### 3.4.2 Strona główna

Zmiana w `src/pages/index.astro` - przekierowanie na podstawie stanu sesji:

```typescript
const user = Astro.locals.user;
if (user) {
  return Astro.redirect('/generate');
} else {
  return Astro.redirect('/auth/login');
}
```

### 3.5 Nowe endpointy API (opcjonalne)

#### 3.5.1 Callback endpoint `/api/auth/callback`

Endpoint do obsługi callbacków OAuth i email confirmation (jeśli używane):

| Metoda | Ścieżka | Opis |
|--------|---------|------|
| GET | `/api/auth/callback` | Obsługa przekierowań z Supabase Auth |

Funkcjonalność:
- Wymiana kodu autoryzacyjnego na sesję
- Ustawienie cookies sesji
- Przekierowanie do docelowej strony

---

## 4. System autentykacji Supabase

### 4.1 Konfiguracja Supabase Auth

#### 4.1.1 Ustawienia projektu Supabase

| Ustawienie | Wartość | Opis |
|------------|---------|------|
| Site URL | URL produkcyjny | Bazowy URL aplikacji |
| Redirect URLs | `/auth/update-password`, `/api/auth/callback` | Dozwolone przekierowania |
| Email confirmations | Do ustalenia (rekomendowane: włączone) | Weryfikacja email przy rejestracji |
| Secure email change | Włączone | Wymaga potwierdzenia email przy zmianie |

#### 4.1.2 Szablony email (opcjonalne dostosowanie)

| Szablon | Użycie |
|---------|--------|
| Confirm signup | Potwierdzenie rejestracji |
| Reset password | Link do resetowania hasła |
| Magic link | Nie używane w tej implementacji |

### 4.2 Wykorzystanie Supabase Auth API

#### 4.2.1 Metody używane po stronie klienta

| Metoda | Użycie |
|--------|--------|
| `auth.signUp()` | Rejestracja nowego użytkownika |
| `auth.signInWithPassword()` | Logowanie email + hasło |
| `auth.signOut()` | Wylogowanie |
| `auth.resetPasswordForEmail()` | Żądanie resetu hasła |
| `auth.updateUser()` | Aktualizacja hasła |
| `auth.onAuthStateChange()` | Nasłuchiwanie zmian sesji |

#### 4.2.2 Metody używane po stronie serwera

| Metoda | Użycie |
|--------|--------|
| `auth.getSession()` | Pobranie aktualnej sesji |
| `auth.getUser()` | Pobranie danych użytkownika |
| `auth.refreshSession()` | Odświeżenie tokenu |

### 4.3 Zarządzanie sesją

#### 4.3.1 Tokeny

| Token | Czas życia | Przechowywanie |
|-------|------------|----------------|
| Access token | 1 godzina (domyślnie) | Cookie httpOnly |
| Refresh token | 60 dni (domyślnie) | Cookie httpOnly |

#### 4.3.2 Przepływ odświeżania sesji

```
1. Request przychodzi do middleware
2. Middleware pobiera sesję z cookies
3. Jeśli access token wygasł:
   - Middleware wywołuje refreshSession()
   - Nowe tokeny zapisywane do cookies
4. Dane user przekazane do locals
5. Request kontynuowany
```

#### 4.3.3 Obsługa wygaśnięcia sesji (client-side)

Hook `useAuth` powinien nasłuchiwać na `SIGNED_OUT` event i przekierowywać do `/auth/login`.

### 4.4 Bezpieczeństwo (US-009)

#### 4.4.1 Row Level Security (RLS)

Istniejące polityki RLS w bazie danych zapewniają:
- Użytkownik widzi tylko własne fiszki
- Użytkownik widzi tylko własne generacje
- Użytkownik widzi tylko własne logi błędów
- Anonimowi użytkownicy nie mają dostępu do żadnych danych

#### 4.4.2 Zabezpieczenia warstwy aplikacji

| Warstwa | Mechanizm |
|---------|-----------|
| Middleware | Weryfikacja sesji, przekierowania |
| API | Sprawdzenie `locals.user` przed operacjami |
| Supabase | RLS policies na poziomie bazy danych |
| Cookies | httpOnly, Secure, SameSite=Lax |

---

## 5. Modyfikacje istniejących komponentów

### 5.1 Rozszerzenie `useAuthForm`

#### 5.1.1 Nowa logika dla trybów

| Tryb | Pola formularza | Akcja submit |
|------|-----------------|--------------|
| `login` | email, password | `signInWithPassword()` |
| `register` | email, password, confirmPassword | `signUp()` |
| `reset-password` | email | `resetPasswordForEmail()` |
| `update-password` | password, confirmPassword | `updateUser()` |

#### 5.1.2 Stan sukcesu

Dodanie stanu `successMessage` dla trybu `reset-password` - wyświetlanie komunikatu po wysłaniu linku.

### 5.2 Reimplementacja `useAuth`

#### 5.2.1 Nowa struktura

```typescript
interface UseAuthReturn {
  user: User | null;
  isLoading: boolean;
  logout: () => Promise<void>;
}
```

#### 5.2.2 Inicjalizacja

- Pobranie początkowej sesji przez `auth.getSession()`
- Nasłuchiwanie zmian przez `auth.onAuthStateChange()`
- Cleanup subskrypcji przy unmount

### 5.3 Aktualizacja `AuthForm`

#### 5.3.1 Konfiguracja dla nowych trybów

```typescript
const FORM_CONFIG = {
  login: { ... },
  register: { ... },
  "reset-password": {
    title: "Resetuj hasło",
    description: "Podaj adres email, na który wyślemy link do resetowania hasła",
    submitText: "Wyślij link",
    loadingText: "Wysyłanie...",
  },
  "update-password": {
    title: "Ustaw nowe hasło",
    description: "Wprowadź nowe hasło dla swojego konta",
    submitText: "Zmień hasło",
    loadingText: "Zapisywanie...",
  },
};
```

### 5.4 Aktualizacja `AuthLinks`

#### 5.4.1 Linki dla każdego trybu

| Tryb | Linki |
|------|-------|
| `login` | "Nie masz konta? Zarejestruj się", "Zapomniałeś hasła?" |
| `register` | "Masz już konto? Zaloguj się" |
| `reset-password` | "Wróć do logowania" |
| `update-password` | Brak (po zmianie redirect) |

---

## 6. Struktura plików do utworzenia/modyfikacji

### 6.1 Nowe pliki

| Plik | Typ | Opis |
|------|-----|------|
| `src/pages/auth/reset-password.astro` | Strona | Formularz żądania resetu hasła |
| `src/pages/auth/update-password.astro` | Strona | Formularz ustawienia nowego hasła |
| `src/pages/study.astro` | Strona | Sesja nauki (US-008) - wymaga autentykacji |
| `src/db/supabase.server.ts` | Moduł | Klient Supabase dla SSR |
| `src/pages/api/auth/callback.ts` | API | Callback dla auth (opcjonalny) |
| `src/pages/api/auth/delete-account.ts` | API | Endpoint do usunięcia konta użytkownika (PRD 3.3, 7) |
| `src/components/auth/ResetPasswordSuccess.tsx` | Komponent | Komunikat sukcesu reset hasła |
| `src/components/settings/DeleteAccountDialog.tsx` | Komponent | Dialog potwierdzający usunięcie konta |

### 6.2 Pliki do modyfikacji

| Plik | Zakres zmian |
|------|--------------|
| `src/middleware/index.ts` | Pełna reimplementacja - sesja, ochrona tras |
| `src/env.d.ts` | Rozszerzenie typu Locals |
| `src/components/auth/types.ts` | Rozszerzenie AuthMode, nowe komunikaty |
| `src/components/auth/hooks/useAuthForm.ts` | Nowe tryby, logika reset/update |
| `src/components/auth/AuthForm.tsx` | Konfiguracja nowych trybów |
| `src/components/auth/AuthFormFields.tsx` | Warunkowe pola |
| `src/components/auth/AuthLinks.tsx` | Nowe linki |
| `src/components/navigation/hooks/useAuth.ts` | Integracja z Supabase |
| `src/layouts/AppShellLayout.astro` | Pobieranie user z locals |
| `src/pages/index.astro` | Przekierowanie na podstawie sesji |
| `src/pages/api/flashcards.ts` | Użycie locals.user |
| `src/pages/api/flashcards/[id].ts` | Użycie locals.user |
| `src/pages/api/generations.ts` | Użycie locals.user |
| `src/pages/api/generations/[id].ts` | Użycie locals.user |
| `src/pages/api/generation-error-logs.ts` | Użycie locals.user |
| `src/db/supabase.client.ts` | Usunięcie DEFAULT_USER_ID |
| `src/pages/settings.astro` | Implementacja funkcji usunięcia konta (PRD 3.3, 7) |

---

## 7. Wymagane zależności

### 7.1 Nowe pakiety npm

| Pakiet | Wersja | Opis |
|--------|--------|------|
| `@supabase/ssr` | ^0.5.x | Helpers dla Supabase w środowisku SSR |

### 7.2 Istniejące pakiety (już zainstalowane)

| Pakiet | Użycie |
|--------|--------|
| `@supabase/supabase-js` | Klient Supabase |
| `astro` | Framework |
| `react` | Komponenty UI |

---

## 8. Kwestie do rozstrzygnięcia

### 8.1 Potwierdzenie email przy rejestracji

**Opcje:**
1. **Włączone** - użytkownik musi potwierdzić email przed pierwszym logowaniem
2. **Wyłączone** - natychmiastowy dostęp po rejestracji

**Rekomendacja:** Włączone dla produkcji, wyłączone dla developmentu.

### 8.2 Strona ustawień i usunięcie konta

Aktualna strona `/settings` jest placeholderem. **Zgodnie z wymaganiami PRD (sekcja 3.3 i 7)** strona musi zawierać funkcję usunięcia konta z powiązanymi danymi (wymóg RODO):

#### 8.2.1 Funkcjonalności wymagane (w zakresie MVP)

| Funkcja | Priorytet | Opis |
|---------|-----------|------|
| Usunięcie konta | **Wymagane** | Usunięcie konta wraz ze wszystkimi fiszkami i danymi (PRD 3.3, 7) |

#### 8.2.2 Funkcjonalności opcjonalne (poza MVP)

| Funkcja | Priorytet | Opis |
|---------|-----------|------|
| Zmiana hasła | Opcjonalne | Zmiana hasła dla zalogowanego użytkownika |
| Zmiana adresu email | Opcjonalne | Aktualizacja adresu email z potwierdzeniem |

#### 8.2.3 Przepływ usunięcia konta

```
1. Użytkownik przechodzi do /settings
2. Klika "Usuń konto"
3. Wyświetla się modal z ostrzeżeniem o trwałym usunięciu
4. Użytkownik musi wpisać "USUŃ" lub hasło w celu potwierdzenia
5. Submit → Supabase auth.admin.deleteUser() lub dedykowany endpoint
6. Sukces: wylogowanie, przekierowanie do /auth/login z komunikatem
7. Błąd: wyświetlenie komunikatu
```

**Uwaga:** Usunięcie użytkownika musi również usunąć powiązane dane (fiszki, generacje, logi) - można to zrealizować przez:
- CASCADE DELETE na poziomie bazy danych
- Lub dedykowany endpoint API z transakcją

### 8.3 Strona sesji nauki (US-008)

Strona `/study` wymaga autentykacji, ale **implementacja algorytmu powtórek jest poza zakresem modułu autentykacji**. Moduł auth odpowiada jedynie za:
- Ochronę trasy `/study` przed nieautoryzowanym dostępem
- Przekazanie `user` do kontekstu strony

Implementacja samej funkcjonalności sesji nauki (integracja z biblioteką spaced repetition, UI fiszek, ocenianie) powinna być zrealizowana w dedykowanym module zgodnie z US-008.

### 8.4 Sesja w komponencie NavigationShell

`NavigationShell` otrzymuje `userEmail` jako prop z Astro. Po reimplementacji `useAuth` możliwe są dwa podejścia:

1. **Zachowanie obecnego** - email z props (SSR), useAuth tylko do wylogowania
2. **Pełna integracja** - useAuth pobiera user client-side

**Rekomendacja:** Podejście hybrydowe - initial state z props dla szybkiego SSR, useAuth do synchronizacji i wylogowania.

---

## 9. Testowanie

### 9.1 Scenariusze do przetestowania

| Scenariusz | Oczekiwany rezultat |
|------------|---------------------|
| Rejestracja z poprawnym email i hasłem | Utworzenie konta, przekierowanie do /generate |
| Rejestracja z istniejącym emailem | Komunikat błędu |
| Logowanie z poprawnymi danymi | Przekierowanie do /generate |
| Logowanie z błędnym hasłem | Komunikat błędu |
| Reset hasła dla istniejącego email | Email z linkiem, komunikat sukcesu |
| Reset hasła dla nieistniejącego email | Ten sam komunikat (security) |
| Ustawienie nowego hasła przez link | Zmiana hasła, przekierowanie do login |
| Ustawienie hasła z wygasłym linkiem | Komunikat o wygaśnięciu |
| Dostęp do /generate bez logowania | Przekierowanie do /auth/login |
| Dostęp do /study bez logowania | Przekierowanie do /auth/login |
| Dostęp do /auth/login jako zalogowany | Przekierowanie do /generate |
| Usunięcie konta z potwierdzeniem | Usunięcie wszystkich danych użytkownika, wylogowanie |
| Usunięcie konta bez potwierdzenia | Operacja anulowana, konto pozostaje |
| Wylogowanie | Przekierowanie do /auth/login, wyczyszczenie sesji |
| API request bez sesji | 401 Unauthorized |
| Odświeżenie strony po zalogowaniu | Zachowanie sesji |

### 9.2 Testy RLS

| Test | Oczekiwany rezultat |
|------|---------------------|
| Pobranie fiszek innego użytkownika | Pusta lista (RLS blokuje) |
| Utworzenie fiszki z cudzym user_id | Błąd RLS |
| Dostęp anonimowy do API fiszek | 401 + RLS blokuje |

---

## 10. Podsumowanie

Implementacja modułu autentykacji wymaga:

1. **Utworzenia 3 nowych stron** (`reset-password`, `update-password`, `study`)
2. **Utworzenia modułu Supabase SSR** dla obsługi sesji server-side
3. **Pełnej reimplementacji middleware** z weryfikacją sesji i ochroną tras (w tym `/study`)
4. **Rozszerzenia komponentów auth** o nowe tryby formularza
5. **Reimplementacji useAuth** z integracją Supabase
6. **Modyfikacji wszystkich endpointów API** do użycia rzeczywistego user ID
7. **Aktualizacji layoutów** do pobierania danych sesji
8. **Implementacji usunięcia konta** (wymóg PRD 3.3 i 7 - RODO)

Architektura wykorzystuje istniejące polityki RLS w bazie danych i wbudowane mechanizmy Supabase Auth, minimalizując ilość własnego kodu związanego z bezpieczeństwem.

### 10.1 Pokrycie User Stories

| User Story | Status | Uwagi |
|------------|--------|-------|
| US-001 Rejestracja konta | ✅ Pełne pokrycie | Sekcja 2.4.1 |
| US-002 Logowanie + reset hasła | ✅ Pełne pokrycie | Sekcje 2.4.2-2.4.4 |
| US-008 Sesja nauki | ✅ Pokrycie ochrony tras | Strona `/study` w chronionych trasach |
| US-009 Bezpieczny dostęp | ✅ Pełne pokrycie | RLS + middleware + API |
| PRD 3.3/7 Usunięcie konta | ✅ Pokrycie | Sekcja 8.2 |
