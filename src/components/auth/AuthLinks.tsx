import type { AuthMode } from "./types";

interface AuthLinksProps {
  mode: AuthMode;
}

export function AuthLinks({ mode }: AuthLinksProps) {
  return (
    <div className="flex flex-col items-center gap-2 text-sm">
      {mode === "login" ? (
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
      ) : (
        <a
          href="/auth/login"
          className="text-muted-foreground hover:text-primary underline-offset-4 hover:underline"
        >
          Masz już konto? Zaloguj się
        </a>
      )}
    </div>
  );
}
