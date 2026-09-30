import { api } from "@/convex/_generated/api";
import type { Giveaway } from "@/lib/giveaways";
import { useAction } from "convex/react";
import type { FunctionArgs } from "convex/server";
import { useEffect, useMemo, useRef, useState } from "react";

export interface GiveawayFilters {
  platform: string;
  type: string;
  sortBy: "value" | "popularity" | "newest" | "random";
  search: string;
}

export const DEFAULT_FILTERS: GiveawayFilters = {
  platform: "all",
  // Empty means "all types". Defaulting to `game` hid the console and mobile
  // giveaways, which are mostly DLC/cosmetics rather than full games.
  type: "",
  sortBy: "newest",
  search: "",
};

type ListGiveawaysArgs = FunctionArgs<typeof api.giveaways.listGiveaways>;
type PlatformArg = NonNullable<ListGiveawaysArgs["platform"]>;

export function useGiveaways(
  filters: GiveawayFilters,
  page: number,
  pageSize = 12,
  refreshToken = 0,
) {
  const listGiveaways = useAction(api.giveaways.listGiveaways);
  const [giveaways, setGiveaways] = useState<Giveaway[]>([]);
  const [total, setTotal] = useState(0);
  const [stale, setStale] = useState(false);
  const [fetchedAt, setFetchedAt] = useState<number | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const requestRef = useRef(0);

  const search = filters.search.trim();
  const key = `${filters.platform}|${filters.type}|${filters.sortBy}|${search}|${page}|${pageSize}|${refreshToken}`;

  useEffect(() => {
    const requestId = ++requestRef.current;

    // Debounced so typing in the search box doesn't fire a request per keystroke.
    const timer = setTimeout(() => {
      setIsLoading(true);
      setError(null);
      listGiveaways({
        platform: filters.platform as PlatformArg,
        type: filters.type || undefined,
        sortBy: filters.sortBy,
        page,
        pageSize,
        search: search || undefined,
      })
        .then((result) => {
          if (requestRef.current !== requestId) return;
          setGiveaways(result.items);
          setTotal(result.total);
          setStale(result.stale);
          setFetchedAt(result.fetchedAt);
        })
        .catch((err: unknown) => {
          if (requestRef.current !== requestId) return;
          setError(
            err instanceof Error ? err.message : "Could not load giveaways.",
          );
        })
        .finally(() => {
          if (requestRef.current === requestId) setIsLoading(false);
        });
    }, search ? 300 : 0);

    return () => clearTimeout(timer);
  }, [key, listGiveaways, filters.platform, filters.type, filters.sortBy, page, pageSize, search]);

  // "Trending" = in the top third by claim count on this page. Derived from a
  // field the feed actually provides, rather than a synthesised score.
  const trendingIds = useMemo(() => {
    const ranked = [...giveaways]
      .filter((item) => item.users > 0)
      .sort((a, b) => b.users - a.users);
    return new Set(ranked.slice(0, Math.max(1, Math.ceil(ranked.length / 3))).map((item) => item.id));
  }, [giveaways]);

  return { giveaways, total, stale, fetchedAt, trendingIds, isLoading, error };
}

/** "just now" / "4 min ago" / "2 hr ago" for the freshness note. */
export function formatFreshness(fetchedAt: number | null, now = Date.now()): string {
  if (fetchedAt === null) return "";
  const seconds = Math.max(0, Math.round((now - fetchedAt) / 1000));
  if (seconds < 45) return "just now";
  const minutes = Math.round(seconds / 60);
  if (minutes < 60) return `${minutes} min ago`;
  const hours = Math.round(minutes / 60);
  if (hours < 24) return `${hours} hr ago`;
  return `${Math.round(hours / 24)} d ago`;
}

export interface FeedStats {
  total: number;
  totalValue: number;
  expiringSoon: number;
  noDeadline: number;
  fetchedAt: number;
  stale: boolean;
}

/**
 * Aggregates for the current filters. Runs independently of paging so the
 * summary tiles describe the whole board, not one screen of it.
 */
export function useFeedStats(filters: GiveawayFilters): FeedStats | undefined {
  const feedStats = useAction(api.giveaways.feedStats);
  const [stats, setStats] = useState<FeedStats | undefined>(undefined);
  const requestRef = useRef(0);

  const search = filters.search.trim();
  const key = `${filters.platform}|${filters.type}|${filters.sortBy}|${search}`;

  useEffect(() => {
    const requestId = ++requestRef.current;
    const timer = setTimeout(() => {
      feedStats({
        platform: filters.platform as PlatformArg,
        type: filters.type || undefined,
        sortBy: filters.sortBy,
        search: search || undefined,
      })
        .then((result) => {
          if (requestRef.current === requestId) setStats(result);
        })
        .catch(() => {
          if (requestRef.current === requestId) setStats(undefined);
        });
    }, search ? 300 : 0);

    return () => clearTimeout(timer);
  }, [key, feedStats, filters.platform, filters.type, filters.sortBy, search]);

  return stats;
}

export function useFeaturedGiveaways(count = 8) {
  const featured = useAction(api.giveaways.featuredGiveaways);
  const [giveaways, setGiveaways] = useState<Giveaway[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let active = true;
    featured()
      .then((data) => {
        if (active) setGiveaways(data.slice(0, count));
      })
      .catch(() => {
        if (active) setGiveaways([]);
      })
      .finally(() => {
        if (active) setIsLoading(false);
      });
    return () => {
      active = false;
    };
  }, [featured, count]);

  return { giveaways, isLoading };
}
