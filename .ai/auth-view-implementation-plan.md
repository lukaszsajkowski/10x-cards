# Plan implementacji widoku Autoryzacji (Logowanie/Rejestracja)

## 1. Przegląd

Widok autoryzacji obejmuje dwa powiązane widoki: **Logowanie** (`/auth/login`) oraz **Rejestracja** (`/auth/register`). Głównym celem jest uwierzytelnienie użytkownika poprzez integrację z Supabase Auth. Widoki te implementują user stories US-001 (Rejestracja konta) oraz US-002 (Logowanie do aplikacji).

Widok zawiera:
- Formularz z polami email i hasło
- Walidację client-side przed wysłaniem
- Jasne komunikaty błędów walidacji i autentykacji
- Link do przełączania między logowaniem a rejestracją
- Link do odzyskiwania hasła (na stronie logowania)
- Przekierowanie do widoku generowania fiszek (`/generate`) po pomyślnym uwierzytelnieniu

## 2. Routing widoku

| Widok | Ścieżka | Plik |
|-------|---------|------|
| Logowanie | `/auth/login` | `src/pages/auth/login.astro` |
| Rejestracja | `/auth/register` | `src/pages/auth/register.astro` |

Oba widoki używają wspólnego layoutu `AuthLayout.astro` bez nawigacji aplikacji, ponieważ użytkownik nie jest jeszcze zalogowany.

## 3. Struktura komponentów

```
src/
├── layouts/
│   └── AuthLayout.astro           # Layout dla stron auth (bez nawigacji)
├── pages/
│   └── auth/
│       ├── login.astro            # Strona logowania
│       └── register.astro         # Strona rejestracji
└── components/
    ├── auth/
    │   ├── index.ts               # Eksport publiczny
    │   ├── AuthForm.tsx           # Główny komponent formularza
    │   ├── AuthFormFields.tsx     # Pola formularza (email, hasło, potwierdzenie)
    │   ├── AuthError.tsx          # Komponent wyświetlania błędów
    │   ├── AuthLinks.tsx          # Linki pomocnicze (rejestracja/login, reset hasła)
    │   ├── PasswordInput.tsx      # Input hasła z toggle widoczności
    │   ├── hooks/
    │   │   ├── index.ts           # Eksport hooków
    │   │   └── useAuthForm.ts     # Hook zarządzający stanem formularza i autentykacją
    │   └── types.ts               # Typy dla komponentów auth
    └── ui/
        └── input.tsx              # Komponent Input z shadcn/ui (do dodania)
```

### Drzewo komponentów

```
AuthLayout.astro
└── AuthForm (client:load)
    ├── AuthError (warunkowo)
    ├── AuthFormFields
    │   ├── Input (email)
    │   ├── PasswordInput (hasło)
    │   └── PasswordInput (potwierdzenie - tylko rejestracja)
    ├── Button (submit)
    └── AuthLinks
```

## 4. Szczegóły komponentów

### AuthLayout.astro

- **Opis komponentu**: Layout Astro dla stron autoryzacji. Prosty, wycentrowany układ bez nawigacji aplikacji. Zawiera obsługę ciemnego motywu i meta tagi.

- **Główne elementy**:
  - `<html>`, `<head>` z meta tagami i tytułem
  - Skrypt inicjalizujący motyw (jak w AppShellLayout)
  - `<main>` z wycentrowanym kontenerem na formularz
  - Slot na zawartość strony

- **Propsy**:
  ```typescript
  interface Props {
    title?: string;
  }
  ```

### AuthForm

- **Opis komponentu**: Główny komponent kontenerowy formularza autoryzacji. Zarządza logiką logowania/rejestracji poprzez hook `useAuthForm`. Renderuje formularz z polami, przyciskiem submit oraz linkami pomocniczymi.

- **Główne elementy**:
  - `<form>` z obsługą submit
  - `Card` jako kontener wizualny
  - `CardHeader` z tytułem i opisem
  - `CardContent` z `AuthFormFields`
  - `CardFooter` z przyciskiem submit i `AuthLinks`
  - `AuthError` (warunkowo, gdy wystąpił błąd)

- **Obsługiwane interakcje**:
  - `onSubmit` - wysłanie formularza (logowanie lub rejestracja)
  - Przekierowanie po pomyślnym uwierzytelnieniu

- **Obsługiwana walidacja**: Delegowana do `useAuthForm` i `AuthFormFields`

- **Typy**:
  - `AuthMode` - tryb formularza ('login' | 'register')
  - `AuthFormState` - stan formularza z hooka

- **Propsy**:
  ```typescript
  interface AuthFormProps {
    mode: AuthMode;
  }
  ```

### AuthFormFields

- **Opis komponentu**: Prezentacyjny komponent zawierający pola formularza. W trybie logowania wyświetla email i hasło. W trybie rejestracji dodatkowo pole potwierdzenia hasła.

- **Główne elementy**:
  - `<div>` kontener z `space-y-4`
  - `<div>` dla pola email z `<label>` i `<Input>`
  - `<div>` dla pola hasła z `<label>` i `<PasswordInput>`
  - `<div>` dla potwierdzenia hasła (tylko register) z `<label>` i `<PasswordInput>`
  - Komunikaty błędów walidacji pod polami

- **Obsługiwane interakcje**:
  - `onChange` - zmiana wartości pól (delegowana do rodzica)
  - `onBlur` - oznaczenie pola jako "touched" dla walidacji

- **Obsługiwana walidacja**:
  - Email: wymagany, poprawny format email
  - Hasło: wymagane, minimum 8 znaków
  - Potwierdzenie hasła (register): wymagane, musi być identyczne z hasłem

- **Typy**:
  - `AuthFormData`
  - `AuthFormValidationErrors`
  - `AuthFormTouched`

- **Propsy**:
  ```typescript
  interface AuthFormFieldsProps {
    mode: AuthMode;
    formData: AuthFormData;
    errors: AuthFormValidationErrors;
    touched: AuthFormTouched;
    isSubmitting: boolean;
    onFieldChange: (field: keyof AuthFormData, value: string) => void;
    onFieldBlur: (field: keyof AuthFormData) => void;
  }
  ```

### AuthError

- **Opis komponentu**: Komponent wyświetlający komunikat błędu autentykacji zwrócony z Supabase Auth. Używa komponentu `Alert` z wariantem `destructive`.

- **Główne elementy**:
  - `Alert` z wariantem `destructive`
  - `AlertCircle` ikona
  - `AlertTitle` z "Błąd"
  - `AlertDescription` z treścią błędu

- **Obsługiwane interakcje**: Brak (komponent prezentacyjny)

- **Obsługiwana walidacja**: Brak

- **Typy**: Brak dodatkowych

- **Propsy**:
  ```typescript
  interface AuthErrorProps {
    message: string;
  }
  ```

### AuthLinks

- **Opis komponentu**: Komponent z linkami pomocniczymi. W trybie logowania: link do rejestracji i link do resetowania hasła. W trybie rejestracji: link do logowania.

- **Główne elementy**:
  - `<div>` kontener z `flex flex-col items-center gap-2`
  - `<a>` link do przełączania trybu (login ↔ register)
  - `<a>` link do resetowania hasła (tylko w trybie login)

- **Obsługiwane interakcje**:
  - Kliknięcie w linki - nawigacja standardowa (pełne przeładowanie strony)

- **Obsługiwana walidacja**: Brak

- **Typy**:
  - `AuthMode`

- **Propsy**:
  ```typescript
  interface AuthLinksProps {
    mode: AuthMode;
  }
  ```

### PasswordInput

- **Opis komponentu**: Rozszerzony komponent Input dla hasła z przyciskiem toggle widoczności hasła (ikona oka).

- **Główne elementy**:
  - `<div>` kontener z `relative`
  - `<Input>` z dynamicznym `type` (password/text)
  - `<Button>` typu `ghost` z ikoną `Eye` lub `EyeOff`

- **Obsługiwane interakcje**:
  - `onChange` - zmiana wartości (delegowana do rodzica)
  - `onBlur` - blur event (delegowany do rodzica)
  - Kliknięcie przycisku toggle - zmiana widoczności hasła

- **Obsługiwana walidacja**: Delegowana do rodzica

- **Typy**: Brak dodatkowych

- **Propsy**:
  ```typescript
  interface PasswordInputProps extends Omit<React.ComponentProps<"input">, "type"> {
    // Wszystkie propsy Input poza "type"
  }
  ```

### Input (shadcn/ui)

- **Opis komponentu**: Standardowy komponent Input z biblioteki shadcn/ui. Należy dodać do projektu poprzez CLI shadcn.

- **Główne elementy**:
  - `<input>` z odpowiednimi klasami Tailwind

- **Propsy**: Standardowe propsy HTML input z rozszerzeniami shadcn/ui

## 5. Typy

### Nowe typy w `src/components/auth/types.ts`

```typescript
/**
 * Tryb formularza autoryzacji
 */
export type AuthMode = "login" | "register";

/**
 * Dane formularza autoryzacji
 */
export interface AuthFormData {
  email: string;
  password: string;
  confirmPassword: string; // Używane tylko w trybie register
}

/**
 * Błędy walidacji formularza
 */
export interface AuthFormValidationErrors {
  email?: string;
  password?: string;
  confirmPassword?: string;
}

/**
 * Stan "touched" pól formularza
 */
export interface AuthFormTouched {
  email: boolean;
  password: boolean;
  confirmPassword: boolean;
}

/**
 * Stan formularza zwracany przez useAuthForm
 */
export interface AuthFormState {
  formData: AuthFormData;
  errors: AuthFormValidationErrors;
  touched: AuthFormTouched;
  isSubmitting: boolean;
  authError: string | null;
  isValid: boolean;
}

/**
 * Akcje formularza zwracane przez useAuthForm
 */
export interface AuthFormActions {
  setFieldValue: (field: keyof AuthFormData, value: string) => void;
  setFieldTouched: (field: keyof AuthFormData) => void;
  handleSubmit: (e: React.FormEvent) => Promise<void>;
  clearAuthError: () => void;
}

/**
 * Stałe walidacji
 */
export const AUTH_VALIDATION = {
  PASSWORD_MIN_LENGTH: 8,
  EMAIL_REGEX: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
} as const;

/**
 * Komunikaty błędów walidacji
 */
export const AUTH_ERROR_MESSAGES = {
  EMAIL_REQUIRED: "Adres email jest wymagany",
  EMAIL_INVALID: "Podaj poprawny adres email",
  PASSWORD_REQUIRED: "Hasło jest wymagane",
  PASSWORD_TOO_SHORT: `Hasło musi mieć minimum ${AUTH_VALIDATION.PASSWORD_MIN_LENGTH} znaków`,
  CONFIRM_PASSWORD_REQUIRED: "Potwierdzenie hasła jest wymagane",
  PASSWORDS_MISMATCH: "Hasła muszą być identyczne",
} as const;

/**
 * Mapowanie błędów Supabase na przyjazne komunikaty
 */
export const SUPABASE_ERROR_MESSAGES: Record<string, string> = {
  "Invalid login credentials": "Nieprawidłowy email lub hasło",
  "Email not confirmed": "Potwierdź swój adres email przed zalogowaniem",
  "User already registered": "Użytkownik z tym adresem email już istnieje",
  "Password should be at least 6 characters": "Hasło musi mieć minimum 6 znaków",
  "Unable to validate email address: invalid format": "Nieprawidłowy format adresu email",
  // Domyślny komunikat dla nieznanych błędów
  default: "Wystąpił błąd podczas autoryzacji. Spróbuj ponownie.",
};
```

## 6. Zarządzanie stanem

### Hook `useAuthForm`

Hook `useAuthForm` zarządza całym stanem formularza autoryzacji, walidacją oraz komunikacją z Supabase Auth.

```typescript
// src/components/auth/hooks/useAuthForm.ts

import { useState, useCallback, useMemo } from "react";
import { supabaseClient } from "@/db/supabase.client";
import type { 
  AuthMode, 
  AuthFormData, 
  AuthFormValidationErrors, 
  AuthFormTouched,
  AuthFormState,
  AuthFormActions 
} from "../types";
import { 
  AUTH_VALIDATION, 
  AUTH_ERROR_MESSAGES, 
  SUPABASE_ERROR_MESSAGES 
} from "../types";

export function useAuthForm(mode: AuthMode): AuthFormState & AuthFormActions {
  // Stan formularza
  const [formData, setFormData] = useState<AuthFormData>({
    email: "",
    password: "",
    confirmPassword: "",
  });

  const [touched, setTouched] = useState<AuthFormTouched>({
    email: false,
    password: false,
    confirmPassword: false,
  });

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [authError, setAuthError] = useState<string | null>(null);

  // Walidacja
  const errors = useMemo((): AuthFormValidationErrors => {
    const result: AuthFormValidationErrors = {};

    // Walidacja email
    if (!formData.email.trim()) {
      result.email = AUTH_ERROR_MESSAGES.EMAIL_REQUIRED;
    } else if (!AUTH_VALIDATION.EMAIL_REGEX.test(formData.email)) {
      result.email = AUTH_ERROR_MESSAGES.EMAIL_INVALID;
    }

    // Walidacja hasła
    if (!formData.password) {
      result.password = AUTH_ERROR_MESSAGES.PASSWORD_REQUIRED;
    } else if (formData.password.length < AUTH_VALIDATION.PASSWORD_MIN_LENGTH) {
      result.password = AUTH_ERROR_MESSAGES.PASSWORD_TOO_SHORT;
    }

    // Walidacja potwierdzenia hasła (tylko register)
    if (mode === "register") {
      if (!formData.confirmPassword) {
        result.confirmPassword = AUTH_ERROR_MESSAGES.CONFIRM_PASSWORD_REQUIRED;
      } else if (formData.password !== formData.confirmPassword) {
        result.confirmPassword = AUTH_ERROR_MESSAGES.PASSWORDS_MISMATCH;
      }
    }

    return result;
  }, [formData, mode]);

  const isValid = useMemo(() => Object.keys(errors).length === 0, [errors]);

  // Akcje
  const setFieldValue = useCallback((field: keyof AuthFormData, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    // Wyczyść błąd auth przy edycji
    setAuthError(null);
  }, []);

  const setFieldTouched = useCallback((field: keyof AuthFormData) => {
    setTouched(prev => ({ ...prev, [field]: true }));
  }, []);

  const clearAuthError = useCallback(() => {
    setAuthError(null);
  }, []);

  // Mapowanie błędów Supabase
  const mapSupabaseError = useCallback((error: Error): string => {
    const message = error.message;
    return SUPABASE_ERROR_MESSAGES[message] || SUPABASE_ERROR_MESSAGES.default;
  }, []);

  // Submit
  const handleSubmit = useCallback(async (e: React.FormEvent) => {
    e.preventDefault();

    // Oznacz wszystkie pola jako touched
    setTouched({ email: true, password: true, confirmPassword: true });

    if (!isValid) return;

    setIsSubmitting(true);
    setAuthError(null);

    try {
      if (mode === "login") {
        const { error } = await supabaseClient.auth.signInWithPassword({
          email: formData.email,
          password: formData.password,
        });

        if (error) throw error;
      } else {
        const { error } = await supabaseClient.auth.signUp({
          email: formData.email,
          password: formData.password,
        });

        if (error) throw error;
      }

      // Przekierowanie po sukcesie
      window.location.href = "/generate";
    } catch (error) {
      const message = error instanceof Error 
        ? mapSupabaseError(error) 
        : SUPABASE_ERROR_MESSAGES.default;
      setAuthError(message);
    } finally {
      setIsSubmitting(false);
    }
  }, [formData, mode, isValid, mapSupabaseError]);

  return {
    // Stan
    formData,
    errors,
    touched,
    isSubmitting,
    authError,
    isValid,
    // Akcje
    setFieldValue,
    setFieldTouched,
    handleSubmit,
    clearAuthError,
  };
}
```

### Przepływ danych

1. **Inicjalizacja**: Hook inicjalizuje pusty formularz
2. **Edycja pól**: `setFieldValue` aktualizuje `formData`, wyczyści `authError`
3. **Blur pól**: `setFieldTouched` oznacza pole jako dotknięte (pokazuje błąd walidacji)
4. **Submit**: 
   - Oznaczenie wszystkich pól jako touched
   - Sprawdzenie walidacji (`isValid`)
   - Wywołanie Supabase Auth (`signInWithPassword` lub `signUp`)
   - Przekierowanie do `/generate` przy sukcesie
   - Ustawienie `authError` przy błędzie

## 7. Integracja API

### Supabase Auth

Widok integruje się z Supabase Auth poprzez SDK (`@supabase/supabase-js`).

#### Logowanie

```typescript
const { data, error } = await supabaseClient.auth.signInWithPassword({
  email: string,
  password: string,
});
```

**Odpowiedź sukcesu**:
- `data.user` - obiekt użytkownika
- `data.session` - obiekt sesji z tokenem

**Możliwe błędy**:
- `Invalid login credentials` - nieprawidłowy email lub hasło
- `Email not confirmed` - email nie został potwierdzony

#### Rejestracja

```typescript
const { data, error } = await supabaseClient.auth.signUp({
  email: string,
  password: string,
});
```

**Odpowiedź sukcesu**:
- `data.user` - obiekt utworzonego użytkownika
- `data.session` - sesja (jeśli auto-confirm włączony)

**Możliwe błędy**:
- `User already registered` - użytkownik już istnieje
- `Password should be at least 6 characters` - hasło za krótkie

### Konfiguracja Supabase Client

Istniejący klient w `src/db/supabase.client.ts` będzie używany do autentykacji. Należy upewnić się, że sesja jest prawidłowo przechowywana (domyślnie w localStorage).

## 8. Interakcje użytkownika

### Formularz logowania

| Interakcja | Element | Rezultat |
|------------|---------|----------|
| Wpisanie email | Input email | Aktualizacja `formData.email`, reset `authError` |
| Wpisanie hasła | PasswordInput | Aktualizacja `formData.password`, reset `authError` |
| Blur na polu | Input/PasswordInput | Pole oznaczone jako `touched`, pokazanie błędu walidacji |
| Toggle widoczności hasła | Przycisk oko | Zmiana type input między `password` a `text` |
| Submit formularza | Przycisk "Zaloguj się" | Walidacja → Supabase signIn → przekierowanie lub błąd |
| Kliknięcie "Nie masz konta?" | Link | Nawigacja do `/auth/register` |
| Kliknięcie "Zapomniałeś hasła?" | Link | Nawigacja do `/auth/reset-password` (TODO: osobny widok) |

### Formularz rejestracji

| Interakcja | Element | Rezultat |
|------------|---------|----------|
| Wpisanie email | Input email | Aktualizacja `formData.email`, reset `authError` |
| Wpisanie hasła | PasswordInput | Aktualizacja `formData.password`, reset `authError` |
| Wpisanie potwierdzenia | PasswordInput | Aktualizacja `formData.confirmPassword`, reset `authError` |
| Blur na polu | Input/PasswordInput | Pole oznaczone jako `touched`, pokazanie błędu walidacji |
| Submit formularza | Przycisk "Zarejestruj się" | Walidacja → Supabase signUp → przekierowanie lub błąd |
| Kliknięcie "Masz już konto?" | Link | Nawigacja do `/auth/login` |

## 9. Warunki i walidacja

### Walidacja client-side

| Pole | Warunek | Komunikat błędu | Kiedy wyświetlany |
|------|---------|-----------------|-------------------|
| Email | Pole niepuste | "Adres email jest wymagany" | Po blur lub submit |
| Email | Format email | "Podaj poprawny adres email" | Po blur lub submit |
| Hasło | Pole niepuste | "Hasło jest wymagane" | Po blur lub submit |
| Hasło | Min. 8 znaków | "Hasło musi mieć minimum 8 znaków" | Po blur lub submit |
| Potw. hasła | Pole niepuste (register) | "Potwierdzenie hasła jest wymagane" | Po blur lub submit |
| Potw. hasła | Zgodność z hasłem | "Hasła muszą być identyczne" | Po blur lub submit |

### Walidacja server-side (Supabase)

| Sytuacja | Komunikat API | Wyświetlany komunikat |
|----------|---------------|----------------------|
| Nieprawidłowe dane logowania | `Invalid login credentials` | "Nieprawidłowy email lub hasło" |
| Email nie potwierdzony | `Email not confirmed` | "Potwierdź swój adres email przed zalogowaniem" |
| Użytkownik istnieje | `User already registered` | "Użytkownik z tym adresem email już istnieje" |
| Hasło za krótkie | `Password should be at least 6 characters` | "Hasło musi mieć minimum 6 znaków" |

### Wpływ walidacji na UI

- **Pole z błędem**: czerwona ramka (`border-destructive`), komunikat błędu pod polem
- **Przycisk submit**: `disabled` gdy `!isValid || isSubmitting`
- **Alert błędu auth**: wyświetlany nad formularzem gdy `authError !== null`

## 10. Obsługa błędów

### Błędy walidacji formularza

- Wyświetlane inline pod odpowiednim polem
- Czerwona ramka na polu (`aria-invalid="true"`)
- Tekst błędu z klasą `text-destructive`
- Powiązanie z polem przez `aria-describedby`

### Błędy autentykacji (Supabase)

- Wyświetlane w komponencie `AuthError` nad formularzem
- Używają komponentu `Alert` z wariantem `destructive`
- Mapowanie komunikatów Supabase na przyjazne komunikaty po polsku
- Automatycznie czyszczone przy kolejnej edycji pola

### Błędy sieciowe

- Timeout lub brak połączenia: "Wystąpił błąd podczas autoryzacji. Spróbuj ponownie."
- Obsługa przez catch w `handleSubmit`

### Scenariusze edge case

| Scenariusz | Obsługa |
|------------|---------|
| Podwójny submit | Przycisk `disabled` podczas `isSubmitting`, ignorowanie kolejnych submitów |
| Sesja wygasła (dla zalogowanego) | Middleware przekieruje na `/auth/login` |
| Odświeżenie strony podczas submita | Stan resetowany, użytkownik może spróbować ponownie |
| JavaScript wyłączony | Formularz nie zadziała - wymaga JS (React component) |

## 11. Kroki implementacji

### Krok 1: Dodanie komponentu Input do shadcn/ui

```bash
npx shadcn@latest add input
```

Lub ręczne utworzenie pliku `src/components/ui/input.tsx` zgodnie z dokumentacją shadcn/ui.

### Krok 2: Utworzenie typów autoryzacji

Utworzyć plik `src/components/auth/types.ts` z definicjami typów opisanymi w sekcji 5.

### Krok 3: Utworzenie hooka useAuthForm

Utworzyć plik `src/components/auth/hooks/useAuthForm.ts` z logiką zarządzania stanem formularza i integracją z Supabase Auth.

### Krok 4: Utworzenie komponentów prezentacyjnych

W kolejności:
1. `src/components/auth/AuthError.tsx` - komponent błędu
2. `src/components/auth/PasswordInput.tsx` - input hasła z toggle
3. `src/components/auth/AuthLinks.tsx` - linki pomocnicze
4. `src/components/auth/AuthFormFields.tsx` - pola formularza

### Krok 5: Utworzenie głównego komponentu AuthForm

Utworzyć plik `src/components/auth/AuthForm.tsx` łączący wszystkie komponenty z hookiem `useAuthForm`.

### Krok 6: Utworzenie eksportu

Utworzyć plik `src/components/auth/index.ts` eksportujący publiczne komponenty i hooki:

```typescript
export { AuthForm } from "./AuthForm";
export type { AuthMode } from "./types";
```

### Krok 7: Utworzenie layoutu AuthLayout

Utworzyć plik `src/layouts/AuthLayout.astro` - prosty layout dla stron autoryzacji bez nawigacji aplikacji.

### Krok 8: Utworzenie stron Astro

1. Utworzyć katalog `src/pages/auth/`
2. Utworzyć `src/pages/auth/login.astro`:

```astro
---
import AuthLayout from "@/layouts/AuthLayout.astro";
import { AuthForm } from "@/components/auth";

export const prerender = false;
---

<AuthLayout title="Logowanie | 10x Cards">
  <AuthForm client:load mode="login" />
</AuthLayout>
```

3. Utworzyć `src/pages/auth/register.astro`:

```astro
---
import AuthLayout from "@/layouts/AuthLayout.astro";
import { AuthForm } from "@/components/auth";

export const prerender = false;
---

<AuthLayout title="Rejestracja | 10x Cards">
  <AuthForm client:load mode="register" />
</AuthLayout>
```

### Krok 9: Aktualizacja middleware (opcjonalnie)

Rozszerzyć `src/middleware/index.ts` o logikę ochrony tras:
- Chronione trasy (`/generate`, `/flashcards`, etc.) - wymagają sesji
- Trasy auth (`/auth/*`) - przekierowanie na `/generate` jeśli zalogowany

### Krok 10: Aktualizacja istniejącego hooka useAuth

Zaktualizować `src/components/navigation/hooks/useAuth.ts` aby używał prawdziwej sesji Supabase zamiast mock data.

### Krok 11: Testowanie

1. Test rejestracji nowego użytkownika
2. Test logowania istniejącego użytkownika
3. Test walidacji formularza (puste pola, nieprawidłowy email, krótkie hasło, niezgodne hasła)
4. Test błędów autentykacji (nieprawidłowe dane, istniejący użytkownik)
5. Test przekierowań (po zalogowaniu, zalogowany użytkownik na `/auth/*`)
6. Test responsywności (mobile, tablet, desktop)
7. Test dostępności (nawigacja klawiaturą, screen reader)

### Krok 12: Dodanie strony resetowania hasła (opcjonalnie)

Utworzyć `/auth/reset-password` z formularzem do wysyłania linku resetującego hasło.
