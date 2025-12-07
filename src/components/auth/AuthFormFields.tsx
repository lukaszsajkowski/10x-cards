import { useId, useCallback } from "react";
import { Input } from "@/components/ui/input";
import { PasswordInput } from "./PasswordInput";
import type {
  AuthMode,
  AuthFormData,
  AuthFormValidationErrors,
  AuthFormTouched,
} from "./types";

interface AuthFormFieldsProps {
  mode: AuthMode;
  formData: AuthFormData;
  errors: AuthFormValidationErrors;
  touched: AuthFormTouched;
  isSubmitting: boolean;
  onFieldChange: (field: keyof AuthFormData, value: string) => void;
  onFieldBlur: (field: keyof AuthFormData) => void;
}

// Określenie, które pola wyświetlić w zależności od trybu
const FIELD_CONFIG = {
  login: { showEmail: true, showPassword: true, showConfirmPassword: false },
  register: { showEmail: true, showPassword: true, showConfirmPassword: true },
  "reset-password": { showEmail: true, showPassword: false, showConfirmPassword: false },
  "update-password": { showEmail: false, showPassword: true, showConfirmPassword: true },
} as const;

export function AuthFormFields({
  mode,
  formData,
  errors,
  touched,
  isSubmitting,
  onFieldChange,
  onFieldBlur,
}: AuthFormFieldsProps) {
  const emailId = useId();
  const passwordId = useId();
  const confirmPasswordId = useId();
  const emailErrorId = useId();
  const passwordErrorId = useId();
  const confirmPasswordErrorId = useId();

  const handleEmailChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      onFieldChange("email", e.target.value);
    },
    [onFieldChange]
  );

  const handlePasswordChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      onFieldChange("password", e.target.value);
    },
    [onFieldChange]
  );

  const handleConfirmPasswordChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      onFieldChange("confirmPassword", e.target.value);
    },
    [onFieldChange]
  );

  const handleEmailBlur = useCallback(() => {
    onFieldBlur("email");
  }, [onFieldBlur]);

  const handlePasswordBlur = useCallback(() => {
    onFieldBlur("password");
  }, [onFieldBlur]);

  const handleConfirmPasswordBlur = useCallback(() => {
    onFieldBlur("confirmPassword");
  }, [onFieldBlur]);

  const showEmailError = touched.email && errors.email;
  const showPasswordError = touched.password && errors.password;
  const showConfirmPasswordError =
    touched.confirmPassword && errors.confirmPassword;

  const fieldConfig = FIELD_CONFIG[mode];

  // Określenie autocomplete dla pola hasła
  const getPasswordAutoComplete = () => {
    if (mode === "login") return "current-password";
    return "new-password";
  };

  // Etykieta pola hasła dla update-password
  const getPasswordLabel = () => {
    if (mode === "update-password") return "Nowe hasło";
    return "Hasło";
  };

  return (
    <div className="space-y-4">
      {/* Email field */}
      {fieldConfig.showEmail && (
        <div className="space-y-2">
          <label
            htmlFor={emailId}
            className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
          >
            Email
          </label>
          <Input
            id={emailId}
            type="email"
            placeholder="email@przykład.pl"
            value={formData.email}
            onChange={handleEmailChange}
            onBlur={handleEmailBlur}
            disabled={isSubmitting}
            autoComplete="email"
            aria-invalid={showEmailError ? "true" : undefined}
            aria-describedby={showEmailError ? emailErrorId : undefined}
          />
          {showEmailError && (
            <p id={emailErrorId} className="text-sm text-destructive">
              {errors.email}
            </p>
          )}
        </div>
      )}

      {/* Password field */}
      {fieldConfig.showPassword && (
        <div className="space-y-2">
          <label
            htmlFor={passwordId}
            className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
          >
            {getPasswordLabel()}
          </label>
          <PasswordInput
            id={passwordId}
            placeholder="••••••••"
            value={formData.password}
            onChange={handlePasswordChange}
            onBlur={handlePasswordBlur}
            disabled={isSubmitting}
            autoComplete={getPasswordAutoComplete()}
            aria-invalid={showPasswordError ? "true" : undefined}
            aria-describedby={showPasswordError ? passwordErrorId : undefined}
          />
          {showPasswordError && (
            <p id={passwordErrorId} className="text-sm text-destructive">
              {errors.password}
            </p>
          )}
        </div>
      )}

      {/* Confirm password field (register and update-password) */}
      {fieldConfig.showConfirmPassword && (
        <div className="space-y-2">
          <label
            htmlFor={confirmPasswordId}
            className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
          >
            Potwierdź hasło
          </label>
          <PasswordInput
            id={confirmPasswordId}
            placeholder="••••••••"
            value={formData.confirmPassword}
            onChange={handleConfirmPasswordChange}
            onBlur={handleConfirmPasswordBlur}
            disabled={isSubmitting}
            autoComplete="new-password"
            aria-invalid={showConfirmPasswordError ? "true" : undefined}
            aria-describedby={
              showConfirmPasswordError ? confirmPasswordErrorId : undefined
            }
          />
          {showConfirmPasswordError && (
            <p id={confirmPasswordErrorId} className="text-sm text-destructive">
              {errors.confirmPassword}
            </p>
          )}
        </div>
      )}
    </div>
  );
}
