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
import {
  compactNumber,
  formatCountdown,
  formatWorth,
  type Giveaway,
  tidyDescription,
  urgencyLevel,
} from "@/lib/giveaways";
import { cn } from "@/lib/utils";
import { Bookmark, ExternalLink, Timer, Users } from "lucide-react";

/** Full offer view: art, value, deadline, description and claim steps. */
export function GiveawayDetailDialog({
  giveaway,
  open,
  onOpenChange,
  isSaved,
  onToggleSave,
}: {
  giveaway: Giveaway | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  isSaved: boolean;
  onToggleSave: (giveaway: Giveaway) => void;
}) {
  if (!giveaway) return null;

  const steps = giveaway.instructions
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);
  const urgency = urgencyLevel(giveaway.endsAt);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[92vh] gap-0 overflow-y-auto p-0 sm:max-w-2xl">
        <div className="relative aspect-[16/9] w-full overflow-hidden bg-muted">
          <img
            src={giveaway.image || giveaway.thumbnail}
            alt=""
            className="size-full object-cover"
          />
          <div
            aria-hidden
            className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/10 to-transparent"
          />
        </div>

        <div className="space-y-6 p-6">
          <DialogHeader className="space-y-3">
            <div className="flex flex-wrap items-center gap-2">
              <Badge variant="secondary" className="border-border/70 text-xs">
                {giveaway.store}
              </Badge>
              {giveaway.drmFree && (
                <Badge
                  variant="secondary"
                  className="border-border/70 text-xs text-primary"
                >
                  DRM-free
                </Badge>
              )}
              {giveaway.type !== "Game" && (
                <Badge variant="secondary" className="border-border/70 text-xs">
                  {giveaway.type}
                </Badge>
              )}
            </div>
            <DialogTitle className="text-balance text-2xl leading-tight tracking-[-0.02em]">
              {giveaway.name}
            </DialogTitle>
            <DialogDescription className="sr-only">
              Details and claim instructions for {giveaway.name}.
            </DialogDescription>
          </DialogHeader>

          <dl className="grid grid-cols-3 gap-px overflow-hidden rounded-xl border border-border/70 bg-border/70">
            <div className="bg-card px-4 py-3.5">
              <dt className="text-[11px] uppercase tracking-[0.08em] text-muted-foreground">
                Worth
              </dt>
              <dd className="mt-1 text-base font-semibold tabular-nums text-primary">
                {formatWorth(giveaway.worth, giveaway.worthAmount)}
              </dd>
            </div>
            <div className="bg-card px-4 py-3.5">
              <dt className="text-[11px] uppercase tracking-[0.08em] text-muted-foreground">
                Deadline
              </dt>
              <dd
                className={cn(
                  "mt-1 text-sm font-semibold tabular-nums",
                  urgency === "high" && "text-destructive",
                )}
              >
                {formatCountdown(giveaway.endsAt)}
              </dd>
            </div>
            <div className="bg-card px-4 py-3.5">
              <dt className="text-[11px] uppercase tracking-[0.08em] text-muted-foreground">
                Claimed by
              </dt>
              <dd className="mt-1 text-base font-semibold tabular-nums">
                {compactNumber(giveaway.users)}
              </dd>
            </div>
          </dl>

          {tidyDescription(giveaway.description) && (
            <p className="text-sm leading-6 text-muted-foreground">
              {tidyDescription(giveaway.description)}
            </p>
          )}

          {steps.length > 0 && (
            <div>
              <h3 className="text-sm font-semibold tracking-tight">How to claim</h3>
              <ol className="mt-3 space-y-2.5">
                {steps.map((step, index) => (
                  <li key={index} className="flex gap-3 text-sm leading-6 text-muted-foreground">
                    <span className="mt-0.5 grid size-5 shrink-0 place-items-center rounded-full bg-muted text-[11px] font-semibold tabular-nums text-foreground">
                      {index + 1}
                    </span>
                    {step}
                  </li>
                ))}
              </ol>
            </div>
          )}

          <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
            <Timer className="size-3.5" />
            <span>{giveaway.endsAt === null ? "No published deadline" : `Ends ${new Date(giveaway.endsAt).toLocaleString()}`}</span>
            <span aria-hidden>·</span>
            <Users className="size-3.5" />
            <span>{giveaway.platforms.join(", ")}</span>
          </div>

          <div className="flex flex-col gap-2 sm:flex-row">
            <ExternalLinkButton
              href={giveaway.url}
              className="h-10 flex-1 gap-1.5"
              aria-label={`Claim ${giveaway.name} on ${giveaway.store}`}
            >
              Claim on {giveaway.store}
              <ExternalLink className="size-3.5" />
            </ExternalLinkButton>
            <Button
              type="button"
              variant="outline"
              className="h-10 gap-1.5 sm:w-auto"
              onClick={() => onToggleSave(giveaway)}
            >
              <Bookmark className={cn("size-4", isSaved && "fill-current text-primary")} />
              {isSaved ? "In your library" : "Save for later"}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
