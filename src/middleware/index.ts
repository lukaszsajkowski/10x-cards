import { defineMiddleware } from "astro:middleware";

import { createSupabaseServerInstance } from "../db/supabase.server";

/**
 * Ścieżki publiczne - dostępne bez logowania
 * Zalogowani użytkownicy są przekierowywani z tych stron do /generate
 */
const AUTH_PAGES = ["/auth/login", "/auth/register", "/auth/reset-password"];

/**
 * Publiczne endpointy API auth - dostępne bez logowania
 */
const PUBLIC_API_PATHS = ["/api/auth/login", "/api/auth/register", "/api/auth/logout"];

/**
 * Strona update-password jest specjalna - dostępna dla wszystkich
 * (token w URL hash, walidacja client-side)
 */
const UPDATE_PASSWORD_PAGE = "/auth/update-password";

/**
 * Ścieżki chronionych API - wymagają autentykacji
 * Zwracają 401 dla niezalogowanych
 */
const PROTECTED_API_PREFIXES = ["/api/flashcards", "/api/generations", "/api/generation-error-logs"];

/**
 * Ścieżki chronionych stron - wymagają autentykacji
 * Niezalogowani są przekierowywani do /auth/login
 */
const PROTECTED_PAGES = ["/generate", "/flashcards", "/generations", "/settings"];

/**
 * Sprawdza czy ścieżka pasuje do któregokolwiek z prefixów
 */
function matchesPrefix(pathname: string, prefixes: string[]): boolean {
  return prefixes.some((prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`));
}

export const onRequest = defineMiddleware(async ({ locals, cookies, url, request, redirect }, next) => {
  const { pathname } = url;

  // Twórz klienta Supabase SSR dla każdego requestu
  const supabase = createSupabaseServerInstance({
    cookies,
    headers: request.headers,
  });

  // Przypisz klienta do locals (dostępny w stronach i API)
  locals.supabase = supabase;

  // Pobierz aktualną sesję użytkownika
  // WAŻNE: getUser() weryfikuje token z Supabase Auth server
  const {
    data: { user },
  } = await supabase.auth.getUser();

  // Przypisz użytkownika do locals (lub null jeśli niezalogowany)
  if (user) {
    locals.user = {
      id: user.id,
      email: user.email ?? "",
    };
  } else {
    locals.user = null;
  }

  // --- Logika ochrony tras ---

  // 1. Publiczne API auth - dostępne dla wszystkich
  if (PUBLIC_API_PATHS.includes(pathname)) {
    return next();
  }

  // 2. Strona update-password - dostępna dla wszystkich (token w hash)
  if (pathname === UPDATE_PASSWORD_PAGE) {
    return next();
  }

  // 3. Strony auth (login, register, reset-password)
  // Zalogowani użytkownicy są przekierowywani do /generate
  if (AUTH_PAGES.includes(pathname)) {
    if (user) {
      return redirect("/generate");
    }
    return next();
  }

  // 4. Chronione API endpoints
  // Zwracamy 401 dla niezalogowanych
  if (matchesPrefix(pathname, PROTECTED_API_PREFIXES)) {
    if (!user) {
      return new Response(JSON.stringify({ message: "Unauthorized" }), {
        status: 401,
        headers: { "content-type": "application/json" },
      });
    }
    return next();
  }

  // 5. Chronione strony (generate, flashcards, generations, settings)
  // Niezalogowani są przekierowywani do /auth/login
  if (matchesPrefix(pathname, PROTECTED_PAGES)) {
    if (!user) {
      return redirect("/auth/login");
    }
    return next();
  }

  // 6. Strona główna - przekierowanie zależne od stanu sesji
  if (pathname === "/") {
    if (user) {
      return redirect("/generate");
    }
    return redirect("/auth/login");
  }

  // 7. Wszystkie inne ścieżki - kontynuuj normalnie
  return next();
});
