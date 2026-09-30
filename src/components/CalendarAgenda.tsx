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
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 sm:gap-5 lg:grid-cols-3 xl:grid-cols-4">
        {Array.from({ length: 8 }).map((_, index) => (
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
          <header className="flex flex-wrap items-center gap-x-2.5 gap-y-1.5 border-b border-border/60 bg-secondary/40 px-4 py-3">
            <h3 className="min-w-0 truncate text-sm font-semibold tracking-tight">
              {day.label}
            </h3>
            {day.isToday && (
              <Badge className="shrink-0 border-0 bg-primary text-[11px] font-semibold text-primary-foreground">
                Today
              </Badge>
            )}
            <span className="ml-auto shrink-0 text-xs tabular-nums text-muted-foreground">
              {day.entries.length} {day.entries.length === 1 ? "offer" : "offers"}
            </span>
          </header>

          <ul className="divide-y divide-border/60">
            {day.entries.map((entry) => (
              // Mobile puts the title on its own line and lets the meta wrap
              // beneath it. Lining the four controls up in one row only works
              // from `sm` up, where a phone-width name is a truncated stub.
              <li
                key={entry.id}
                className="flex flex-wrap items-center gap-x-3 gap-y-2 px-4 py-3 transition-colors hover:bg-secondary/30 sm:flex-nowrap"
              >
                <span className="w-full min-w-0 text-sm font-medium leading-snug sm:w-auto sm:flex-1 sm:self-center sm:truncate">
                  {entry.name}
                </span>

                <div className="flex min-w-0 flex-1 flex-wrap items-center gap-x-2 gap-y-1 sm:flex-none">
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
                      "inline-flex shrink-0 items-center gap-1 whitespace-nowrap text-xs font-medium tabular-nums",
                      URGENCY_TEXT[urgencyLevel(entry.endsAt, now)],
                    )}
                  >
                    <Timer className="size-3.5" />
                    {formatCountdown(entry.endsAt, now)}
                  </span>
                </div>

                <ExternalLinkButton
                  size="sm"
                  variant="ghost"
                  className="h-9 shrink-0 gap-1 px-3 text-xs sm:h-8 sm:px-2"
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
