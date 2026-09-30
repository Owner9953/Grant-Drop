/**
 * Shared GamerPower feed access: fetch, normalise, cache, filter and page.
 *
 * Kept separate from `giveaways.ts` so the public JSON/RSS routes in `http.ts`
 * can serve exactly the same data as the app's own actions without duplicating
 * any of it. This module exports no Convex functions, so the function router
 * treats it as inert.
 */

import {
  type Giveaway,
  UPSTREAM_PLATFORM_SLUGS,
  cleanTitle,
  extractStore,
  matchesPlatform,
  parseWorth,
} from "../lib/giveaways";

const API_ENDPOINT = "https://www.gamerpower.com/api/giveaways";
const CACHE_TTL_MS = 5 * 60 * 1000;
const MAX_CACHE_ENTRIES = 60;
export const MAX_PAGE_SIZE = 50;

export type SortKey = "value" | "popularity" | "newest" | "random";

interface RawGiveaway {
  id: number;
  title: string;
  worth: string;
  thumbnail: string;
  image: string;
  description: string;
  instructions: string;
  open_giveaway_url: string;
  open_giveaway: string;
  published_date: string;
  type: string;
  platforms: string;
  end_date: string;
  users: number;
  status: string;
}

const cache = new Map<string, { at: number; data: Giveaway[] }>();

/** "2026-10-01 23:59:00" is UTC on the feed; anything unparseable becomes null. */
function toEpoch(raw: string | null | undefined): number | null {
  if (!raw || raw === "N/A") return null;
  const ms = Date.parse(`${raw.replace(" ", "T")}Z`);
  return Number.isNaN(ms) ? null : ms;
}

function normalise(raw: RawGiveaway): Giveaway {
  const platforms = (raw.platforms ?? "")
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);
  const worthAmount = parseWorth(raw.worth);
  return {
    id: raw.id,
    title: raw.title,
    name: cleanTitle(raw.title),
    store: extractStore(raw.title, raw.platforms ?? ""),
    worth: raw.worth,
    worthAmount,
    thumbnail: raw.thumbnail,
    image: raw.image,
    description: raw.description ?? "",
    instructions: raw.instructions ?? "",
    url: raw.open_giveaway_url || raw.open_giveaway,
    platforms,
    drmFree: platforms.some((item) => item.toLowerCase().includes("drm-free")),
    endsAt: toEpoch(raw.end_date),
    endsAtRaw: raw.end_date ?? "",
    publishedAt: toEpoch(raw.published_date),
    users: raw.users ?? 0,
    type: raw.type ?? "Game",
    status: raw.status ?? "Active",
  };
}

/**
 * The upstream API is loose about its contract: an empty category comes back as
 * HTTP 201 with a `{"status":0,...}` object, and an unknown category as HTTP 404
 * with the same shape. Neither is a real failure, so both mean "no results".
 * Only 5xx / network trouble is treated as transient.
 */
async function fetchFromApi(params: URLSearchParams): Promise<Giveaway[]> {
  const response = await fetch(`${API_ENDPOINT}?${params.toString()}`, {
    headers: { Accept: "application/json" },
  });
  if (response.status >= 500) {
    throw new Error(`GamerPower API responded ${response.status}`);
  }
  if (!response.ok) return [];

  let payload: unknown;
  try {
    payload = await response.json();
  } catch {
    return [];
  }
  if (!Array.isArray(payload)) return [];

  return (payload as RawGiveaway[])
    .filter((item) => item && typeof item.id === "number" && item.title)
    .map((item) => normalise(item));
}

/**
 * Reads through the cache, and on a transient upstream failure falls back to the
 * last good result rather than surfacing an error. `stale` tells the caller when
 * the data may be behind.
 */
export async function loadThroughCache(
  key: string,
  params: URLSearchParams,
): Promise<{ data: Giveaway[]; stale: boolean }> {
  const hit = cache.get(key);
  if (hit && Date.now() - hit.at < CACHE_TTL_MS) {
    return { data: hit.data, stale: false };
  }

  try {
    const data = await fetchFromApi(params);
    cache.set(key, { at: Date.now(), data });

    if (cache.size > MAX_CACHE_ENTRIES) {
      const oldest = [...cache.entries()].sort((a, b) => a[1].at - b[1].at);
      for (const [staleKey] of oldest.slice(0, 20)) cache.delete(staleKey);
    }
    return { data, stale: false };
  } catch (err) {
    if (hit) {
      // Keep serving the last good list, and retry the upstream fetch on the
      // next request rather than hammering it every page view.
      return { data: hit.data, stale: true };
    }
    throw err;
  }
}

export interface FeedQuery {
  platform?: string;
  type?: string;
  sortBy?: SortKey;
  page?: number;
  pageSize?: number;
  search?: string;
}

export interface FeedResult {
  items: Giveaway[];
  total: number;
  stale: boolean;
  fetchedAt: number;
}

/**
 * Builds the upstream query string for a set of filters.
 *
 * Only a platform the endpoint actually accepts is forwarded; the rest (Xbox,
 * PlayStation, Nintendo, iOS, DRM-Free, PC) are matched against the `platforms`
 * field locally. `page`, `page-size` and `search` are deliberately NOT sent —
 * the upstream API ignores all three and returns the same capped set regardless.
 */
export function buildParams(query: FeedQuery): URLSearchParams {
  const params = new URLSearchParams();
  const platform = query.platform ?? "all";
  const slug = UPSTREAM_PLATFORM_SLUGS[platform];
  if (slug) params.set("platform", slug);
  if (query.type) params.set("type", query.type.toLowerCase());
  if (query.sortBy) params.set("sort-by", query.sortBy);
  params.set("status", "active");
  return params;
}

/** The full filtered set for a query, before paging is applied. */
async function loadFiltered(
  query: FeedQuery,
): Promise<{ all: Giveaway[]; stale: boolean; fetchedAt: number }> {
  const platform = query.platform ?? "all";
  const params = buildParams(query);
  const { data, stale } = await loadThroughCache(params.toString(), params);

  const search = query.search?.trim().toLowerCase();
  const all = data.filter((item) => {
    if (!matchesPlatform(item.platforms, platform)) return false;
    if (!search) return true;
    return (
      item.name.toLowerCase().includes(search) ||
      item.description.toLowerCase().includes(search) ||
      item.store.toLowerCase().includes(search)
    );
  });

  return { all, stale, fetchedAt: Date.now() };
}

/** Runs a feed query end to end: fetch, filter, search, then page. */
export async function runFeedQuery(query: FeedQuery): Promise<FeedResult> {
  const page = Math.max(1, Math.floor(query.page ?? 1));
  const pageSize = Math.min(
    MAX_PAGE_SIZE,
    Math.max(1, Math.floor(query.pageSize ?? 12)),
  );

  const { all, stale, fetchedAt } = await loadFiltered(query);
  const start = (page - 1) * pageSize;
  return {
    items: all.slice(start, start + pageSize),
    total: all.length,
    stale,
    fetchedAt,
  };
}

export interface FeedStats {
  /** Offers matching the current filters. */
  total: number;
  /** Sum of listed retail prices across those offers. */
  totalValue: number;
  /** Offers expiring within 24 hours. */
  expiringSoon: number;
  /** Offers with no published deadline. */
  noDeadline: number;
  fetchedAt: number;
  stale: boolean;
}

/**
 * Aggregates over the whole filtered set, not just the visible page, so the
 * dashboard's summary tiles describe the board rather than one screen of it.
 */
export async function runFeedStats(query: FeedQuery): Promise<FeedStats> {
  const { all, stale, fetchedAt } = await loadFiltered(query);
  const now = Date.now();

  let totalValue = 0;
  let expiringSoon = 0;
  let noDeadline = 0;

  for (const item of all) {
    totalValue += item.worthAmount;
    if (item.endsAt === null) noDeadline += 1;
    else if (item.endsAt - now < 24 * 3_600_000) expiringSoon += 1;
  }

  return { total: all.length, totalValue, expiringSoon, noDeadline, fetchedAt, stale };
}
