import { GiveawayCardSkeleton } from "@/components/GiveawayCard";
import { ExternalLinkButton } from "@/components/ExternalLinkButton";
import { Badge } from "@/components/ui/badge";
import { useNow } from "@/hooks/use-now";
import {
  formatCountdown,
  formatWorth,
  type Giveaway,
  URGENCY_TEXT,
  urgencyLevel,
} from "@/lib/giveaways";
import { groupByDeadline } from "@/lib/library-csv";
import { cn } from "@/lib/utils";
import { ExternalLink, Timer } from "lucide-react";

/**
 * Calendar view: the same offers grouped by the day they expire, so a collector
 * can see "what must I claim this week" at a glance instead of scanning a grid.
 */
export function CalendarAgenda({
  giveaways,
  isLoading,
}: {
  giveaways: Giveaway[];
  isLoading: boolean;
}) {
  const now = useNow();

  if (isLoading) {
    return (
      <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
        {Array.from({ length: 6 }).map((_, index) => (
          <GiveawayCardSkeleton key={index} />
        ))}
      </div>
    );
  }

  const days = groupByDeadline(giveaways, now);
  if (days.length === 0) return null;

  return (
    <div className="space-y-4">
      {days.map((day) => (
        <section key={day.key} className="surface-card overflow-hidden">
          <header className="flex items-center gap-2.5 border-b border-border/60 bg-secondary/40 px-4 py-3">
            <h3 className="text-sm font-semibold tracking-tight">{day.label}</h3>
            {day.isToday && (
              <Badge className="border-0 bg-primary text-[11px] font-semibold text-primary-foreground">
                Today
              </Badge>
            )}
            <span className="ml-auto text-xs tabular-nums text-muted-foreground">
              {day.entries.length} {day.entries.length === 1 ? "offer" : "offers"}
            </span>
          </header>

          <ul className="divide-y divide-border/60">
            {day.entries.map((entry) => (
              <li
                key={entry.id}
                className="flex min-h-11 flex-wrap items-center gap-x-3 gap-y-2 px-4 py-3 transition-colors hover:bg-secondary/30"
              >
                <span className="min-w-0 flex-1 truncate text-sm font-medium">
                  {entry.name}
                </span>
                <Badge
                  variant="secondary"
                  className="shrink-0 border-border/70 text-[11px]"
                >
                  {entry.store}
                </Badge>
                {entry.worthAmount > 0 && (
                  <span className="shrink-0 text-xs font-semibold tabular-nums text-primary">
                    {formatWorth(entry.worth, entry.worthAmount)}
                  </span>
                )}
                <span
                  className={cn(
                    "inline-flex shrink-0 items-center gap-1 text-xs font-medium tabular-nums",
                    URGENCY_TEXT[urgencyLevel(entry.endsAt, now)],
                  )}
                >
                  <Timer className="size-3.5" />
                  {formatCountdown(entry.endsAt, now)}
                </span>
                <ExternalLinkButton
                  size="sm"
                  variant="ghost"
                  className="h-8 shrink-0 gap-1 px-2 text-xs"
                  href={entry.url}
                  aria-label={`Claim ${entry.name} on ${entry.store}`}
                >
                  Claim
                  <ExternalLink className="size-3" />
                </ExternalLinkButton>
              </li>
            ))}
          </ul>
        </section>
      ))}
    </div>
  );
}
