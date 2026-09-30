import { ArtScrim, GiveawayArt } from "@/components/GiveawayArt";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ExternalLinkButton } from "@/components/ExternalLinkButton";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useNow } from "@/hooks/use-now";
import {
  compactNumber,
  formatCountdown,
  formatWorth,
  type Giveaway,
  isFragment,
  msRemaining,
  stripStepNumber,
  tidyDescription,
  URGENCY_TEXT,
  urgencyLevel,
} from "@/lib/giveaways";
import { cn } from "@/lib/utils";
import type { ReactNode } from "react";
import {
  Bookmark,
  Check,
  ExternalLink,
  Hourglass,
  ShieldCheck,
  Timer,
} from "lucide-react";

/** Full offer view: art, value, deadline, description and claim steps. */
export function GiveawayDetailDialog({
  giveaway,
  open,
  onOpenChange,
  isSaved,
  onToggleSave,
  isClaimed,
  onToggleClaimed,
}: {
  giveaway: Giveaway | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  isSaved: boolean;
  onToggleSave: (giveaway: Giveaway) => void;
  isClaimed?: boolean;
  onToggleClaimed?: (giveaway: Giveaway) => void;
}) {
  const now = useNow();

  if (!giveaway) return null;

  // The feed's `instructions` describe the *publisher's* redemption flow, and
  // name buttons that live on the store's own site — a "Get Giveaway" button
  // Grantdrop doesn't have. They cannot be presented as our instructions, so
  // they are kept verbatim, attributed to the store, and folded away.
  const storeSteps = giveaway.instructions
    .split(/\r?\n/)
    .map((line) => stripStepNumber(line.trim()))
    .filter(Boolean);

  // What actually happens in Grantdrop, in the order it happens.
  const claimFlow = [
    {
      title: giveaway.endsAt === null ? "Note there's no deadline" : "Check the clock",
      body:
        giveaway.endsAt === null
          ? `${giveaway.store} publishes no end date for this one, so it can be pulled without warning. Take it while it's there.`
          : `${formatCountdown(giveaway.endsAt, now)} on the timer above, counting down live. Leave this sheet open and it stays accurate.`,
    },
    {
      title: `Claim on ${giveaway.store}`,
      body: `The button below opens ${giveaway.store}'s own giveaway page in a new tab. Eligibility, login and redemption all happen on their side — Grantdrop never sees your account.`,
    },
    {
      title: isClaimed ? "Already in your games" : "Mark it claimed",
      body: isClaimed
        ? "You've marked this as redeemed, so it sits under Claimed and out of your saved list."
        : "Once the key or download is in your account, mark it claimed so you always know what's still waiting to be picked up.",
    },
  ];
  const urgency = urgencyLevel(giveaway.endsAt, now);
  const remaining = msRemaining(giveaway.endsAt, now);
  const expired = remaining !== null && remaining <= 0;
  const description = tidyDescription(giveaway.description);
  // A truncated stub ("Download Express No. 6 for") reads as a broken page, so
  // it is dropped rather than shown.
  const summary = isFragment(description) ? "" : description;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[92dvh] gap-0 overflow-y-auto p-0 sm:max-w-2xl">
        <div className="relative">
          <GiveawayArt
            image={giveaway.image}
            thumbnail={giveaway.thumbnail}
            alt={giveaway.name}
            aspect="aspect-[2/1]"
          />
          <ArtScrim />
          {giveaway.drmFree && (
            <span className="absolute bottom-3 left-3 inline-flex items-center gap-1.5 rounded-md border border-white/15 bg-black/60 px-2 py-1 text-[11px] font-semibold text-white backdrop-blur-md">
              <ShieldCheck className="size-3.5" />
              DRM-free
            </span>
          )}
        </div>

        <div className="space-y-6 p-4 sm:p-6">
          <DialogHeader className="space-y-3">
            <div className="flex flex-wrap items-center gap-2">
              <Badge variant="secondary" className="border-border/70 text-xs">
                {giveaway.store}
              </Badge>
              {giveaway.type !== "Game" && (
                <Badge variant="secondary" className="border-border/70 text-xs">
                  {giveaway.type}
                </Badge>
              )}
              {/* Repeated, not moved: "DRM-free" is the single most
                  trust-relevant fact about an offer, so it earns a second
                  position next to the art. Uses the opaque accent pair rather
                  than a translucent primary tint, which would put primary text
                  on a near-primary background wherever `color-mix` is absent. */}
              {giveaway.drmFree && (
                <Badge
                  variant="secondary"
                  className="gap-1 border-primary/40 bg-accent text-xs text-accent-foreground"
                >
                  <ShieldCheck className="size-3" />
                  DRM-free
                </Badge>
              )}
            </div>
            <DialogTitle className="text-balance text-2xl leading-tight tracking-[-0.02em]">
              {giveaway.name}
            </DialogTitle>
            <DialogDescription className="sr-only">
              Offer details, deadline and how to claim {giveaway.name} on{" "}
              {giveaway.store}.
            </DialogDescription>
          </DialogHeader>

          <DeadlineBanner endsAt={giveaway.endsAt} expired={expired} urgency={urgency} />

          <dl className="grid grid-cols-3 gap-px overflow-hidden rounded-xl border border-border/60 bg-border/60">
            <div className="bg-card/80 px-3 py-3.5 sm:px-4">
              <dt className="text-[11px] font-medium uppercase tracking-[0.08em] text-muted-foreground">
                Worth
              </dt>
              <dd className="hud-num mt-1 text-base font-semibold text-primary">
                {formatWorth(giveaway.worth, giveaway.worthAmount)}
              </dd>
            </div>
            <div className="bg-card/80 px-3 py-3.5 sm:px-4">
              <dt className="text-[11px] font-medium uppercase tracking-[0.08em] text-muted-foreground">
                Deadline
              </dt>
              {/* Same size as its neighbours: "5d 21h left" was set a step
                  smaller than "$4.99", so the three numbers didn't line up. */}
              <dd
                className={cn(
                  "hud-num mt-1 text-base font-semibold",
                  expired ? "text-destructive" : URGENCY_TEXT[urgency],
                )}
              >
                {expired ? "Expired" : formatCountdown(giveaway.endsAt, now)}
              </dd>
            </div>
            <div className="bg-card/80 px-3 py-3.5 sm:px-4">
              {/* The feed reports a `users` counter, not verified redemptions,
                  so it is labelled for what it is. */}
              <dt className="text-[11px] font-medium uppercase tracking-[0.08em] text-muted-foreground">
                Users
              </dt>
              <dd className="hud-num mt-1 text-base font-semibold">
                {compactNumber(giveaway.users)}
              </dd>
            </div>
          </dl>

          {summary && (
            <p className="text-sm leading-6 text-muted-foreground">{summary}</p>
          )}

          <section>
            <SectionLabel>How to claim</SectionLabel>
            <ol className="mt-3 space-y-3">
              {claimFlow.map((step, index) => (
                <li key={step.title} className="flex gap-3">
                  <span className="hud-num mt-0.5 grid size-5 shrink-0 place-items-center rounded-full bg-accent text-[11px] font-semibold text-accent-foreground">
                    {index + 1}
                  </span>
                  <div className="min-w-0">
                    <p className="text-sm font-medium leading-5">{step.title}</p>
                    <p className="mt-0.5 text-sm leading-6 text-muted-foreground">
                      {step.body}
                    </p>
                  </div>
                </li>
              ))}
            </ol>
          </section>

          {storeSteps.length > 0 && (
            <details className="group rounded-lg border border-border/70 bg-secondary/30 px-3.5 py-3">
              <summary className="cursor-pointer list-none text-xs font-semibold text-muted-foreground transition-colors marker:content-none [&::-webkit-details-marker]:hidden hover:text-foreground">
                What {giveaway.store} asks for
              </summary>
              <ul className="mt-2.5 space-y-1.5 text-xs leading-5 text-muted-foreground">
                {storeSteps.map((step, index) => (
                  <li key={index} className="flex gap-2">
                    <span aria-hidden className="select-none text-muted-foreground/50">
                      &middot;
                    </span>
                    <span className="min-w-0">{step}</span>
                  </li>
                ))}
              </ul>
            </details>
          )}

          {giveaway.platforms.length > 0 && (
            <section>
              <SectionLabel>Available on</SectionLabel>
              <ul className="mt-3 flex flex-wrap gap-1.5">
                {giveaway.platforms.map((platform) => (
                  <li
                    key={platform}
                    className="rounded-md border border-border/70 bg-secondary/50 px-2 py-1 text-xs text-muted-foreground"
                  >
                    {platform}
                  </li>
                ))}
              </ul>
            </section>
          )}

          {giveaway.endsAt !== null && (
            <p className="flex items-center gap-1.5 text-xs text-muted-foreground">
              <Timer className="size-3.5 shrink-0" />
              {new Date(giveaway.endsAt).toLocaleString(undefined, {
                dateStyle: "medium",
                timeStyle: "short",
              })}
            </p>
          )}
        </div>

        {/* The offer's whole point is the claim button, so it stays pinned to
            the bottom of the sheet instead of scrolling away under a long
            description or a multi-step redemption. */}
        <div className="sticky bottom-0 z-10 border-t border-border/60 bg-background/95 px-4 pb-[calc(0.75rem+env(safe-area-inset-bottom,0px))] pt-3 backdrop-blur-xl sm:px-6 sm:pb-3">
          <div className="flex flex-col gap-2 sm:flex-row">
            <ExternalLinkButton
              href={giveaway.url}
              className={cn(
                "h-11 gap-1.5",
                "sm:flex-1",
                // Never disabled: the feed can lag the store, so an offer we
                // call expired may still be redeemable. Relabelled instead.
                !expired && "glow-accent",
              )}
              aria-label={
                expired
                  ? `Check ${giveaway.name} on ${giveaway.store}`
                  : `Claim ${giveaway.name} on ${giveaway.store}`
              }
            >
              {expired ? `Check on ${giveaway.store}` : `Claim on ${giveaway.store}`}
              <ExternalLink className="size-3.5" />
            </ExternalLinkButton>
            <div className="flex gap-2">
              <Button
                type="button"
                variant="outline"
                className="h-11 flex-1 gap-1.5 sm:flex-none"
                onClick={() => onToggleSave(giveaway)}
                aria-pressed={Boolean(isSaved)}
              >
                <Bookmark
                  className={cn("size-4", isSaved && "fill-current text-primary")}
                />
                <span className="xs:hidden">Save</span>
                <span className="hidden xs:inline">
                  {isSaved ? "In your library" : "Save for later"}
                </span>
              </Button>
              {onToggleClaimed && isSaved && (
                <Button
                  type="button"
                  variant="outline"
                  className={cn(
                    "h-11 shrink-0 gap-1.5",
                    isClaimed && "border-primary text-primary hover:text-primary",
                  )}
                  aria-pressed={Boolean(isClaimed)}
                  onClick={() => onToggleClaimed(giveaway)}
                >
                  <Check className={cn("size-4", !isClaimed && "opacity-40")} />
                  <span className="hidden xs:inline">
                    {isClaimed ? "Claimed" : "Mark claimed"}
                  </span>
                </Button>
              )}
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

/**
 * Shared heading for the secondary blocks. One treatment, so "How to claim" and
 * "Available on" read as siblings rather than as two unrelated labels.
 */
function SectionLabel({ children }: { children: ReactNode }) {
  return (
    <h3 className="text-[11px] font-semibold uppercase tracking-[0.1em] text-muted-foreground">
      {children}
    </h3>
  );
}

/**
 * A single line of deadline state, so the one thing that decides whether an
 * offer is still worth clicking can't be missed by reading three small tiles.
 */
function DeadlineBanner({
  endsAt,
  expired,
  urgency,
}: {
  endsAt: number | null;
  expired: boolean;
  urgency: ReturnType<typeof urgencyLevel>;
}) {
  if (endsAt === null) {
    return (
      <p className="flex items-center gap-2 rounded-lg border border-border/70 bg-secondary/40 px-3.5 py-2.5 text-xs text-muted-foreground">
        <Timer className="size-3.5 shrink-0" />
        No published deadline — this offer has no end date set.
      </p>
    );
  }

  if (expired) {
    return (
      <p className="flex items-center gap-2 rounded-lg border border-destructive/30 bg-destructive/10 px-3.5 py-2.5 text-xs font-medium text-destructive">
        <Hourglass className="size-3.5 shrink-0" />
        This offer's deadline has passed. Check the store page in case the feed
        is behind.
      </p>
    );
  }

  if (urgency === "normal") return null;

  return (
    <p
      className={cn(
        "flex items-center gap-2 rounded-lg border px-3.5 py-2.5 text-xs font-medium",
        urgency === "critical"
          ? "border-destructive/30 bg-destructive/10 text-destructive"
          : "border-amber-500/30 bg-amber-500/10 text-amber-600 dark:text-amber-400",
      )}
    >
      <Hourglass className="size-3.5 shrink-0" />
      {urgency === "critical"
        ? "Under six hours left — claim it now or lose it."
        : "Under a day left on this one."}
    </p>
  );
}
