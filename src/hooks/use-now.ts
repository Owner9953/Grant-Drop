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

/**
 * J/K moves focus through a list of cards.
 *
 * Returns the active index and a ref callback to attach to each card, so the
 * grid can use a roving tabindex (one tab stop, arrow-style movement) instead of
 * making every card a tab stop. Activation is left to the component's own
 * onKeyDown so Enter keeps working on the buttons inside a card.
 */
export function useListNavigation(count: number) {
  const [activeIndex, setActiveIndex] = useState(0);
  const itemRefs = useRef<(HTMLElement | null)[]>([]);

  // Clamped during render rather than in an effect: when the list shrinks under
  // us (filtering, paging) the index must not briefly point past the end.
  const safeIndex = count === 0 ? 0 : Math.min(activeIndex, count - 1);

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.metaKey || event.ctrlKey || event.altKey) return;
      if (isTypingTarget(event.target)) return;
      if (count === 0) return;

      const key = event.key.toLowerCase();
      if (key !== "j" && key !== "k") return;

      event.preventDefault();
      setActiveIndex((current) => {
        const next = key === "j"
          ? Math.min(current + 1, count - 1)
          : Math.max(current - 1, 0);
        itemRefs.current[next]?.focus();
        return next;
      });
    };

    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [count]);

  return { activeIndex: safeIndex, setActiveIndex, itemRefs };
}
