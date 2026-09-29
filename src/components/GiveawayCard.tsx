import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import {
  compactNumber,
  formatCountdown,
  formatWorth,
  type Giveaway,
  urgencyLevel,
} from "@/lib/giveaways";
import { Bookmark, Timer, Users } from "lucide-react";

/**
 * The offer tile used on both the landing page and the app grid. `onSelect`
 * opens the detail sheet; without it the card stays a plain link so the
 * marketing page keeps a single tap-to-claim path.
 */
export function GiveawayCard({
  giveaway,
  isSaved,
  onToggleSave,
  onSelect,
  className,
}: {
  giveaway: Giveaway;
  isSaved?: boolean;
  onToggleSave?: (giveaway: Giveaway) => void;
  onSelect?: (giveaway: Giveaway) => void;
  className?: string;
}) {
  const urgency = urgencyLevel(giveaway.endsAt);

  return (
    <article
      className={cn(
        "surface-card group relative flex flex-col overflow-hidden transition-all duration-300",
        "hover:-translate-y-0.5 hover:border-border hover:shadow-lg focus-within:-translate-y-0.5",
        className,
      )}
    >
      <div className="relative aspect-[16/10] w-full overflow-hidden bg-muted">
        <img
          src={giveaway.thumbnail}
          alt=""
          loading="lazy"
          className="size-full object-cover transition-transform duration-500 group-hover:scale-[1.04]"
        />
        <div className="absolute inset-x-0 top-0 flex items-start justify-between gap-2 p-3">
          <Badge className="border-0 bg-background/85 text-[11px] font-medium tracking-tight text-foreground backdrop-blur-sm">
            {giveaway.store}
          </Badge>
          <Badge
            className={cn(
              "border-0 text-[11px] font-semibold tabular-nums backdrop-blur-sm",
              giveaway.worthAmount > 0
                ? "bg-primary text-primary-foreground"
                : "bg-background/85 text-muted-foreground",
            )}
          >
            {formatWorth(giveaway.worth, giveaway.worthAmount)}
          </Badge>
        </div>
        {onToggleSave && (
          <button
            type="button"
            aria-label={isSaved ? `Remove ${giveaway.name} from library` : `Save ${giveaway.name} to library`}
            aria-pressed={Boolean(isSaved)}
            onClick={() => onToggleSave(giveaway)}
            className={cn(
              "absolute bottom-3 right-3 inline-flex size-8 items-center justify-center rounded-full border backdrop-blur-sm transition-all",
              "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background",
              isSaved
                ? "border-transparent bg-primary text-primary-foreground"
                : "border-border/60 bg-background/80 text-muted-foreground hover:bg-background hover:text-foreground",
            )}
          >
            <Bookmark className={cn("size-4", isSaved && "fill-current")} />
          </button>
        )}
      </div>

      <div className="flex flex-1 flex-col gap-3 p-4">
        <div className="space-y-1.5">
          <h3 className="line-clamp-2 text-[15px] font-semibold leading-snug tracking-tight">
            {giveaway.name}
          </h3>
          <p className="line-clamp-1 text-xs text-muted-foreground">
            {giveaway.platforms.filter((p) => p !== "PC").join(" · ") || "PC"}
          </p>
        </div>

        <div className="mt-auto flex items-center justify-between gap-3 border-t border-border/60 pt-3">
          <div className="flex min-w-0 items-center gap-3 text-[11px] tabular-nums text-muted-foreground">
            <span
              className={cn(
                "inline-flex items-center gap-1",
                urgency === "high" && "font-medium text-destructive",
              )}
            >
              <Timer className="size-3.5 shrink-0" />
              <span className="truncate">{formatCountdown(giveaway.endsAt)}</span>
            </span>
            {giveaway.users > 0 && (
              <span className="inline-flex items-center gap-1">
                <Users className="size-3.5 shrink-0" />
                {compactNumber(giveaway.users)}
              </span>
            )}
          </div>

          {onSelect ? (
            <Button
              type="button"
              size="sm"
              variant="secondary"
              className="h-8 shrink-0 px-3 text-xs"
              onClick={() => onSelect(giveaway)}
            >
              Details
            </Button>
          ) : (
            <Button asChild size="sm" className="h-8 shrink-0 px-3 text-xs">
              <a href={giveaway.url} target="_blank" rel="noopener noreferrer">
                Claim
              </a>
            </Button>
          )}
        </div>
      </div>
    </article>
  );
}

/** Compact placeholder used while the feed is loading. */
export function GiveawayCardSkeleton() {
  return (
    <div className="surface-card overflow-hidden">
      <div className="aspect-[16/10] w-full animate-pulse bg-muted" />
      <div className="space-y-3 p-4">
        <div className="h-4 w-3/4 animate-pulse rounded bg-muted" />
        <div className="h-3 w-1/2 animate-pulse rounded bg-muted" />
        <div className="h-8 animate-pulse rounded bg-muted" />
      </div>
    </div>
  );
}
