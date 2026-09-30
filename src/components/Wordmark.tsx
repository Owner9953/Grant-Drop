import { BrandMark } from "@/components/BrandMark";
import { cn } from "@/lib/utils";

/** Brand lockup: the mark beside the product name. */
export function Wordmark({
  className,
  tone = "default",
}: {
  className?: string;
  tone?: "default" | "inverted";
}) {
  return (
    <span className={cn("inline-flex items-center gap-2.5", className)}>
      <BrandMark tone={tone} />
      <span
        className={cn(
          "text-[15px] font-semibold tracking-tight",
          tone === "inverted" && "text-white",
        )}
      >
        Grant<span className="text-primary">drop</span>
      </span>
    </span>
  );
}
