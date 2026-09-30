import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ExternalLinkButton } from "@/components/ExternalLinkButton";
import { cn } from "@/lib/utils";
import { useNow } from "@/hooks/use-now";
import {
  compactNumber,
  formatCountdown,
  formatWorth,
  isFreshGiveaway,
  type Giveaway,
  URGENCY_TEXT,
  urgencyLevel,
} from "@/lib/giveaways";
import { Bookmark, Check, ExternalLink, Flame, Timer, Users } from "lucide-react";

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
  isTrending,
  isClaimed,
  onToggleClaimed,
  itemIndex,
  isActiveItem,
  onItemRef,
  className,
}: {
  giveaway: Giveaway;
  isSaved?: boolean;
  onToggleSave?: (giveaway: Giveaway) => void;
  onSelect?: (giveaway: Giveaway) => void;
  isTrending?: boolean;
  isClaimed?: boolean;
  onToggleClaimed?: (giveaway: Giveaway) => void;
  /** Position in a J/K-navigable list. */
  itemIndex?: number;
  /** Whether this card holds the grid's single tab stop. */
  isActiveItem?: boolean;
  onItemRef?: (index: number, node: HTMLElement | null) => void;
  className?: string;
}) {
  // One shared clock for the whole grid rather than a timer per card.
  const now = useNow();
  const urgency = urgencyLevel(giveaway.endsAt, now);
  const isFresh = isFreshGiveaway(giveaway.publishedAt, now);

  // Only one status badge fits comfortably beside the store badge, so they
  // resolve in priority order rather than stacking three deep.
  const status = isClaimed
    ? { label: "Claimed", icon: Check, className: "bg-primary text-primary-foreground" }
    : isFresh
      ? { label: "Just in", icon: null, className: "bg-primary text-primary-foreground" }
      : isTrending
        ? { label: "Trending", icon: Flame, className: "bg-background/85 text-foreground" }
        : null;

  return (
    <article
      ref={
        onItemRef && itemIndex !== undefined
          ? (node) => {
              onItemRef(itemIndex, node);
            }
          : undefined
      }
      tabIndex={isActiveItem ? 0 : -1}
      onKeyDown={
        onItemRef && onSelect
          ? (event) => {
              // Only when the card itself has focus, so the buttons and links
              // inside it keep their normal Enter behaviour.
              if (event.key === "Enter" && event.target === event.currentTarget) {
                event.preventDefault();
                onSelect(giveaway);
              }
            }
          : undefined
      }
      className={cn(
        "surface-card group relative flex flex-col overflow-hidden transition-all duration-300",
        "hover:-translate-y-0.5 hover:border-border hover:shadow-lg focus-within:-translate-y-0.5",
        onItemRef &&
          "outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background",
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
          <div className="flex min-w-0 flex-wrap items-center gap-1.5">
            <Badge className="border-0 bg-background/85 text-[11px] font-medium tracking-tight text-foreground backdrop-blur-sm">
              {giveaway.store}
            </Badge>
            {status && (
              <Badge
                className={cn(
                  "gap-1 text-[11px] font-semibold backdrop-blur-sm",
                  status.className,
                )}
              >
                {status.icon && <status.icon className="size-3" />}
                {status.label}
              </Badge>
            )}
          </div>
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
              "absolute bottom-3 right-3 inline-flex size-11 items-center justify-center rounded-full border backdrop-blur-sm transition-all",
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

        {/* Meta on its own line so the action row below always has room. */}
        <div className="mt-auto flex items-center gap-3 border-t border-border/60 pt-3 text-[11px] tabular-nums text-muted-foreground">
          <span
            className={cn(
              "inline-flex min-w-0 items-center gap-1 font-medium",
              URGENCY_TEXT[urgency],
            )}
          >
            <Timer className="size-3.5 shrink-0" />
            <span className="truncate">{formatCountdown(giveaway.endsAt, now)}</span>
          </span>
          {giveaway.users > 0 && (
            <span className="inline-flex shrink-0 items-center gap-1">
              <Users className="size-3.5 shrink-0" />
              {compactNumber(giveaway.users)}
            </span>
          )}
        </div>

        <div className="flex items-center gap-2">
          {onToggleClaimed && isSaved && (
            <Button
              type="button"
              variant="ghost"
              className={cn(
                "size-11 shrink-0 px-0",
                isClaimed && "text-primary hover:text-primary",
              )}
              aria-label={
                isClaimed
                  ? `Unmark ${giveaway.name} as claimed`
                  : `Mark ${giveaway.name} as claimed`
              }
              aria-pressed={Boolean(isClaimed)}
              onClick={() => onToggleClaimed(giveaway)}
            >
              <Check className={cn("size-4", !isClaimed && "opacity-40")} />
            </Button>
          )}
          {onSelect && (
            <Button
              type="button"
              variant="secondary"
              className="h-11 flex-1 text-[13px]"
              onClick={() => onSelect(giveaway)}
            >
              Details
            </Button>
          )}
          <ExternalLinkButton
            href={giveaway.url}
            className="h-11 flex-1 gap-1.5 text-[13px]"
            aria-label={`Claim ${giveaway.name} on ${giveaway.store}`}
          >
            {onSelect ? "Claim" : "Get it"}
            <ExternalLink className="size-3.5" />
          </ExternalLinkButton>
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
        <div className="h-11 animate-pulse rounded-lg bg-muted" />
      </div>
    </div>
  );
}
