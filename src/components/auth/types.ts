/**
 * Tryb formularza autoryzacji
 */
export type AuthMode = "login" | "register" | "reset-password" | "update-password";

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
  "Email rate limit exceeded": "Zbyt wiele prób. Spróbuj ponownie później",
  "Invalid token": "Link resetowania hasła wygasł lub jest nieprawidłowy",
  "New password should be different from the old password": "Nowe hasło musi być inne niż poprzednie",
  // Domyślny komunikat dla nieznanych błędów
  default: "Wystąpił błąd podczas autoryzacji. Spróbuj ponownie.",
};

/**
 * Komunikaty sukcesu
 */
export const AUTH_SUCCESS_MESSAGES = {
  RESET_PASSWORD_EMAIL_SENT: "Link do resetowania hasła został wysłany na podany adres email",
  PASSWORD_UPDATED: "Hasło zostało zmienione. Możesz się teraz zalogować",
  REGISTRATION_EMAIL_SENT: "Sprawdź swoją skrzynkę email i potwierdź rejestrację",
} as const;
