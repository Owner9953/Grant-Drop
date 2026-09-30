/**
 * Database access for the digest run.
 *
 * Split out of `digest.ts` because that file opts into the Node runtime for
 * `process.env`, and a `"use node"` module may only define actions.
 */

import { v } from "convex/values";
import { internalMutation, internalQuery } from "./_generated/server";

export const dueSubscribers = internalQuery({
  args: {},
  handler: async (ctx) => {
    const rows = await ctx.db.query("notificationPrefs").collect();
    return rows
      .filter(
        (row) =>
          (row.digest === "daily" || row.digest === "weekly") &&
          Boolean(row.email),
      )
      .map((row) => ({
        id: row._id,
        email: row.email as string,
        digest: row.digest as "daily" | "weekly",
        minWorth: row.minWorth ?? 0,
        platforms: row.platforms ?? [],
        lastSentAt: row.lastSentAt ?? null,
      }));
  },
});

export const markSent = internalMutation({
  args: {
    id: v.id("notificationPrefs"),
    lastItemId: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    await ctx.db.patch(args.id, {
      lastSentAt: Date.now(),
      lastItemId: args.lastItemId,
    });
  },
});
