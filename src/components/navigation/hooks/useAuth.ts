import { useState, useCallback, useEffect } from "react";
import { supabaseClient } from "@/db/supabase.client";
import type { User } from "@supabase/supabase-js";

interface UseAuthReturn {
  /** Zalogowany użytkownik (client-side state) */
  user: User | null;
  /** Czy trwa ładowanie sesji */
  isLoading: boolean;
  /** Funkcja wylogowania */
  logout: () => Promise<void>;
}

/**
 * Hook do zarządzania sesją użytkownika po stronie klienta.
 *
 * UWAGA: Email użytkownika jest przekazywany z serwera (SSR) przez props.
 * Ten hook służy głównie do:
 * - Wylogowania użytkownika
 * - Nasłuchiwania zmian stanu auth (np. wygaśnięcie sesji)
 */
export function useAuth(): UseAuthReturn {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Inicjalizacja - pobierz aktualną sesję i nasłuchuj zmian
  useEffect(() => {
    // Pobierz początkową sesję
    const initializeAuth = async () => {
      try {
        const {
          data: { session },
        } = await supabaseClient.auth.getSession();
        setUser(session?.user ?? null);
      } catch (error) {
        console.error("Failed to get auth session:", error);
        setUser(null);
      } finally {
        setIsLoading(false);
      }
    };

    initializeAuth();

    // Nasłuchuj zmian stanu autentykacji
    const {
      data: { subscription },
    } = supabaseClient.auth.onAuthStateChange((event, session) => {
      setUser(session?.user ?? null);

      // Jeśli użytkownik został wylogowany (np. sesja wygasła),
      // przekieruj do strony logowania
      if (event === "SIGNED_OUT") {
        window.location.href = "/auth/login";
      }
    });

    // Cleanup subskrypcji przy unmount
    return () => {
      subscription.unsubscribe();
    };
  }, []);

  const logout = useCallback(async () => {
    try {
      // Używamy API endpoint aby wyczyścić cookies sesji
      const response = await fetch("/api/auth/logout", {
        method: "POST",
        headers: { "content-type": "application/json" },
      });

      if (!response.ok) {
        console.error("Logout error:", await response.text());
      }

      // Przekierowanie do strony logowania
      window.location.href = "/auth/login";
    } catch (error) {
      console.error("Logout failed:", error);
      // Mimo błędu, przekieruj do logowania
      window.location.href = "/auth/login";
    }
  }, []);

  return {
    user,
    isLoading,
    logout,
  };
}
