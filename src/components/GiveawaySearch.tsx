import { Input } from "@/components/ui/input";
import { useSearchHotkey } from "@/hooks/use-now";
import { cn } from "@/lib/utils";
import { Search, X } from "lucide-react";
import { useEffect, useRef, useState } from "react";

/**
 * The board's search field.
 *
 * Render exactly one of these per page. Two instances previously shared a single
 * hotkey ref, so Cmd/Ctrl+K focused whichever had mounted last — on desktop
 * that was the `md:hidden` copy, making the shortcut appear broken.
 *
 * The hotkey ref is owned internally, so callers can't accidentally point the
 * shortcut at the wrong element.
 */
export function GiveawaySearch({
  value,
  onChange,
  placeholder = "Search games, stores, descriptions",
  className,
  resultCount,
}: {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  className?: string;
  /** Shown under the field, e.g. "12 results". */
  resultCount?: number;
}) {
  const inputRef = useSearchHotkey<HTMLInputElement>();
  const [focused, setFocused] = useState(false);

  // Held in a ref so callers can pass an inline arrow without re-registering
  // the key listener on every render.
  const onChangeRef = useRef(onChange);
  useEffect(() => {
    onChangeRef.current = onChange;
  });

  // Escape clears, matching the shortcut muscle memory people expect.
  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape" && document.activeElement === inputRef.current) {
        event.stopPropagation();
        onChangeRef.current("");
      }
    };
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [inputRef]);

  // The clear button only exists in the visible instance, so focusing after
  // clearing is safe; guard anyway so a hidden copy can't steal focus back.
  const refocus = () => {
    const input = inputRef.current;
    if (input && (typeof input.checkVisibility !== "function" || input.checkVisibility())) {
      input.focus();
    }
  };

  const hasValue = value.length > 0;

  return (
    <div className={cn("w-full", className)}>
      <div className="relative">
        <Search
          aria-hidden
          className={cn(
            "pointer-events-none absolute left-3.5 top-1/2 size-4 -translate-y-1/2 transition-colors duration-200",
            focused ? "text-primary" : "text-muted-foreground",
          )}
        />

        <Input
          ref={inputRef}
          value={value}
          onChange={(event) => onChange(event.target.value)}
          onFocus={() => setFocused(true)}
          onBlur={() => setFocused(false)}
          placeholder={placeholder}
          type="search"
          aria-label={placeholder}
          // The native clear affordance would sit on top of our own button.
          className="h-11 rounded-lg border-border/70 bg-card/60 pl-10 pr-24 text-sm backdrop-blur-sm transition-colors placeholder:text-muted-foreground/70 focus-visible:border-primary/50 [&::-webkit-search-cancel-button]:hidden"
        />

        <div className="absolute right-2.5 top-1/2 flex -translate-y-1/2 items-center gap-1.5">
          {hasValue ? (
            <>
              {resultCount !== undefined && (
                <span className="hud-num text-[11px] text-muted-foreground">
                  {resultCount}
                </span>
              )}
              <button
                type="button"
                aria-label="Clear search"
                onClick={() => {
                  onChangeRef.current("");
                  refocus();
                }}
                className="grid size-6 place-items-center rounded-md text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              >
                <X className="size-3.5" />
              </button>
            </>
          ) : (
            <kbd className="pointer-events-none hidden select-none items-center rounded border border-border/70 bg-secondary/60 px-1.5 py-0.5 text-[10px] font-medium text-muted-foreground sm:inline-flex">
              ⌘K
            </kbd>
          )}
        </div>
      </div>
    </div>
  );
}
