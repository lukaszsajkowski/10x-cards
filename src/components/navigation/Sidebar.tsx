import { memo } from "react";
import { Sparkles } from "lucide-react";
import { NavItem } from "./NavItem";
import { UserMenu } from "./UserMenu";
import { ThemeToggle } from "./ThemeToggle";
import { MAIN_NAV_ITEMS } from "./constants";
import { useThemeContext } from "./ThemeContext";
import type { SidebarProps } from "./types";

/**
 * Nagłówek sidebara z logo i nazwą aplikacji
 */
function SidebarHeader() {
  return (
    <div className="flex h-14 items-center border-b border-sidebar-border px-4">
      <a
        href="/generate"
        className="flex items-center gap-2 font-semibold text-sidebar-foreground hover:text-sidebar-accent-foreground transition-colors"
      >
        <Sparkles className="h-6 w-6 text-primary" aria-hidden="true" />
        <span className="text-lg">10x Cards</span>
      </a>
    </div>
  );
}

/**
 * Główna nawigacja sidebara
 */
function SidebarNav({ currentPath }: { currentPath: string }) {
  return (
    <nav className="flex-1 px-3 py-4" aria-label="Nawigacja główna">
      <ul className="flex flex-col gap-1">
        {MAIN_NAV_ITEMS.map((item) => (
          <NavItem
            key={item.href}
            href={item.href}
            icon={item.icon}
            label={item.label}
            isActive={currentPath.startsWith(item.href)}
            variant="sidebar"
          />
        ))}
      </ul>
    </nav>
  );
}

/**
 * Stopka sidebara z menu użytkownika i przełącznikiem motywu
 */
function SidebarFooter({
  userEmail,
  onLogout,
}: {
  userEmail?: string;
  onLogout: () => void;
}) {
  const { theme, toggleTheme } = useThemeContext();

  return (
    <div className="border-t border-sidebar-border p-3">
      <div className="flex items-center justify-between gap-2">
        <div className="flex-1 min-w-0">
          <UserMenu email={userEmail} onLogout={onLogout} />
        </div>
        <ThemeToggle theme={theme} onToggle={toggleTheme} size="sm" />
      </div>
    </div>
  );
}

/**
 * Pionowy pasek boczny nawigacji widoczny na urządzeniach desktop (>= 768px)
 * Zawiera logo, główne linki nawigacyjne oraz sekcję użytkownika z przełącznikiem motywu
 */
export const Sidebar = memo(function Sidebar({
  currentPath,
  userEmail,
  onLogout,
}: SidebarProps) {
  return (
    <aside className="fixed inset-y-0 left-0 z-50 hidden w-64 flex-col border-r border-sidebar-border bg-sidebar md:flex">
      <SidebarHeader />
      <SidebarNav currentPath={currentPath} />
      <SidebarFooter userEmail={userEmail} onLogout={onLogout} />
    </aside>
  );
});
