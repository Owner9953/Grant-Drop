/**
 * Server-side proxy for the GamerPower public giveaway API.
 *
 * Running the fetch on the Convex backend keeps the feed off the client, gives
 * us one place to normalise the upstream shape, and lets a short in-memory cache
 * absorb the repeated page/filter requests the UI fires while people browse.
 */

import { v } from "convex/values";
import {
  type Giveaway,
  UPSTREAM_PLATFORM_SLUGS,
  cleanTitle,
  extractStore,
  matchesPlatform,
  parseWorth,
} from "../lib/giveaways";
import { action } from "./_generated/server";

const API_ENDPOINT = "https://www.gamerpower.com/api/giveaways";
const CACHE_TTL_MS = 5 * 60 * 1000;
const MAX_PAGE_SIZE = 50;

const SORT_VALUES = v.union(
  v.literal("value"),
  v.literal("popularity"),
  v.literal("newest"),
  v.literal("random"),
);

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
 * last good result rather than surfacing an error on the page. `stale` tells the
 * UI when the data it is showing may be behind.
 */
async function loadThroughCache(
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

    // Keep the cache from growing without bound across filter combinations.
    if (cache.size > 60) {
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

export const listGiveaways = action({
  args: {
    platform: v.optional(v.string()),
    type: v.optional(v.string()),
    sortBy: v.optional(SORT_VALUES),
    page: v.optional(v.number()),
    pageSize: v.optional(v.number()),
    search: v.optional(v.string()),
  },
  handler: async (_ctx, args) => {
    const page = Math.max(1, Math.floor(args.page ?? 1));
    const pageSize = Math.min(
      MAX_PAGE_SIZE,
      Math.max(1, Math.floor(args.pageSize ?? 12)),
    );
    const platform = args.platform ?? "all";

    const params = new URLSearchParams();
    // Only forward a platform upstream when the endpoint actually accepts the
    // slug; the rest (Xbox, PlayStation, Nintendo, iOS, DRM-Free, PC) are
    // matched against the `platforms` field on the data below.
    const slug = UPSTREAM_PLATFORM_SLUGS[platform];
    if (slug) params.set("platform", slug);
    if (args.type) params.set("type", args.type.toLowerCase());
    if (args.sortBy) params.set("sort-by", args.sortBy);
    params.set("status", "active");

    // NOTE: the upstream API ignores `page`, `page-size` and `search` and always
    // returns the same capped result set. Paging and search therefore happen
    // here, which also means one cached fetch per filter combination serves
    // every page and every keystroke.
    const { data, stale } = await loadThroughCache(params.toString(), params);

    const search = args.search?.trim().toLowerCase();
    const all = data.filter((item) => {
      if (!matchesPlatform(item.platforms, platform)) return false;
      if (!search) return true;
      return (
        item.name.toLowerCase().includes(search) ||
        item.description.toLowerCase().includes(search) ||
        item.store.toLowerCase().includes(search)
      );
    });

    const start = (page - 1) * pageSize;
    return {
      items: all.slice(start, start + pageSize),
      total: all.length,
      stale,
    };
  },
});

/** Landing page hero feed: a handful of the highest-value active offers. */
export const featuredGiveaways = action({
  args: {},
  handler: async () => {
    const params = new URLSearchParams({
      "sort-by": "value",
      "type": "game",
      status: "active",
    });
    const { data } = await loadThroughCache("featured", params);
    return data.slice(0, 8);
  },
});

export const getGiveaway = action({
  args: { id: v.number() },
  handler: async (_ctx, args) => {
    const params = new URLSearchParams({ id: String(args.id) });
    const data = await fetchFromApi(params);
    return data[0] ?? null;
  },
});
