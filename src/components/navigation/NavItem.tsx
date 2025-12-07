import { memo } from "react";
import { cn } from "@/lib/utils";
import type { NavItemProps } from "./types";

/**
 * Pojedynczy element nawigacji z ikoną i etykietą
 * Obsługuje stan aktywny i warianty wyświetlania (sidebar/bottom-nav)
 */
export const NavItem = memo(function NavItem({
  href,
  icon: Icon,
  label,
  isActive,
  showLabel = true,
  variant = "sidebar",
}: NavItemProps) {
  const isSidebar = variant === "sidebar";
  const isBottomNav = variant === "bottom-nav";

  return (
    <li>
      <a
        href={href}
        aria-current={isActive ? "page" : undefined}
        className={cn(
          "flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors",
          "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
          // Wariant sidebar (desktop)
          isSidebar && [
            "w-full",
            isActive
              ? "bg-sidebar-accent text-sidebar-accent-foreground"
              : "text-sidebar-foreground hover:bg-sidebar-accent/50 hover:text-sidebar-accent-foreground",
          ],
          // Wariant bottom-nav (mobile)
          isBottomNav && [
            "flex-col items-center justify-center gap-1 px-2 py-1.5 min-w-[64px]",
            isActive
              ? "text-primary"
              : "text-muted-foreground hover:text-foreground",
          ]
        )}
      >
        <Icon
          className={cn(
            "shrink-0",
            isSidebar && "h-5 w-5",
            isBottomNav && "h-5 w-5"
          )}
          aria-hidden="true"
        />
        {showLabel && (
          <span
            className={cn(
              isBottomNav && "text-xs",
              isSidebar && "truncate"
            )}
          >
            {label}
          </span>
        )}
      </a>
    </li>
  );
});
