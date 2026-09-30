import { ArtScrim, GiveawayArt } from "@/components/GiveawayArt";
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
  remainingFraction,
  URGENCY_TEXT,
  urgencyLevel,
} from "@/lib/giveaways";
import { Bookmark, Check, ExternalLink, Flame, ShieldCheck, Timer, Users } from "lucide-react";

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
        "hover:-translate-y-1 hover:border-primary/40 hover:shadow-2xl focus-within:-translate-y-1",
        "hover:[box-shadow:0_0_0_1px_color-mix(in_oklch,var(--primary)_45%,transparent),0_18px_50px_-14px_color-mix(in_oklch,var(--primary)_55%,transparent)]",
        onItemRef &&
          "outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background",
        className,
      )}
    >
      <div className="relative">
        <GiveawayArt
          image={giveaway.image}
          thumbnail={giveaway.thumbnail}
          alt=""
          aspect="aspect-[16/9]"
          imageClassName="transition-transform duration-500 group-hover:scale-[1.06]"
        />
        <ArtScrim />
        <div className="absolute inset-x-0 top-0 flex items-start justify-between gap-2 p-3">
          <div className="flex min-w-0 flex-wrap items-center gap-1.5">
            <Badge className="border border-white/10 bg-black/55 text-[11px] font-medium tracking-tight text-white backdrop-blur-md">
              {giveaway.store}
            </Badge>
            {status && (
              <Badge
                className={cn(
                  "gap-1 text-[11px] font-semibold backdrop-blur-md",
                  status.icon ? "border border-white/10 bg-black/55 text-white" : "",
                  status.className,
                )}
              >
                {status.icon && <status.icon className="size-3" />}
                {status.label}
              </Badge>
            )}
          </div>
          <span
            className={cn(
              "hud-num shrink-0 rounded-md border px-2 py-1 text-[11px] font-semibold backdrop-blur-md",
              giveaway.worthAmount > 0
                ? "border-primary/40 bg-primary/15 text-primary"
                : "border-white/10 bg-black/55 text-white/70",
            )}
          >
            {formatWorth(giveaway.worth, giveaway.worthAmount)}
          </span>
        </div>
        {onToggleSave && (
          <button
            type="button"
            aria-label={isSaved ? `Remove ${giveaway.name} from library` : `Save ${giveaway.name} to library`}
            aria-pressed={Boolean(isSaved)}
            onClick={() => onToggleSave(giveaway)}
            className={cn(
              "absolute bottom-3 right-3 inline-flex size-11 items-center justify-center rounded-full border backdrop-blur-md transition-all",
              "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background",
              isSaved
                ? "border-primary/40 bg-primary text-primary-foreground"
                : "border-white/10 bg-black/55 text-white/80 hover:bg-black/75 hover:text-white",
            )}
          >
            <Bookmark className={cn("size-4", isSaved && "fill-current")} />
          </button>
        )}
      </div>

      <div className="flex flex-1 flex-col gap-3 p-4">
        <div className="space-y-2">
          <h3 className="line-clamp-2 text-[17px] font-semibold leading-[1.2] tracking-[-0.02em]">
            {giveaway.name}
          </h3>
          <p className="line-clamp-1 text-[11px] font-medium uppercase tracking-[0.1em] text-muted-foreground">
            {giveaway.platforms.filter((p) => p !== "PC").join(" · ") || "PC"}
          </p>
        </div>

        {/* Time-remaining meter: a visual read on how much runway the offer has. */}
        {giveaway.endsAt !== null && (
          <div className="flex items-center gap-2">
            <div className="h-1 flex-1 overflow-hidden rounded-full bg-muted">
              <div
                className={cn(
                  "h-full rounded-full transition-[width] duration-500",
                  urgency === "critical" && "bg-destructive",
                  urgency === "warning" && "bg-amber-500",
                  urgency === "normal" && "bg-primary",
                )}
                style={{ width: `${remainingFraction(giveaway.endsAt, now)}%` }}
              />
            </div>
            <span
              className={cn(
                "hud-num shrink-0 text-[11px] font-semibold",
                URGENCY_TEXT[urgency],
              )}
            >
              {formatCountdown(giveaway.endsAt, now).replace(" left", "")}
            </span>
          </div>
        )}

        {/* Meta on its own line so the action row below always has room. */}
        <div className="mt-auto flex items-center gap-3 border-t border-border/60 pt-3 text-[11px] tabular-nums text-muted-foreground">
          {giveaway.drmFree && (
            <span className="inline-flex shrink-0 items-center gap-1 font-medium text-primary">
              <ShieldCheck className="size-3.5 shrink-0" />
              DRM-free
            </span>
          )}
          {giveaway.users > 0 && (
            <span className="inline-flex shrink-0 items-center gap-1">
              <Users className="size-3.5 shrink-0" />
              <span className="hud-num">{compactNumber(giveaway.users)}</span>
              <span className="hidden xl:inline"> claimed</span>
            </span>
          )}
          {giveaway.endsAt === null && (
            <span className="inline-flex items-center gap-1">
              <Timer className="size-3.5 shrink-0" />
              No deadline
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
      <div className="aspect-[16/9] w-full animate-pulse bg-muted" />
      <div className="space-y-3 p-4">
        <div className="h-4 w-3/4 animate-pulse rounded bg-muted" />
        <div className="h-3 w-1/2 animate-pulse rounded bg-muted" />
        <div className="h-11 animate-pulse rounded-lg bg-muted" />
      </div>
    </div>
  );
}
