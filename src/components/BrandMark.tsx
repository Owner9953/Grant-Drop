import { cn } from "@/lib/utils";

/**
 * The Grantdrop mark, inline so it scales with the wordmark and can be
 * recoloured per context. Mirrors `public/logo.svg`, which is the favicon and
 * install icon.
 *
 * The G is a broken ring with a crossbar, open on the right, with a pixel
 * accent sitting in the gap — a nod to the "drop" in the name.
 */
export function BrandMark({
  className,
  tone = "default",
}: {
  className?: string;
  /** `inverted` drops the dark tile for use on light or image backgrounds. */
  tone?: "default" | "inverted";
}) {
  const id = tone === "inverted" ? "gm-i" : "gm-d";

  return (
    <svg
      viewBox="0 0 64 64"
      className={cn("size-7 shrink-0", className)}
      role="img"
      aria-label="Grantdrop"
    >
      <defs>
        <linearGradient id={`${id}-bg`} x1="0" y1="0" x2="1" y2="1">
          <stop
            offset="0"
            stopColor={tone === "inverted" ? "#ffffff" : "#1A212B"}
          />
          <stop
            offset="1"
            stopColor={tone === "inverted" ? "#E7EDF3" : "#080B10"}
          />
        </linearGradient>
        <linearGradient id={`${id}-mark`} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#4AE3A0" />
          <stop offset="0.55" stopColor="#2DD4BF" />
          <stop offset="1" stopColor="#22D3EE" />
        </linearGradient>
      </defs>

      <rect width="64" height="64" rx="15" fill={`url(#${id}-bg)`} />
      <rect
        x="0.75"
        y="0.75"
        width="62.5"
        height="62.5"
        rx="14.25"
        fill="none"
        stroke={tone === "inverted" ? "#0B0F14" : "#ffffff"}
        strokeOpacity={tone === "inverted" ? 0.12 : 0.1}
        strokeWidth="1.5"
      />

      <path
        d="M44.6 32 A12.6 12.6 0 1 0 38.3 20.6"
        fill="none"
        stroke={`url(#${id}-mark)`}
        strokeWidth="6.4"
        strokeLinecap="round"
      />
      <path
        d="M44.6 32 H34.2"
        fill="none"
        stroke={`url(#${id}-mark)`}
        strokeWidth="6.4"
        strokeLinecap="round"
      />
      <rect x="41.4" y="13.2" width="6.2" height="6.2" rx="1.6" fill="#4AE3A0" />
    </svg>
  );
}
