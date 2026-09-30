/**
 * In-app giveaway alerts.
 *
 * Alerts are delivered inside Grantdrop in the browser only — a bell badge in
 * the header and a toast while you have the app open. There is no email, no SMS
 * and no push service worker, so there is no provider, API key or unsubscribe
 * list to maintain. Absence of a row means "not opted in".
 */

import { getAuthUserId } from "@convex-dev/auth/server";
import { v } from "convex/values";
import { matchesPlatform, type Giveaway } from "../lib/giveaways";
import { internal } from "./_generated/api";
import { action, internalQuery, mutation, query } from "./_generated/server";
import { buildParams, loadThroughCache } from "./feed";

export const getPrefs = query({
  args: {},
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) return null;

    const row = await ctx.db
      .query("notificationPrefs")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .first();

    if (!row) {
      return {
        browserEnabled: false,
        minWorth: 0,
        platforms: [] as string[],
        lastSeenAt: null as number | null,
      };
    }
    return {
      browserEnabled: row.browserEnabled ?? false,
      minWorth: row.minWorth ?? 0,
      platforms: row.platforms ?? [],
      lastSeenAt: row.lastSeenAt ?? null,
    };
  },
});

export const savePrefs = mutation({
  args: {
    browserEnabled: v.optional(v.boolean()),
    minWorth: v.optional(v.number()),
    platforms: v.optional(v.array(v.string())),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) {
      throw new Error("You must be signed in to manage alerts.");
    }

    const existing = await ctx.db
      .query("notificationPrefs")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .first();

    const patch: {
      browserEnabled: boolean;
      minWorth: number;
      platforms: string[];
      lastSeenAt?: number;
    } = {
      browserEnabled: args.browserEnabled ?? false,
      minWorth: Math.max(0, args.minWorth ?? 0),
      platforms: args.platforms ?? [],
    };

    // Seed the watermark the moment alerts are switched on. Without this, the
    // first check would treat the whole live board as new and greet the user
    // with a hundred notifications for offers that were already listed.
    if (patch.browserEnabled && (existing?.lastSeenAt ?? 0) === 0) {
      patch.lastSeenAt = Date.now();
    }

    if (existing) {
      await ctx.db.patch(existing._id, patch);
    } else {
      await ctx.db.insert("notificationPrefs", { userId, ...patch });
    }
    return { saved: true };
  },
});

/** Raw prefs row for the action below; actions have no `ctx.db` of their own. */
export const prefsForAction = internalQuery({
  args: {},
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) return null;
    const row = await ctx.db
      .query("notificationPrefs")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .first();
    if (!row?.browserEnabled) return null;
    return {
      platforms: row.platforms ?? [],
      minWorth: row.minWorth ?? 0,
      lastSeenAt: row.lastSeenAt ?? 0,
    };
  },
});

/**
 * Giveaways published since the user's watermark and matching their filters.
 *
 * An action rather than a query because it also needs the upstream feed, which
 * only actions can fetch.
 */
interface NewItemsResult {
  items: Giveaway[];
  newestAt: number;
  /** True when nothing should be announced, e.g. right after opting in. */
  quiet: boolean;
}

export const newSinceLastVisit = action({
  args: {},
  // `internal.notifications.*` includes this function, so the reference inside
  // its own initializer forms a cycle. The explicit return type breaks it.
  handler: async (ctx): Promise<NewItemsResult> => {
    const prefs = await ctx.runQuery(internal.notifications.prefsForAction, {});
    if (!prefs) return { items: [], newestAt: 0, quiet: true };

    const params = buildParams({ sortBy: "newest" });
    const { data } = await loadThroughCache("digest-feed", params);

    const newestAt = data.reduce(
      (max, item) => Math.max(max, item.publishedAt ?? 0),
      prefs.lastSeenAt,
    );

    // No watermark yet means the user only just turned alerts on, so the whole
    // board counts as "new". Baseline it silently and announce nothing.
    if (prefs.lastSeenAt === 0) return { items: [], newestAt, quiet: true };

    const items: Giveaway[] = data.filter((item: Giveaway) => {
      if ((item.publishedAt ?? 0) <= prefs.lastSeenAt) return false;
      if (prefs.minWorth > 0 && item.worthAmount < prefs.minWorth) return false;
      if (prefs.platforms.length > 0) {
        return prefs.platforms.some((value: string) =>
          matchesPlatform(item.platforms, value),
        );
      }
      return true;
    });

    return { items, newestAt, quiet: false };
  },
});

/** Advances the watermark so the same batch isn't announced twice. */
export const markSeen = mutation({
  args: { at: v.number() },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) return { saved: false };

    const existing = await ctx.db
      .query("notificationPrefs")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .first();

    // Never move the watermark backwards.
    const next = Math.max(args.at, existing?.lastSeenAt ?? 0);
    if (existing) {
      await ctx.db.patch(existing._id, { lastSeenAt: next });
    } else {
      await ctx.db.insert("notificationPrefs", { userId, lastSeenAt: next });
    }
    return { saved: true };
  },
});

/**
 * Drops the user's alert preferences and watermark entirely, so switching alerts
 * off leaves nothing behind and a later opt-in starts from a clean baseline.
 */
export const clearPrefs = mutation({
  args: {},
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) return { cleared: false };

    const existing = await ctx.db
      .query("notificationPrefs")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .first();
    if (!existing) return { cleared: false };

    await ctx.db.delete(existing._id);
    return { cleared: true };
  },
});
