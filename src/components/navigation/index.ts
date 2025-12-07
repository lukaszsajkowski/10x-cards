// Main component
export { NavigationShell } from "./NavigationShell";

// Layout components
export { Sidebar } from "./Sidebar";
export { TopBar } from "./TopBar";
export { BottomNav } from "./BottomNav";

// UI components
export { NavItem } from "./NavItem";
export { UserMenu } from "./UserMenu";
export { ThemeToggle } from "./ThemeToggle";

// Context & Hooks
export { ThemeProvider, useThemeContext } from "./ThemeContext";
export { useMediaQuery, useIsMobile, useIsDesktop } from "./hooks/useMediaQuery";
export { useTheme } from "./hooks/useTheme";
export { useAuth } from "./hooks/useAuth";

// Types
export type {
  NavItemConfig,
  AppShellLayoutProps,
  NavigationShellProps,
  SidebarProps,
  BottomNavProps,
  TopBarProps,
  NavItemProps,
  UserMenuProps,
  ThemeToggleProps,
  Theme,
  ThemeContextValue,
  ThemeProviderProps,
} from "./types";

// Constants
export { MAIN_NAV_ITEMS } from "./constants";
export { THEME_STORAGE_KEY, DEFAULT_THEME } from "./types";
