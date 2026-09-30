"use node";

/**
 * Digest scheduler.
 *
 * This Convex version has no `cronJobs` builder, so the loop is self-scheduling:
 * `sendDueDigests` runs, then re-arms itself with `ctx.scheduler.runAfter` 24h
 * out. `startDigestScheduler` bootstraps the first run.
 *
 * Runs are idempotent per subscriber because `lastSentAt` advances on every
 * pass, so a retry never re-sends the same batch.
 *
 * This file is Node-only (for `process.env` and the MailerSend fetch), so
 * database access lives in `digestDb.ts` — a "use node" module may only define
 * actions.
 */

import { v } from "convex/values";
import { matchesPlatform, type Giveaway } from "../lib/giveaways";
import { internal } from "./_generated/api";
import { action, internalAction } from "./_generated/server";
import { buildParams, loadThroughCache } from "./feed";
import { sendMail } from "./email";

const DAILY_WINDOW_MS = 26 * 3_600_000; // 24h plus slack for scheduling drift
const WEEKLY_WINDOW_MS = 8 * 24 * 3_600_000;
const MAX_ITEMS_PER_DIGEST = 25;
const REARM_MS = 24 * 3_600_000;

async function loadRecent(windowMs: number): Promise<Giveaway[]> {
  const params = buildParams({ sortBy: "newest" });
  const { data } = await loadThroughCache("digest-feed", params);
  const cutoff = Date.now() - windowMs;
  return data.filter((item) => (item.publishedAt ?? 0) >= cutoff);
}

/** Narrows the shared pool to one subscriber's new, matching offers. */
function selectFor(
  items: Giveaway[],
  prefs: { platforms: string[]; minWorth: number; lastSentAt: number | null },
): Giveaway[] {
  const since = prefs.lastSentAt ?? 0;
  return items
    .filter((item) => {
      if ((item.publishedAt ?? 0) <= since) return false;
      if (prefs.minWorth > 0 && item.worthAmount < prefs.minWorth) return false;
      if (prefs.platforms.length > 0) {
        return prefs.platforms.some((value) =>
          matchesPlatform(item.platforms, value),
        );
      }
      return true;
    })
    .slice(0, MAX_ITEMS_PER_DIGEST);
}

interface DigestRunResult {
  subscribers: number;
  sent: number;
  skipped: number;
  failed: number;
}

export const sendDueDigests = internalAction({
  args: { siteUrl: v.optional(v.string()) },
  // Re-arms itself, so the handler references `sendDueDigests` inside its own
  // initializer. The explicit return type breaks that inference cycle.
  handler: async (ctx, args): Promise<DigestRunResult> => {
    const siteUrl = args.siteUrl ?? "https://grantdrop.app";
    const now = Date.now();

    const subscribers = await ctx.runQuery(
      internal.digestDb.dueSubscribers,
      {},
    );

    let sent = 0;
    let skipped = 0;
    let failed = 0;

    if (subscribers.length > 0) {
      // Read the widest window once; each subscriber's filter narrows it.
      const pool = await loadRecent(WEEKLY_WINDOW_MS);

      for (const subscriber of subscribers) {
        const windowMs =
          subscriber.digest === "daily" ? DAILY_WINDOW_MS : WEEKLY_WINDOW_MS;
        const cutoff = now - windowMs;

        const items = selectFor(
          pool.filter((item) => (item.publishedAt ?? 0) >= cutoff),
          subscriber,
        );

        try {
          if (items.length > 0) {
            const result = await sendMail({
              to: subscriber.email,
              items,
              siteUrl,
              frequency: subscriber.digest,
            });
            if (result.sent) sent += 1;
            else skipped += 1;
          } else {
            skipped += 1;
          }

          // Advance the watermark either way, so the same window isn't
          // re-scanned on every run.
          await ctx.runMutation(internal.digestDb.markSent, {
            id: subscriber.id,
            lastItemId:
              items.length > 0
                ? Math.max(...items.map((item) => item.id))
                : undefined,
          });
        } catch (err) {
          // One undeliverable address must not abort the whole run.
          console.error("[digest] send failed", subscriber.id, err);
          failed += 1;
        }
      }
    }

    // Re-arm for the next pass.
    await ctx.scheduler.runAfter(REARM_MS, internal.digest.sendDueDigests, {
      siteUrl,
    });

    return { subscribers: subscribers.length, sent, skipped, failed };
  },
});

/** Kick off the self-scheduling loop. Safe to call more than once. */
export const startDigestScheduler = action({
  args: { siteUrl: v.optional(v.string()) },
  handler: async (ctx, args) => {
    await ctx.scheduler.runAfter(60_000, internal.digest.sendDueDigests, {
      siteUrl: args.siteUrl,
    });
    return { started: true };
  },
});

/** Dry run: shows what a digest would contain right now. */
export const previewDigest = action({
  args: {
    frequency: v.union(v.literal("daily"), v.literal("weekly")),
    minWorth: v.optional(v.number()),
    platform: v.optional(v.string()),
  },
  handler: async (_ctx, args) => {
    const items = selectFor(
      await loadRecent(
        args.frequency === "daily" ? DAILY_WINDOW_MS : WEEKLY_WINDOW_MS,
      ),
      {
        platforms: args.platform ? [args.platform] : [],
        minWorth: args.minWorth ?? 0,
        lastSentAt: null,
      },
    );

    return {
      count: items.length,
      items: items.map((item) => ({
        id: item.id,
        name: item.name,
        store: item.store,
        worth: item.worth,
        platforms: item.platforms,
      })),
    };
  },
});
