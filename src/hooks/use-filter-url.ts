import {
  DEFAULT_FILTERS,
  type GiveawayFilters,
} from "@/hooks/use-giveaways";
import { useCallback, useMemo } from "react";
import { useSearchParams } from "react-router";

const SORTS = new Set(["value", "popularity", "newest", "random"]);

type View = "list" | "calendar";

function parse(params: URLSearchParams): GiveawayFilters & { view: View } {
  const sort = params.get("sort");
  return {
    platform: params.get("platform") ?? DEFAULT_FILTERS.platform,
    type: params.get("type") ?? DEFAULT_FILTERS.type,
    sortBy: (
      SORTS.has(sort ?? "") ? sort : DEFAULT_FILTERS.sortBy
    ) as GiveawayFilters["sortBy"],
    search: params.get("q") ?? "",
    view: params.get("view") === "calendar" ? "calendar" : "list",
  };
}

function serialise(
  filters: GiveawayFilters,
  view: View,
): URLSearchParams {
  const draft = new URLSearchParams();
  // Defaults are omitted so a clean view stays a clean URL.
  if (filters.platform !== DEFAULT_FILTERS.platform) {
    draft.set("platform", filters.platform);
  }
  if (filters.type !== DEFAULT_FILTERS.type) draft.set("type", filters.type);
  if (filters.sortBy !== DEFAULT_FILTERS.sortBy) {
    draft.set("sort", filters.sortBy);
  }
  if (filters.search) draft.set("q", filters.search);
  if (view === "calendar") draft.set("view", "calendar");
  return draft;
}

/**
 * Keeps the board's filters in the URL.
 *
 * The query string is the single source of truth rather than mirrored into
 * state, so a refresh keeps the user's platform, sort, view and search, a
 * filtered board can be shared or bookmarked, and browser back/forward works
 * without any state-sync effect.
 */
export function useFiltersInUrl() {
  const [params, setParams] = useSearchParams();

  const current = useMemo(() => parse(params), [params]);
  const { view, ...filters } = current;

  const update = useCallback(
    (patch: Partial<GiveawayFilters>) => {
      // replace: changing a filter shouldn't stack entries in session history.
      setParams(serialise({ ...filters, ...patch }, view), { replace: true });
    },
    [filters, view, setParams],
  );

  const updateView = useCallback(
    (nextView: View) => {
      setParams(serialise(filters, nextView), { replace: true });
    },
    [filters, setParams],
  );

  return { filters, update, view, updateView };
}
