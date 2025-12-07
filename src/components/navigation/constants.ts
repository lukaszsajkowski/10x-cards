import { Library, Sparkles, History } from "lucide-react";
import type { NavItemConfig } from "./types";

/**
 * Predefiniowana konfiguracja głównych elementów nawigacji
 */
export const MAIN_NAV_ITEMS: NavItemConfig[] = [
  {
    href: "/flashcards",
    label: "Moje Fiszki",
    icon: Library,
    requiresAuth: true,
  },
  {
    href: "/generate",
    label: "Generator AI",
    icon: Sparkles,
    requiresAuth: true,
  },
  {
    href: "/generations",
    label: "Historia",
    icon: History,
    requiresAuth: true,
  },
];
