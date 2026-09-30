import { Button } from "@/components/ui/button";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Info } from "lucide-react";

/**
 * Explains how "Most valuable" is actually ordered.
 *
 * The feed only publishes a retail price per offer, so that price is the entire
 * basis for the ranking. Stating that plainly is more useful to a user than a
 * confident-looking composite score built from signals we do not have.
 */
export function ValueExplainer({ className }: { className?: string }) {
  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button
          type="button"
          variant="ghost"
          size="icon"
          className={className ?? "size-8"}
          aria-label="How value ranking works"
        >
          <Info className="size-4" />
        </Button>
      </PopoverTrigger>
      <PopoverContent align="start" className="w-80 text-sm">
        <p className="font-semibold tracking-tight">How "Most valuable" is ranked</p>
        <p className="mt-2 leading-6 text-muted-foreground">
          Every offer carries a retail price from the store listing it. Sorting
          by value simply orders the board by that price, highest first.
        </p>
        <ul className="mt-3 space-y-1.5 text-muted-foreground">
          <li>
            <span className="font-medium text-foreground">Source</span> — the
            store&apos;s own list price, not a sale or historical low.
          </li>
          <li>
            <span className="font-medium text-foreground">Not included</span> —
            review scores, historical pricing and popularity play no part.
          </li>
          <li>
            <span className="font-medium text-foreground">N/A</span> — offers
            with no listed price sort last as unvalued.
          </li>
        </ul>
        <p className="mt-3 text-xs text-muted-foreground">
          The feed we index doesn&apos;t publish review or pricing history, so we
          don&apos;t estimate them.
        </p>
      </PopoverContent>
    </Popover>
  );
}
