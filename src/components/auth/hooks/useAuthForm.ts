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
    // Akcje
    setFieldValue,
    setFieldTouched,
    handleSubmit,
    clearAuthError,
  };
}
