import { cn } from "@/lib/utils";
import type { LucideIcon } from "lucide-react";

/**
 * Compact KPI row for the dashboard. Values are board-level aggregates for the
 * current filters, not just the visible page.
 */
export function StatTiles({
  tiles,
  className,
}: {
  tiles: { label: string; value: string; icon: LucideIcon; tone?: "default" | "warn" | "accent" }[];
  className?: string;
}) {
  return (
    <dl
      className={cn(
        "grid grid-cols-2 gap-px overflow-hidden rounded-xl border border-border/70 bg-border/70 lg:grid-cols-4",
        className,
      )}
    >
      {tiles.map((tile) => (
        <div
          key={tile.label}
          className="flex flex-col gap-1 bg-card/80 px-4 py-3.5 backdrop-blur-sm"
        >
          <dt className="flex items-center gap-1.5 text-[11px] font-medium uppercase tracking-[0.08em] text-muted-foreground">
            <tile.icon
              className={cn(
                "size-3.5 shrink-0",
                tile.tone === "warn" && "text-amber-500",
                tile.tone === "accent" && "text-primary",
              )}
            />
            <span className="truncate">{tile.label}</span>
          </dt>
          <dd
            className={cn(
              "hud-num text-xl font-semibold",
              tile.tone === "warn" && "text-amber-500",
              tile.tone === "accent" && "text-primary",
            )}
          >
            {tile.value}
          </dd>
        </div>
      ))}
    </dl>
  );
}
