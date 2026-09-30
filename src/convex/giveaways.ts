/**
 * Client-facing actions over the shared feed module.
 *
 * All the fetching, caching, filtering and paging lives in `feed.ts` so the
 * public JSON/RSS routes can reuse it; these are thin typed wrappers around it.
 */

import { v } from "convex/values";
import { runFeedQuery, runFeedStats } from "./feed";
import { action } from "./_generated/server";

const SORT_VALUES = v.union(
  v.literal("value"),
  v.literal("popularity"),
  v.literal("newest"),
  v.literal("random"),
);

const FILTER_ARGS = {
  platform: v.optional(v.string()),
  type: v.optional(v.string()),
  sortBy: v.optional(SORT_VALUES),
  search: v.optional(v.string()),
};

export const listGiveaways = action({
  args: {
    ...FILTER_ARGS,
    page: v.optional(v.number()),
    pageSize: v.optional(v.number()),
  },
  handler: async (_ctx, args) => {
    return runFeedQuery(args);
  },
});

/** Board-level totals for the dashboard summary tiles. */
export const feedStats = action({
  args: FILTER_ARGS,
  handler: async (_ctx, args) => {
    return runFeedStats(args);
  },
});

/** Landing page hero feed: a handful of the highest-value active offers. */
export const featuredGiveaways = action({
  args: {},
  handler: async () => {
    const { items } = await runFeedQuery({
      sortBy: "value",
      type: "game",
      pageSize: 8,
    });
    return items;
  },
});

export const getGiveaway = action({
  args: { id: v.number() },
  handler: async (_ctx, args) => {
    const { items } = await runFeedQuery({ pageSize: 50 });
    return items.find((item) => item.id === args.id) ?? null;
  },
});
