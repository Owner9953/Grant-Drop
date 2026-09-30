import { cn } from "@/lib/utils";
import { Gamepad2 } from "lucide-react";
import { useState } from "react";

/**
 * Giveaway artwork.
 *
 * The feed publishes two sizes: `thumbnail` is 300x168 and `image` is 460x215,
 * with aspect ratios of 1.79 and 2.14 respectively — not 16:9. Cards render
 * wide enough that the 300px thumbnail gets upscaled and looks soft, so we
 * prefer the 460px `image` and fall back to the thumbnail only if it is absent.
 *
 * The frame is sized to the source aspect so the art is letterboxed rather than
 * cropped, and a branded placeholder stands in when the CDN 404s instead of
 * showing a broken-image glyph.
 */
export function GiveawayArt({
  image,
  thumbnail,
  alt,
  aspect = "aspect-[16/9]",
  className,
  imageClassName,
  priority = false,
}: {
  image?: string;
  thumbnail?: string;
  alt: string;
  aspect?: string;
  className?: string;
  imageClassName?: string;
  /** Set for above-the-fold art so it isn't lazy-loaded off screen. */
  priority?: boolean;
}) {
  const primary = image || thumbnail;
  const fallback = primary === thumbnail ? undefined : thumbnail;
  const [src, setSrc] = useState(primary);
  const [failed, setFailed] = useState(false);

  const handleError = () => {
    // Try the other size once before giving up.
    if (src && fallback && src !== fallback) {
      setSrc(fallback);
      return;
    }
    setFailed(true);
  };

  return (
    <div className={cn("relative w-full overflow-hidden bg-muted", aspect, className)}>
      {failed ? (
        <div className="grid size-full place-items-center bg-gradient-to-br from-muted via-muted to-accent/40">
          <Gamepad2 className="size-8 text-muted-foreground/60" />
        </div>
      ) : (
        <img
          src={src}
          alt={alt}
          loading={priority ? "eager" : "lazy"}
          decoding="async"
          // 1.79 source in a 1.78 frame: cover without visible cropping.
          onError={handleError}
          className={cn("size-full object-cover", imageClassName)}
        />
      )}
    </div>
  );
}

/**
 * Scrim layered over the art so overlaid badges stay legible regardless of how
 * bright the key art is. Two clean stops rather than a muddy three-stop blend.
 */
export function ArtScrim({ className }: { className?: string }) {
  return (
    <div
      aria-hidden
      className={cn(
        "pointer-events-none absolute inset-0",
        "bg-gradient-to-t from-card via-card/25 via-40% to-transparent",
        "shadow-[inset_0_-40px_60px_-40px_color-mix(in_oklch,var(--card)_90%,transparent)]",
        className,
      )}
    />
  );
}
