import { memo } from "react";
import { Sun, Moon } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import type { ThemeToggleProps } from "./types";

/**
 * Przełącznik motywu jasnego/ciemnego w formie przycisku z ikoną słońca/księżyca
 */
export const ThemeToggle = memo(function ThemeToggle({
  theme,
  onToggle,
  size = "default",
}: ThemeToggleProps) {
  const isDark = theme === "dark";
  const label = isDark ? "Włącz jasny motyw" : "Włącz ciemny motyw";

  const buttonSize = size === "sm" ? "icon-sm" : size === "lg" ? "icon-lg" : "icon";

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <Button
          variant="ghost"
          size={buttonSize}
          onClick={onToggle}
          aria-label={label}
          className="relative"
        >
          <Sun
            className={`h-5 w-5 transition-all ${
              isDark ? "rotate-90 scale-0" : "rotate-0 scale-100"
            }`}
          />
          <Moon
            className={`absolute h-5 w-5 transition-all ${
              isDark ? "rotate-0 scale-100" : "-rotate-90 scale-0"
            }`}
          />
          <span className="sr-only">{label}</span>
        </Button>
      </TooltipTrigger>
      <TooltipContent side="right" sideOffset={8}>
        <p>{label}</p>
      </TooltipContent>
    </Tooltip>
  );
});
