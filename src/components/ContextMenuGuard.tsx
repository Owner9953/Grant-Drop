import { useEffect } from "react";

/**
 * Suppresses the browser context menu for the whole app.
 *
 * Renders nothing. Mount once near the root so it wraps every route; drop the
 * component from the tree to restore native right-click behaviour.
 */
export function ContextMenuGuard() {
  useEffect(() => {
    const block = (event: MouseEvent) => event.preventDefault();
    document.addEventListener("contextmenu", block);
    return () => document.removeEventListener("contextmenu", block);
  }, []);

  return null;
}
