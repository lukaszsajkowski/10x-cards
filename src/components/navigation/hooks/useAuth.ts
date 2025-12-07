import { useState, useCallback } from "react";

interface User {
  email: string;
}

interface UseAuthReturn {
  /** Zalogowany użytkownik */
  user: User | null;
  /** Czy trwa ładowanie sesji */
  isLoading: boolean;
  /** Funkcja wylogowania */
  logout: () => Promise<void>;
}

/**
 * Hook do zarządzania sesją użytkownika
 * 
 * UWAGA: W MVP bez pełnej autoryzacji, hook zwraca mock data.
 * W przyszłości zostanie zintegrowany z Supabase Auth.
 * 
 * TODO: Zintegrować z Supabase Auth po implementacji US-009
 */
export function useAuth(): UseAuthReturn {
  // Mock user dla MVP - w przyszłości zostanie zastąpione prawdziwą sesją
  const [user] = useState<User | null>({
    email: "user@example.com",
  });
  const [isLoading] = useState(false);

  const logout = useCallback(async () => {
    // TODO: Zintegrować z Supabase Auth
    // const { error } = await supabaseClient.auth.signOut()
    // if (error) {
    //   console.error("Logout error:", error)
    //   throw new Error("Nie udało się wylogować")
    // }
    
    // Przekierowanie do strony logowania
    window.location.href = "/";
  }, []);

  return {
    user,
    isLoading,
    logout,
  };
}
