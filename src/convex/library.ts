/**
 * The signed-in user's saved ("watchlist") giveaways.
 *
 * Rows mirror the live feed entry so the library can render without a second
 * network round trip; the feed itself stays the source of truth for details.
 */

import { getAuthUserId } from "@convex-dev/auth/server";
import { mutation, query } from "./_generated/server";
import { v } from "convex/values";

export const listSaved = query({
  args: {},
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) return [];
    const rows = await ctx.db
      .query("savedGiveaways")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .collect();
    return rows
      .sort((a, b) => b.savedAt - a.savedAt)
      .map((row) => ({
        id: row._id,
        giveawayId: row.giveawayId,
        name: row.name,
        store: row.store,
        worth: row.worth,
        thumbnail: row.thumbnail,
        image: row.image ?? null,
        url: row.url,
        endsAt: row.endsAt ?? null,
        savedAt: row.savedAt,
        claimedAt: row.claimedAt ?? null,
      }));
  },
});

/** Ids only — lets the feed mark saved cards without re-rendering the list. */
export const savedIds = query({
  args: {},
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) return [];
    const rows = await ctx.db
      .query("savedGiveaways")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .collect();
    return rows.map((row) => row.giveawayId);
  },
});

export const toggleSaved = mutation({
  args: {
    giveawayId: v.number(),
    name: v.string(),
    store: v.string(),
    worth: v.string(),
    thumbnail: v.string(),
    image: v.optional(v.string()),
    url: v.string(),
    endsAt: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) {
      throw new Error("You must be signed in to save giveaways.");
    }

    const existing = await ctx.db
      .query("savedGiveaways")
      .withIndex("by_user_and_giveaway", (q) =>
        q.eq("userId", userId).eq("giveawayId", args.giveawayId),
      )
      .first();

    if (existing) {
      await ctx.db.delete(existing._id);
      return { saved: false };
    }

    await ctx.db.insert("savedGiveaways", {
      userId,
      giveawayId: args.giveawayId,
      name: args.name,
      store: args.store,
      worth: args.worth,
      thumbnail: args.thumbnail,
      image: args.image,
      url: args.url,
      endsAt: args.endsAt,
      savedAt: Date.now(),
    });
    return { saved: true };
  },
});

/** Moves a saved offer into (or back out of) the Claimed state. */
export const setClaimed = mutation({
  args: {
    giveawayId: v.number(),
    claimed: v.boolean(),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) {
      throw new Error("You must be signed in to update your library.");
    }
    const row = await ctx.db
      .query("savedGiveaways")
      .withIndex("by_user_and_giveaway", (q) =>
        q.eq("userId", userId).eq("giveawayId", args.giveawayId),
      )
      .first();

    if (!row) {
      // Marking something claimed that was never saved is a no-op rather than
      // an error: the client shouldn't have to sequence the two calls.
      return { updated: false };
    }

    if (args.claimed) {
      await ctx.db.patch(row._id, { claimedAt: row.claimedAt ?? Date.now() });
    } else {
      await ctx.db.patch(row._id, { claimedAt: undefined });
    }
    return { updated: true };
  },
});

export const clearExpired = mutation({
  args: {},
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) return { removed: 0 };
    const rows = await ctx.db
      .query("savedGiveaways")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .collect();
    const now = Date.now();
    let removed = 0;
    for (const row of rows) {
      if (row.endsAt !== undefined && row.endsAt < now) {
        await ctx.db.delete(row._id);
        removed += 1;
      }
    }
    return { removed };
  },
});
