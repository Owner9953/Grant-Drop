/**
 * Notification preferences.
 *
 * Absence of a row means "not subscribed" — the safe default, so a user never
 * receives mail until they have explicitly opted in.
 */

import { getAuthUserId } from "@convex-dev/auth/server";
import { mutation, query } from "./_generated/server";
import { v } from "convex/values";

export const DIGEST_MODES = ["off", "daily", "weekly"] as const;
export type DigestMode = (typeof DIGEST_MODES)[number];

export const getPrefs = query({
  args: {},
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) return null;

    const row = await ctx.db
      .query("notificationPrefs")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .first();

    if (!row) return null;
    return {
      email: row.email ?? null,
      digest: row.digest ?? "off",
      minWorth: row.minWorth ?? 0,
      platforms: row.platforms ?? [],
      lastSentAt: row.lastSentAt ?? null,
    };
  },
});

export const savePrefs = mutation({
  args: {
    email: v.optional(v.string()),
    digest: v.optional(v.union(v.literal("off"), v.literal("daily"), v.literal("weekly"))),
    minWorth: v.optional(v.number()),
    platforms: v.optional(v.array(v.string())),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) {
      throw new Error("You must be signed in to manage notifications.");
    }

    // An email address is mandatory before anything can actually be sent.
    const email = args.email?.trim() || undefined;
    if (args.digest && args.digest !== "off" && !email) {
      throw new Error("Add an email address before turning notifications on.");
    }
    if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      throw new Error("That email address doesn't look right.");
    }

    const existing = await ctx.db
      .query("notificationPrefs")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .first();

    const patch = {
      email,
      digest: args.digest ?? "off",
      minWorth: Math.max(0, args.minWorth ?? 0),
      platforms: args.platforms ?? [],
    };

    if (existing) {
      // Turning notifications off clears the address so nothing is retained.
      await ctx.db.patch(existing._id, {
        ...patch,
        email: patch.digest === "off" ? undefined : patch.email,
      });
      return { saved: true };
    }

    await ctx.db.insert("notificationPrefs", { userId, ...patch });
    return { saved: true };
  },
});
