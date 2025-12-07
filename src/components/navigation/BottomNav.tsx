import { memo } from "react";
import { NavItem } from "./NavItem";
import { MAIN_NAV_ITEMS } from "./constants";
import type { BottomNavProps } from "./types";

/**
 * Dolny pasek nawigacyjny na urządzeniach mobilnych z głównymi linkami do widoków
 */
export const BottomNav = memo(function BottomNav({ currentPath }: BottomNavProps) {
  return (
    <nav
      className="fixed inset-x-0 bottom-0 z-50 border-t border-border bg-background md:hidden"
      aria-label="Nawigacja mobilna"
    >
      <ul className="flex items-center justify-around py-1">
        {MAIN_NAV_ITEMS.map((item) => (
          <NavItem
            key={item.href}
            href={item.href}
            icon={item.icon}
            label={item.label}
            isActive={currentPath.startsWith(item.href)}
            variant="bottom-nav"
          />
        ))}
      </ul>
    </nav>
  );
});
