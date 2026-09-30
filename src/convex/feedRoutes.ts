/**
 * Public, unauthenticated feed endpoints.
 *
 *   GET /api/giveaways.json   full JSON, filterable by the same query params
 *   GET /api/giveaways.xml    RSS 2.0, for readers and feed readers
 *
 * These exist so the board can be piped into Discord, IFTTT or custom dashboards
 * without scraping the UI. They read the same cached feed as the app, and are
 * registered in `http.ts`.
 */

import { httpAction } from "./_generated/server";
import { type FeedQuery, runFeedQuery } from "./feed";
import type { Giveaway } from "../lib/giveaways";

const SORTS = ["value", "popularity", "newest", "random"];

function readQuery(url: URL): FeedQuery {
  const num = (key: string, fallback: number) => {
    const parsed = Number.parseInt(url.searchParams.get(key) ?? "", 10);
    return Number.isFinite(parsed) ? parsed : fallback;
  };

  const sort = url.searchParams.get("sort");
  return {
    platform: url.searchParams.get("platform") ?? "all",
    type: url.searchParams.get("type") ?? undefined,
    search: url.searchParams.get("q") ?? undefined,
    sortBy: (SORTS.includes(sort ?? "") ? sort : "newest") as FeedQuery["sortBy"],
    page: Math.max(1, num("page", 1)),
    pageSize: Math.min(50, Math.max(1, num("limit", 25))),
  };
}

const FEED_HEADERS = {
  // Public by design: this is the integration surface.
  "access-control-allow-origin": "*",
  "cache-control": "public, max-age=300",
};

function escapeXml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

function toRss(items: Giveaway[], siteUrl: string): string {
  const entries = items
    .map((item) => {
      const parts = [
        `      <title>${escapeXml(item.name)}</title>`,
        `      <link>${escapeXml(item.url)}</link>`,
        `      <guid isPermaLink="false">grantdrop-${item.id}</guid>`,
        `      <pubDate>${new Date(item.publishedAt ?? Date.now()).toUTCString()}</pubDate>`,
        `      <description>${escapeXml(item.description)}</description>`,
      ];
      if (item.endsAt !== null) {
        parts.push(
          `      <category>ends ${new Date(item.endsAt).toUTCString()}</category>`,
        );
      }
      return `    <item>\n${parts.join("\n")}\n    </item>`;
    })
    .join("\n");

  return `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom">
  <channel>
    <title>Grantdrop — free game giveaways</title>
    <link>${escapeXml(siteUrl)}</link>
    <atom:link href="${escapeXml(siteUrl)}/api/giveaways.xml" rel="self" type="application/rss+xml" />
    <description>Active free-to-keep game giveaways across every major storefront.</description>
    <language>en</language>
${entries}
  </channel>
</rss>`;
}

export const giveawaysJson = httpAction(async (_ctx, request) => {
  const url = new URL(request.url);
  const result = await runFeedQuery(readQuery(url));

  return new Response(
    JSON.stringify(
      {
        total: result.total,
        page: readQuery(url).page,
        fetchedAt: new Date(result.fetchedAt).toISOString(),
        stale: result.stale,
        items: result.items,
      },
      null,
      2,
    ),
    {
      headers: { ...FEED_HEADERS, "content-type": "application/json; charset=utf-8" },
    },
  );
});

export const giveawaysRss = httpAction(async (_ctx, request) => {
  const url = new URL(request.url);
  const result = await runFeedQuery(readQuery(url));

  return new Response(toRss(result.items, url.origin), {
    headers: { ...FEED_HEADERS, "content-type": "application/rss+xml; charset=utf-8" },
  });
});
