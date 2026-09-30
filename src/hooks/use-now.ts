import { useEffect, useRef, useState, useSyncExternalStore } from "react";

/** A minute is the finest unit any countdown here displays. */
const TICK_MS = 30_000;

/**
 * One timer for the whole app.
 *
 * The clock used to be a `setInterval` per `useNow()` call, so a 12-card grid
 * ran 12 timers and re-rendered 12 cards on every tick — and because each
 * interval started at a different moment, the countdown meters drifted out of
 * step with each other. A single shared ticker fixes both: one interval, one
 * state update, every card reading the same timestamp.
 *
 * The interval only runs while something is actually subscribed, so an idle
 * tab costs nothing.
 */
let now = Date.now();
let timer: ReturnType<typeof setInterval> | null = null;
const listeners = new Set<() => void>();

function tick() {
  now = Date.now();
  for (const listener of listeners) listener();
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  if (timer === null) {
    // Catch up immediately: a component that mounts between ticks would
    // otherwise render a countdown derived from whenever the app loaded.
    now = Date.now();
    timer = setInterval(tick, TICK_MS);
  }
  return () => {
    listeners.delete(listener);
    if (listeners.size === 0 && timer !== null) {
      clearInterval(timer);
      timer = null;
    }
  };
}

function getSnapshot() {
  return now;
}

/** Subscribes to the app-wide clock. See the note above on why it's shared. */
export function useNow(): number {
  return useSyncExternalStore(subscribe, getSnapshot, getSnapshot);
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

/** True when the element is actually rendered, not just present in the DOM. */
function isVisible(element: HTMLElement): boolean {
  if (typeof element.checkVisibility === "function") {
    return element.checkVisibility();
  }
  return element.offsetParent !== null;
}

/**
 * Focuses a search field on Cmd/Ctrl+K, or on a bare "/" when the user isn't
 * already typing somewhere else. Returns a ref to attach to the input.
 *
 * A page may render this field twice — a header copy and a toolbar copy — with
 * CSS deciding which is shown. Only one instance can win the keyboard shortcut,
 * so each hook checks that its own input is actually visible before focusing;
 * otherwise the shortcut would silently focus the hidden one and appear broken.
 */
export function useSearchHotkey<T extends HTMLInputElement>() {
  const ref = useRef<T>(null);

  useEffect(() => {
    const focusVisibleInput = () => {
      const input = ref.current;
      if (!input || !isVisible(input)) return;
      input.focus();
      input.select();
    };

    const onKeyDown = (event: KeyboardEvent) => {
      const isCommandK =
        (event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "k";
      const isSlash = event.key === "/" && !isTypingTarget(event.target);

      if (isCommandK || isSlash) {
        event.preventDefault();
        focusVisibleInput();
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
