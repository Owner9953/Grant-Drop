import { api } from "@/convex/_generated/api";
import type { Giveaway } from "@/lib/giveaways";
import { useAction, useMutation, useQuery } from "convex/react";
import { useCallback, useEffect, useRef, useState } from "react";
import { toast } from "sonner";

/**
 * How often to re-check the feed while the app is open. GamerPower's feed is
 * cached server-side for five minutes, so polling faster than this would just
 * re-read the same cache entry.
 */
const POLL_MS = 5 * 60 * 1000;

/** Event the toast's "View" action fires so the header bell can open itself. */
export const OPEN_ALERTS_EVENT = "grantdrop:open-alerts";

const NO_ITEMS: Giveaway[] = [];

export interface GiveawayAlertFeed {
  /** Whether the user has opted in to in-app alerts. */
  enabled: boolean;
  /** New offers published since they last cleared the bell, newest first. */
  items: Giveaway[];
  unreadCount: number;
  isChecking: boolean;
  /** Clears the badge and advances the server watermark. */
  markAllRead: () => void;
}

/**
 * Polls for giveaways published since the user's watermark and keeps them in an
 * unread list until they clear the bell.
 *
 * The watermark only advances when the list is cleared, so anything not yet
 * read survives a reload and greets the user next session — the same contract
 * as an inbox. Alerts are in-app only: there is no channel that can deliver
 * while this tab is closed.
 */
export function useGiveawayAlerts(): GiveawayAlertFeed {
  const prefs = useQuery(api.notifications.getPrefs);
  const findNew = useAction(api.notifications.newSinceLastVisit);
  const markSeen = useMutation(api.notifications.markSeen);

  const [items, setItems] = useState<Giveaway[]>(NO_ITEMS);
  const [isChecking, setIsChecking] = useState(false);
  // Refs, not state: these only guard duplicate work within a poll and must not
  // trigger a render of their own.
  const inFlight = useRef(false);
  const knownIds = useRef<Set<number>>(new Set());
  const newestAt = useRef(0);

  const enabled = prefs?.browserEnabled === true;

  const check = useCallback(async () => {
    if (inFlight.current) return;
    inFlight.current = true;
    setIsChecking(true);
    try {
      const result = await findNew();
      if (result.newestAt > newestAt.current) newestAt.current = result.newestAt;
      if (result.quiet) return;

      // The action filters by the stored watermark, so a poll can legitimately
      // return offers already on screen. Dedupe by id before they reach state
      // or the toast.
      const fresh = result.items.filter(
        (item: Giveaway) => !knownIds.current.has(item.id),
      );
      if (fresh.length === 0) return;

      for (const item of fresh) knownIds.current.add(item.id);
      setItems((current) => [...fresh, ...current].slice(0, 50));
      announce(fresh);
    } catch {
      // The upstream feed is flaky by nature; stay quiet and try again on the
      // next tick rather than surfacing a network error from a passive feature.
    } finally {
      inFlight.current = false;
      setIsChecking(false);
    }
  }, [findNew]);

  useEffect(() => {
    if (!enabled) return;

    void check();
    const timer = setInterval(() => {
      if (document.visibilityState === "visible") void check();
    }, POLL_MS);
    // Coming back to the tab is the moment a "new" offer is most likely to
    // still be claimable, so re-check immediately on focus.
    const onVisibility = () => {
      if (document.visibilityState === "visible") void check();
    };
    document.addEventListener("visibilitychange", onVisibility);

    return () => {
      clearInterval(timer);
      document.removeEventListener("visibilitychange", onVisibility);
    };
  }, [enabled, check]);

  const markAllRead = useCallback(() => {
    setItems(NO_ITEMS);
    knownIds.current.clear();
    const at = newestAt.current;
    if (at === 0) return;
    newestAt.current = 0;
    void markSeen({ at }).catch(() => {
      // A failed watermark write only means the same batch reappears once.
    });
  }, [markSeen]);

  return {
    enabled,
    items: enabled ? items : NO_ITEMS,
    unreadCount: enabled ? items.length : 0,
    isChecking,
    markAllRead,
  };
}

/** One in-app toast per batch rather than one per game. */
function announce(fresh: Giveaway[]) {
  const total = fresh.reduce((sum, item) => sum + (item.worthAmount || 0), 0);
  const single = fresh.length === 1;

  toast(
    single
      ? `New free game: ${fresh[0].name}`
      : `${fresh.length} new free games on the board`,
    {
      description:
        total > 0
          ? `${single ? "Worth" : "Combined value"} $${Math.round(total)}`
          : fresh[0].store,
      action: {
        label: "View",
        onClick: () => window.dispatchEvent(new Event(OPEN_ALERTS_EVENT)),
      },
    },
  );
}
