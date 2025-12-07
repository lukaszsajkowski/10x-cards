import { useCallback } from "react";
import { Sidebar } from "./Sidebar";
import { TopBar } from "./TopBar";
import { BottomNav } from "./BottomNav";
import { ThemeProvider } from "./ThemeContext";
import { useAuth } from "./hooks/useAuth";
import type { NavigationShellProps } from "./types";

/**
 * Wewnętrzna zawartość NavigationShell
 * Oddzielona, aby mieć dostęp do ThemeContext
 */
function NavigationShellContent({
  children,
  currentPath,
  userEmail,
}: NavigationShellProps) {
  const { logout } = useAuth();

  const handleLogout = useCallback(async () => {
    await logout();
  }, [logout]);

  return (
    <div className="min-h-screen bg-background">
      {/* Desktop: Sidebar */}
      <Sidebar
        currentPath={currentPath}
        userEmail={userEmail}
        onLogout={handleLogout}
      />

      {/* Mobile: TopBar */}
      <TopBar userEmail={userEmail} onLogout={handleLogout} />

      {/* Mobile: BottomNav */}
      <BottomNav currentPath={currentPath} />

      {/* Main content area */}
      <main
        className="
          min-h-screen
          pt-14 pb-16
          md:pt-0 md:pb-0 md:pl-64
        "
      >
        {children}
      </main>
    </div>
  );
}

/**
 * Główny komponent React zarządzający responsywną nawigacją
 * Wykrywa rozmiar ekranu i renderuje odpowiedni wariant layoutu:
 * - Desktop (>= 768px): Sidebar po lewej stronie
 * - Mobile (< 768px): TopBar na górze + BottomNav na dole
 */
export function NavigationShell({
  children,
  currentPath,
  userEmail,
}: NavigationShellProps) {
  return (
    <ThemeProvider>
      <NavigationShellContent
        currentPath={currentPath}
        userEmail={userEmail}
      >
        {children}
      </NavigationShellContent>
    </ThemeProvider>
  );
}
