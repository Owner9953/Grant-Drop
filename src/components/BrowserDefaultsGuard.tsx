import { useEffect } from "react";

/**
 * Strips two pieces of native browser chrome from the app:
 *
 * 1. The right-click context menu, everywhere.
 * 2. The status-bar URL preview bubble that appears when hovering a link.
 *
 * For (2) the links keep real `href` values, so middle-click, ctrl/cmd-click,
 * keyboard activation and "open in new tab" all keep working — we only stop the
 * browser surfacing the target address in the corner of the window. Cancelling
 * `mouseover` is what suppresses that bubble; `click` is left untouched so
 * navigation is unaffected.
 *
 * Renders nothing. Mount once near the root; delete the component from the tree
 * to restore the native behaviour.
 */
export function BrowserDefaultsGuard() {
  useEffect(() => {
    const blockContextMenu = (event: MouseEvent) => event.preventDefault();

    const hideLinkPreview = (event: MouseEvent) => {
      const target = event.target;
      if (target instanceof Element && target.closest("a[href]")) {
        event.preventDefault();
      }
    };

    document.addEventListener("contextmenu", blockContextMenu);
    document.addEventListener("mouseover", hideLinkPreview, true);
    return () => {
      document.removeEventListener("contextmenu", blockContextMenu);
      document.removeEventListener("mouseover", hideLinkPreview, true);
    };
  }, []);

  return null;
}
