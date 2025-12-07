import { useState, useCallback, useMemo } from "react";
import { supabaseClient } from "@/db/supabase.client";
import type {
  AuthMode,
  AuthFormData,
  AuthFormValidationErrors,
  AuthFormTouched,
  AuthFormState,
  AuthFormActions,
} from "../types";
import {
  AUTH_VALIDATION,
  AUTH_ERROR_MESSAGES,
  SUPABASE_ERROR_MESSAGES,
  AUTH_SUCCESS_MESSAGES,
} from "../types";

// Rozszerzony typ stanu o successMessage
interface ExtendedAuthFormState extends AuthFormState {
  successMessage: string | null;
}

export function useAuthForm(mode: AuthMode): ExtendedAuthFormState & AuthFormActions {
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
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // Walidacja zależna od trybu
  const errors = useMemo((): AuthFormValidationErrors => {
    const result: AuthFormValidationErrors = {};

    // Walidacja email (dla login, register, reset-password)
    const requiresEmail = mode === "login" || mode === "register" || mode === "reset-password";
    if (requiresEmail) {
      if (!formData.email.trim()) {
        result.email = AUTH_ERROR_MESSAGES.EMAIL_REQUIRED;
      } else if (!AUTH_VALIDATION.EMAIL_REGEX.test(formData.email)) {
        result.email = AUTH_ERROR_MESSAGES.EMAIL_INVALID;
      }
    }

    // Walidacja hasła (dla login, register, update-password)
    const requiresPassword = mode === "login" || mode === "register" || mode === "update-password";
    if (requiresPassword) {
      if (!formData.password) {
        result.password = AUTH_ERROR_MESSAGES.PASSWORD_REQUIRED;
      } else if (formData.password.length < AUTH_VALIDATION.PASSWORD_MIN_LENGTH) {
        result.password = AUTH_ERROR_MESSAGES.PASSWORD_TOO_SHORT;
      }
    }

    // Walidacja potwierdzenia hasła (dla register i update-password)
    const requiresConfirmPassword = mode === "register" || mode === "update-password";
    if (requiresConfirmPassword) {
      if (!formData.confirmPassword) {
        result.confirmPassword = AUTH_ERROR_MESSAGES.CONFIRM_PASSWORD_REQUIRED;
      } else if (formData.password !== formData.confirmPassword) {
        result.confirmPassword = AUTH_ERROR_MESSAGES.PASSWORDS_MISMATCH;
      }
    }

    return result;
  }, [formData, mode]);

  const isValid = useMemo(() => Object.keys(errors).length === 0, [errors]);

  // Mapowanie błędów Supabase
  const mapSupabaseError = useCallback((error: Error): string => {
    const message = error.message;
    return SUPABASE_ERROR_MESSAGES[message] || SUPABASE_ERROR_MESSAGES.default;
  }, []);

  // Akcje
  const setFieldValue = useCallback(
    (field: keyof AuthFormData, value: string) => {
      setFormData((prev) => ({ ...prev, [field]: value }));
      // Wyczyść błąd auth przy edycji
      setAuthError(null);
      setSuccessMessage(null);
    },
    []
  );

  const setFieldTouched = useCallback((field: keyof AuthFormData) => {
    setTouched((prev) => ({ ...prev, [field]: true }));
  }, []);

  const clearAuthError = useCallback(() => {
    setAuthError(null);
  }, []);

  // Submit
  const handleSubmit = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault();

      // Oznacz odpowiednie pola jako touched w zależności od trybu
      const touchedFields: AuthFormTouched = {
        email: mode !== "update-password",
        password: mode !== "reset-password",
        confirmPassword: mode === "register" || mode === "update-password",
      };
      setTouched(touchedFields);

      if (!isValid) return;

      setIsSubmitting(true);
      setAuthError(null);
      setSuccessMessage(null);

      try {
        if (mode === "login") {
          const { error } = await supabaseClient.auth.signInWithPassword({
            email: formData.email,
            password: formData.password,
          });

          if (error) throw error;

          // Przekierowanie po sukcesie logowania
          window.location.href = "/generate";
        } else if (mode === "register") {
          const { error } = await supabaseClient.auth.signUp({
            email: formData.email,
            password: formData.password,
          });

          if (error) throw error;

          // Przekierowanie po sukcesie rejestracji
          window.location.href = "/generate";
        } else if (mode === "reset-password") {
          const { error } = await supabaseClient.auth.resetPasswordForEmail(
            formData.email,
            {
              redirectTo: `${window.location.origin}/auth/update-password`,
            }
          );

          if (error) throw error;

          // Wyświetl komunikat sukcesu
          setSuccessMessage(AUTH_SUCCESS_MESSAGES.RESET_PASSWORD_EMAIL_SENT);
        } else if (mode === "update-password") {
          const { error } = await supabaseClient.auth.updateUser({
            password: formData.password,
          });

          if (error) throw error;

          // Przekierowanie do logowania po zmianie hasła
          window.location.href = "/auth/login?message=password-updated";
        }
      } catch (error) {
        const message =
          error instanceof Error
            ? mapSupabaseError(error)
            : SUPABASE_ERROR_MESSAGES.default;
        setAuthError(message);
      } finally {
        setIsSubmitting(false);
      }
    },
    [formData, mode, isValid, mapSupabaseError]
  );

  return {
    // Stan
    formData,
    errors,
    touched,
    isSubmitting,
    authError,
    isValid,
    successMessage,
    // Akcje
    setFieldValue,
    setFieldTouched,
    handleSubmit,
    clearAuthError,
  };
}
