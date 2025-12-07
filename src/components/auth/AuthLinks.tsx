import type { AuthMode } from "./types";

interface AuthLinksProps {
  mode: AuthMode;
}

export function AuthLinks({ mode }: AuthLinksProps) {
  // update-password nie ma żadnych linków
  if (mode === "update-password") {
    return null;
  }

  return (
    <div className="flex flex-col items-center gap-2 text-sm">
      {mode === "login" && (
        <>
          <a
            href="/auth/register"
            className="text-muted-foreground hover:text-primary underline-offset-4 hover:underline"
          >
            Nie masz konta? Zarejestruj się
          </a>
          <a
            href="/auth/reset-password"
            className="text-muted-foreground hover:text-primary underline-offset-4 hover:underline"
          >
            Zapomniałeś hasła?
          </a>
        </>
      )}

      {mode === "register" && (
        <a
          href="/auth/login"
          className="text-muted-foreground hover:text-primary underline-offset-4 hover:underline"
        >
          Masz już konto? Zaloguj się
        </a>
      )}

      {mode === "reset-password" && (
        <a
          href="/auth/login"
          className="text-muted-foreground hover:text-primary underline-offset-4 hover:underline"
        >
          Wróć do logowania
        </a>
      )}
    </div>
  );
}
