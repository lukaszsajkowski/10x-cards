import { memo, useCallback } from "react";
import { User, Settings, LogOut } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import type { UserMenuProps } from "./types";

/**
 * Skraca email do wyświetlenia - pokazuje początek + domenę
 */
function truncateEmail(email: string, maxLength: number = 20): string {
  if (email.length <= maxLength) {
    return email;
  }
  
  const [localPart, domain] = email.split("@");
  if (!domain) {
    return email.slice(0, maxLength - 3) + "...";
  }
  
  const availableForLocal = maxLength - domain.length - 4; // -4 for "...@"
  if (availableForLocal < 3) {
    return email.slice(0, maxLength - 3) + "...";
  }
  
  return `${localPart.slice(0, availableForLocal)}...@${domain}`;
}

/**
 * Pobiera inicjały z emaila (pierwsze 2 znaki przed @)
 */
function getInitials(email: string): string {
  const localPart = email.split("@")[0] || "";
  return localPart.slice(0, 2).toUpperCase();
}

/**
 * Rozwijane menu użytkownika z avatarem/emailem, linkiem do ustawień i przyciskiem wylogowania
 */
export const UserMenu = memo(function UserMenu({
  email,
  onLogout,
  isOpen,
  onOpenChange,
}: UserMenuProps) {
  const displayEmail = email || "Użytkownik";
  const initials = email ? getInitials(email) : "U";

  const handleLogout = useCallback(() => {
    onLogout();
  }, [onLogout]);

  return (
    <DropdownMenu open={isOpen} onOpenChange={onOpenChange}>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          className="flex items-center gap-2 w-full justify-start px-2 py-1.5 h-auto"
          aria-label="Menu użytkownika"
        >
          {/* Avatar z inicjałami */}
          <div
            className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary text-primary-foreground text-xs font-medium"
            aria-hidden="true"
          >
            {initials}
          </div>
          {/* Email (widoczny na większych ekranach) */}
          <span className="truncate text-sm text-sidebar-foreground hidden sm:inline">
            {truncateEmail(displayEmail)}
          </span>
        </Button>
      </DropdownMenuTrigger>
      
      <DropdownMenuContent align="end" className="w-56">
        <DropdownMenuLabel className="font-normal">
          <div className="flex flex-col space-y-1">
            <p className="text-sm font-medium leading-none">Konto</p>
            <p className="text-xs leading-none text-muted-foreground truncate">
              {displayEmail}
            </p>
          </div>
        </DropdownMenuLabel>
        
        <DropdownMenuSeparator />
        
        <DropdownMenuItem asChild>
          <a href="/settings" className="flex items-center cursor-pointer">
            <Settings className="mr-2 h-4 w-4" />
            <span>Ustawienia</span>
          </a>
        </DropdownMenuItem>
        
        <DropdownMenuSeparator />
        
        <DropdownMenuItem
          onClick={handleLogout}
          className="text-destructive focus:text-destructive cursor-pointer"
        >
          <LogOut className="mr-2 h-4 w-4" />
          <span>Wyloguj</span>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
});
