import { api } from "@/convex/_generated/api";
import type { Giveaway } from "@/lib/giveaways";
import { useAction } from "convex/react";
import type { FunctionArgs } from "convex/server";
import { useEffect, useRef, useState } from "react";

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

  return { giveaways, total, stale, isLoading, error };
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
