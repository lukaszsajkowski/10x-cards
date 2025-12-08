import type { AstroCookies } from "astro";
import { createServerClient, type CookieOptionsWithName } from "@supabase/ssr";

import type { Database } from "./database.types";

/**
 * Opcje cookies dla Supabase Auth
 * - httpOnly: chroni przed XSS
 * - secure: wymusza HTTPS w produkcji
 * - sameSite: chroni przed CSRF
 */
export const cookieOptions: CookieOptionsWithName = {
  path: "/",
  secure: import.meta.env.PROD,
  httpOnly: true,
  sameSite: "lax",
};

/**
 * Parsuje nagłówek Cookie na tablicę obiektów { name, value }
 */
function parseCookieHeader(cookieHeader: string): { name: string; value: string }[] {
  return cookieHeader.split(";").map((cookie) => {
    const [name, ...rest] = cookie.trim().split("=");
    return { name, value: rest.join("=") };
  });
}

/**
 * Tworzy instancję klienta Supabase dla SSR z obsługą cookies.
 *
 * Używany w middleware i API endpoints do:
 * - Weryfikacji sesji użytkownika
 * - Automatycznego odświeżania tokenów
 * - Bezpiecznego zarządzania cookies
 *
 * WAŻNE: Używaj TYLKO getAll/setAll dla cookies (zgodnie z @supabase/ssr)
 */
export function createSupabaseServerInstance(context: { headers: Headers; cookies: AstroCookies }) {
  const supabase = createServerClient<Database>(
    import.meta.env.PUBLIC_SUPABASE_URL,
    import.meta.env.PUBLIC_SUPABASE_KEY,
    {
      cookieOptions,
      cookies: {
        getAll() {
          return parseCookieHeader(context.headers.get("Cookie") ?? "");
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value, options }) => context.cookies.set(name, value, options));
        },
      },
    }
  );

  return supabase;
}

export type SupabaseServerClient = ReturnType<typeof createSupabaseServerInstance>;
