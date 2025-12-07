import { memo } from "react";
import { Sparkles } from "lucide-react";
import { UserMenu } from "./UserMenu";
import { ThemeToggle } from "./ThemeToggle";
import { useThemeContext } from "./ThemeContext";
import type { TopBarProps } from "./types";

/**
 * Górny pasek na urządzeniach mobilnych z logo i dostępem do menu użytkownika
 */
export const TopBar = memo(function TopBar({ userEmail, onLogout }: TopBarProps) {
  const { theme, toggleTheme } = useThemeContext();

  return (
    <header className="fixed inset-x-0 top-0 z-50 flex h-14 items-center justify-between border-b border-border bg-background px-4 md:hidden">
      {/* Logo */}
      <a
        href="/generate"
        className="flex items-center gap-2 font-semibold text-foreground hover:text-primary transition-colors"
      >
        <Sparkles className="h-5 w-5 text-primary" aria-hidden="true" />
        <span className="text-base">10x Cards</span>
      </a>

      {/* Akcje po prawej */}
      <div className="flex items-center gap-1">
        <ThemeToggle theme={theme} onToggle={toggleTheme} size="sm" />
        <UserMenu email={userEmail} onLogout={onLogout} />
      </div>
    </header>
  );
});
