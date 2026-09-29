import { cn } from "@/lib/utils";

/** Compact brand mark: a jade "claimed" chip beside the product name. */
export function Wordmark({
  className,
  tone = "default",
}: {
  className?: string;
  tone?: "default" | "inverted";
}) {
  return (
    <span className={cn("inline-flex items-center gap-2.5", className)}>
      <span
        className={cn(
          "grid size-7 place-items-center rounded-lg text-[13px] font-bold",
          tone === "inverted"
            ? "bg-white text-neutral-900"
            : "bg-foreground text-background",
        )}
      >
        G
      </span>
      <span className="text-[15px] font-semibold tracking-tight">
        Grant<span className="text-primary">drop</span>
      </span>
    </span>
  );
}
