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
  cleanTitle,
  extractStore,
  parseWorth,
} from "../lib/giveaways";
import { action } from "./_generated/server";

const API_ENDPOINT = "https://www.gamerpower.com/api/giveaways";
const CACHE_TTL_MS = 5 * 60 * 1000;
const MAX_PAGE_SIZE = 50;

const PLATFORM_VALUES = v.union(
  v.literal("all"),
  v.literal("steam"),
  v.literal("epic-games-store"),
  v.literal("gog"),
  v.literal("itchio"),
  v.literal("ubisoft-connect"),
  v.literal("ea-app"),
  v.literal("xbox-game-pass"),
  v.literal("playstation"),
  v.literal("nintendo"),
  v.literal("itunes"),
  v.literal("android"),
);

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

async function fetchFromApi(params: URLSearchParams): Promise<Giveaway[]> {
  const response = await fetch(`${API_ENDPOINT}?${params.toString()}`, {
    headers: { Accept: "application/json" },
  });
  if (!response.ok) {
    throw new Error(`GamerPower API responded ${response.status}`);
  }
  const payload = await response.json();
  if (!Array.isArray(payload)) {
    throw new Error("GamerPower API returned an unexpected payload");
  }
  return payload.map((item: RawGiveaway) => normalise(item));
}

export const listGiveaways = action({
  args: {
    platform: v.optional(PLATFORM_VALUES),
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

    const params = new URLSearchParams();
    if (args.platform && args.platform !== "all") {
      params.set("platform", args.platform);
    }
    if (args.type) params.set("type", args.type.toLowerCase());
    if (args.sortBy) params.set("sort-by", args.sortBy);
    const search = args.search?.trim();
    if (search) {
      params.set("search", search);
      params.set("search-by", "name");
    }
    params.set("status", "active");

    // NOTE: the upstream API ignores `page` and `page-size` and always returns
    // the same capped result set, so paging happens here instead. That also
    // means one cached fetch per filter combination serves every page.
    const key = params.toString();
    const hit = cache.get(key);
    const all =
      hit && Date.now() - hit.at < CACHE_TTL_MS
        ? hit.data
        : await fetchFromApi(params).then((data) => {
            cache.set(key, { at: Date.now(), data });
            // Keep the cache from growing without bound across filter combos.
            if (cache.size > 60) {
              const oldest = [...cache.entries()].sort((a, b) => a[1].at - b[1].at);
              for (const [staleKey] of oldest.slice(0, 20)) cache.delete(staleKey);
            }
            return data;
          });

    const start = (page - 1) * pageSize;
    return { items: all.slice(start, start + pageSize), total: all.length };
  },
});

/** Landing page hero feed: a handful of the highest-value active offers. */
export const featuredGiveaways = action({
  args: {},
  handler: async () => {
    const key = "featured";
    const hit = cache.get(key);
    if (hit && Date.now() - hit.at < CACHE_TTL_MS) return hit.data;

    const params = new URLSearchParams({
      "sort-by": "value",
      "type": "game",
      status: "active",
    });
    const data = await fetchFromApi(params);
    cache.set(key, { at: Date.now(), data });
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
