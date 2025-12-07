import { useState, useCallback } from "react";
import { ChevronDown, ChevronUp, FileText } from "lucide-react";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { Button } from "@/components/ui/button";
import type { SourceTextPreviewProps } from "./types";

/**
 * Zwijany panel (akordeon) wyświetlający oryginalny tekst źródłowy,
 * umożliwiający użytkownikowi weryfikację kontekstu podczas recenzji propozycji.
 */
export function SourceTextPreview({
  text,
  defaultExpanded = false,
}: SourceTextPreviewProps) {
  const [isOpen, setIsOpen] = useState(defaultExpanded);

  const handleToggle = useCallback(() => {
    setIsOpen((prev) => !prev);
  }, []);

  return (
    <Collapsible open={isOpen} onOpenChange={setIsOpen}>
      <div className="rounded-lg border bg-card">
        <CollapsibleTrigger asChild>
          <Button
            variant="ghost"
            className="w-full justify-between px-4 py-3 h-auto font-normal hover:bg-muted/50"
            onClick={handleToggle}
            aria-expanded={isOpen}
          >
            <div className="flex items-center gap-2">
              <FileText className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm font-medium">Tekst źródłowy</span>
              <span className="text-xs text-muted-foreground">
                ({text.length.toLocaleString("pl-PL")} znaków)
              </span>
            </div>
            {isOpen ? (
              <ChevronUp className="h-4 w-4 text-muted-foreground" />
            ) : (
              <ChevronDown className="h-4 w-4 text-muted-foreground" />
            )}
          </Button>
        </CollapsibleTrigger>
        <CollapsibleContent>
          <div className="px-4 pb-4">
            <div className="max-h-[300px] overflow-y-auto rounded-md bg-muted/30 p-4">
              <p className="text-sm whitespace-pre-wrap text-muted-foreground">
                {text}
              </p>
            </div>
          </div>
        </CollapsibleContent>
      </div>
    </Collapsible>
  );
}
