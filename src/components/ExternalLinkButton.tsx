import { Button } from "@/components/ui/button";
import type { ComponentProps } from "react";

/**
 * A button that opens an external URL without ever putting it in an `href`.
 *
 * The giveaway links point at third-party storefronts, and an `<a href>` gives
 * the browser a target to surface — the status-bar URL preview on hover, plus
 * "copy link address" / "open in new tab" in the context menu. Rendering a real
 * `<button>` and opening with `window.open` means there is simply no href in the
 * DOM for the browser to reveal.
 *
 * Trade-off: middle-click and ctrl/cmd-click no longer open the link, since
 * there is no link. Keyboard activation (Enter/Space) still works because this
 * is a genuine button, and the ExternalLink icon in the label still signals that
 * it opens a new tab.
 */
export function ExternalLinkButton({
  href,
  children,
  ...props
}: { href: string } & Omit<ComponentProps<typeof Button>, "asChild" | "href">) {
  return (
    <Button
      type="button"
      onClick={() => {
        window.open(href, "_blank", "noopener,noreferrer");
      }}
      {...props}
    >
      {children}
    </Button>
  );
}
