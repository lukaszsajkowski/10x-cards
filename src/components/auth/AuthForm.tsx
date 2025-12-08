import { Loader2 } from "lucide-react";
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
  CardFooter,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { AuthError } from "./AuthError";
import { AuthFormFields } from "./AuthFormFields";
import { AuthLinks } from "./AuthLinks";
import { ResetPasswordSuccess } from "./ResetPasswordSuccess";
import { useAuthForm } from "./hooks";
import type { AuthMode } from "./types";

interface AuthFormProps {
  mode: AuthMode;
}

const FORM_CONFIG = {
  login: {
    title: "Zaloguj się",
    description: "Wprowadź swoje dane, aby uzyskać dostęp do konta",
    submitText: "Zaloguj się",
    loadingText: "Logowanie...",
  },
  register: {
    title: "Utwórz konto",
    description: "Wprowadź swoje dane, aby utworzyć nowe konto",
    submitText: "Zarejestruj się",
    loadingText: "Rejestracja...",
  },
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
} as const;

export function AuthForm({ mode }: AuthFormProps) {
  const {
    formData,
    errors,
    touched,
    isSubmitting,
    authError,
    isValid,
    successMessage,
    setFieldValue,
    setFieldTouched,
    handleSubmit,
  } = useAuthForm(mode);

  const config = FORM_CONFIG[mode];

  // Wyświetl komunikat sukcesu dla reset-password
  if (successMessage && mode === "reset-password") {
    return <ResetPasswordSuccess message={successMessage} />;
  }

  return (
    <Card className="w-full max-w-md">
      <CardHeader className="text-center">
        <CardTitle className="text-2xl">{config.title}</CardTitle>
        <CardDescription>{config.description}</CardDescription>
      </CardHeader>

      <form onSubmit={handleSubmit}>
        <CardContent className="space-y-4">
          {authError && <AuthError message={authError} />}

          <AuthFormFields
            mode={mode}
            formData={formData}
            errors={errors}
            touched={touched}
            isSubmitting={isSubmitting}
            onFieldChange={setFieldValue}
            onFieldBlur={setFieldTouched}
          />
        </CardContent>

        <CardFooter className="flex flex-col gap-4 pt-6">
          <Button
            type="submit"
            className="w-full"
            disabled={!isValid || isSubmitting}
          >
            {isSubmitting ? (
              <>
                <Loader2 className="size-4 animate-spin" />
                {config.loadingText}
              </>
            ) : (
              config.submitText
            )}
          </Button>

          <AuthLinks mode={mode} />
        </CardFooter>
      </form>
    </Card>
  );
}
