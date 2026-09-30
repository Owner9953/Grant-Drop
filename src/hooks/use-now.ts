import { useEffect, useRef, useState } from "react";

/**
 * Re-renders on an interval so countdowns stay live without every card owning
 * a timer. Tick rate is coarse on purpose: a minute is the finest unit the
 * countdown displays, and hundreds of independent timers would be wasteful.
 */
export function useNow(intervalMs = 30_000): number {
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    const timer = setInterval(() => setNow(Date.now()), intervalMs);
    return () => clearInterval(timer);
  }, [intervalMs]);

  return now;
}

function isTypingTarget(target: EventTarget | null): boolean {
  if (!(target instanceof HTMLElement)) return false;
  return (
    target.isContentEditable ||
    target.tagName === "INPUT" ||
    target.tagName === "TEXTAREA" ||
    target.tagName === "SELECT"
  );
}

/**
 * Focuses a search field on Cmd/Ctrl+K, or on a bare "/" when the user isn't
 * already typing somewhere else. Returns a ref to attach to the input.
 */
export function useSearchHotkey<T extends HTMLInputElement>() {
  const ref = useRef<T>(null);

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      const isCommandK =
        (event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "k";
      const isSlash = event.key === "/" && !isTypingTarget(event.target);

      if (isCommandK || isSlash) {
        event.preventDefault();
        ref.current?.focus();
        ref.current?.select();
      }
    };

    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, []);

  return ref;
}
