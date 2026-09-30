/**
 * Shared types and helpers for the GamerPower free-giveaway feed.
 * Safe to import from both the Convex backend and the browser (no DOM APIs).
 */

export interface Giveaway {
  id: number;
  title: string;
  /** Title with the trailing "Giveaway" suffix and store suffix removed. */
  name: string;
  /** Store / platform the offer is redeemed on, e.g. "Steam". */
  store: string;
  worth: string;
  worthAmount: number;
  thumbnail: string;
  image: string;
  description: string;
  instructions: string;
  url: string;
  platforms: string[];
  drmFree: boolean;
  /** Epoch ms of the deadline, or null when the feed reports "N/A". */
  endsAt: number | null;
  endsAtRaw: string;
  publishedAt: number | null;
  users: number;
  type: string;
  status: string;
}

export const GIVEAWAY_TYPES = ["Game", "DLC", "Loot", "Soundtrack"] as const;
export type GiveawayType = (typeof GIVEAWAY_TYPES)[number];

export const GIVEAWAY_SORTS = [
  { value: "newest", label: "Newest first" },
  { value: "value", label: "Most valuable" },
  { value: "popularity", label: "Most popular" },
  { value: "random", label: "Surprise me" },
] as const;

export interface PlatformGroup {
  value: string;
  label: string;
  /**
   * Tokens matched (case-insensitively) against each entry of a giveaway's
   * `platforms` array, e.g. "Xbox" covers Xbox 360 / One / Series X|S.
   */
  match: string[];
}

/**
 * The platform taxonomy used by the feed itself. GamerPower's `platform=` query
 * param only accepts five slugs and 404s on the rest, so the browser-facing
 * filters are matched against the `platforms` field on the data instead.
 */
export const PLATFORM_GROUPS: PlatformGroup[] = [
  { value: "all", label: "All platforms", match: [] },
  { value: "pc", label: "PC", match: ["pc"] },
  { value: "steam", label: "Steam", match: ["steam"] },
  { value: "epic", label: "Epic Games Store", match: ["epic"] },
  { value: "gog", label: "GOG", match: ["gog"] },
  { value: "itchio", label: "itch.io", match: ["itch.io"] },
  { value: "xbox", label: "Xbox", match: ["xbox"] },
  { value: "playstation", label: "PlayStation", match: ["playstation"] },
  { value: "nintendo", label: "Nintendo", match: ["nintendo"] },
  { value: "android", label: "Android", match: ["android"] },
  { value: "ios", label: "iOS", match: ["ios"] },
  { value: "drm-free", label: "DRM-Free", match: ["drm-free"] },
];

/** Group -> the subset the upstream `platform=` param actually accepts. */
export const UPSTREAM_PLATFORM_SLUGS: Record<string, string> = {
  steam: "steam",
  epic: "epic-games-store",
  gog: "gog",
  itchio: "itchio",
  android: "android",
};

export function matchesPlatform(
  platforms: string[],
  groupValue: string,
): boolean {
  if (!groupValue || groupValue === "all") return true;
  const group = PLATFORM_GROUPS.find((item) => item.value === groupValue);
  if (!group) return true;
  return platforms.some((entry) =>
    group.match.some((token) => entry.toLowerCase().includes(token)),
  );
}

/** Matches the trailing store suffix: "Title (itch.io) Giveaway", "Title (Steam) Key Giveaway". */
const STORE_SUFFIX = /\s*\(([^)]+)\)[^()]*\s*Giveaway\s*$/i;

/** "Express No. 6 (itch.io) Giveaway" -> "Express No. 6" */
export function cleanTitle(title: string): string {
  return title
    .replace(STORE_SUFFIX, "")
    .replace(/\s*Giveaway\s*$/i, "")
    .trim();
}

/** Pulls the store name out of the parenthesised suffix, e.g. "Steam". */
export function extractStore(title: string, platforms: string): string {
  const match = title.match(STORE_SUFFIX);
  if (match) return match[1].trim();
  const first = platforms.split(",")[0]?.trim();
  return first && first !== "PC" ? first : "Direct";
}

/** "$14.99" -> 14.99, "N/A" -> 0 */
export function parseWorth(worth: string): number {
  const value = Number.parseFloat((worth ?? "").replace(/[^0-9.]/g, ""));
  return Number.isFinite(value) ? value : 0;
}

export function formatWorth(worth: string, amount: number): string {
  if (amount > 0) return worth || `$${amount.toFixed(2)}`;
  return "Valued deal";
}

/** True while an offer is newly published — drives the "Just in" badge. */
export function isFreshGiveaway(
  publishedAt: number | null,
  now = Date.now(),
): boolean {
  if (publishedAt === null) return false;
  const age = now - publishedAt;
  return age >= 0 && age < 48 * 3_600_000;
}

export function msRemaining(endsAt: number | null, now = Date.now()): number | null {
  if (endsAt === null) return null;
  return endsAt - now;
}

/** "3d 4h" / "5h 12m" / "42m" / "Expired" */
export function formatCountdown(endsAt: number | null, now = Date.now()): string {
  const remaining = msRemaining(endsAt, now);
  if (remaining === null) return "No deadline";
  if (remaining <= 0) return "Expired";
  const days = Math.floor(remaining / 86_400_000);
  const hours = Math.floor((remaining % 86_400_000) / 3_600_000);
  const minutes = Math.floor((remaining % 3_600_000) / 60_000);
  if (days > 0) return `${days}d ${hours}h left`;
  if (hours > 0) return `${hours}h ${minutes}m left`;
  return `${minutes}m left`;
}

/**
 * Rough 0-100 measure of how much runway an offer has, for the card meter.
 *
 * Deliberately not a true percentage of the offer window: a full-length deal
 * can run for months, so anything under ~21 days left reads as "running out"
 * and the bar fills down from there. It communicates pressure, not precision.
 */
export function remainingFraction(endsAt: number, now = Date.now()): number {
  const remaining = endsAt - now;
  if (remaining <= 0) return 0;
  const METER_WINDOW_MS = 21 * 24 * 3_600_000;
  return Math.max(4, Math.min(100, (remaining / METER_WINDOW_MS) * 100));
}

export type Urgency = "none" | "normal" | "warning" | "critical";

/**
 * Three tiers plus "no deadline", driving the countdown colour:
 * under 24h is amber, under 6h is red.
 */
export function urgencyLevel(endsAt: number | null, now = Date.now()): Urgency {
  if (endsAt === null) return "none";
  const remaining = endsAt - now;
  if (remaining <= 0) return "none";
  if (remaining < 6 * 3_600_000) return "critical";
  if (remaining < 24 * 3_600_000) return "warning";
  return "normal";
}

/** Tailwind text colour for a countdown urgency tier. */
export const URGENCY_TEXT: Record<Urgency, string> = {
  none: "text-muted-foreground",
  normal: "text-muted-foreground",
  warning: "text-amber-600 dark:text-amber-400",
  critical: "text-destructive",
};

export function compactNumber(value: number): string {
  if (value >= 1_000_000) return `${(value / 1_000_000).toFixed(1).replace(/\.0$/, "")}m`;
  if (value >= 1_000) return `${(value / 1_000).toFixed(1).replace(/\.0$/, "")}k`;
  return String(value);
}

/** Strips the "Giveaway" boilerplate from the feed's description sentence. */
export function tidyDescription(description: string): string {
  if (!description) return "";
  return description
    .replace(/\s*(to get)?\s*free via .*$/i, "")
    .replace(/\s+/g, " ")
    .trim();
}

/**
 * True when a description is a cut-off fragment rather than a sentence.
 *
 * The feed regularly truncates these mid-clause — "Download Express No. 6 for"
 * — and rendering the stub reads like a broken page rather than missing data.
 */
export function isFragment(text: string): boolean {
  if (text.length < 24) return true;
  const dangling = /\b(for|the|a|an|on|in|to|at|of|with|from|and|or|by)$/i;
  return dangling.test(text);
}

/**
 * Removes the numbering the feed already bakes into `instructions`.
 *
 * The step list renders its own numbered marker, so leaving the upstream
 * "1." in place doubles it: "1. 1. Click the Get Giveaway button".
 */
export function stripStepNumber(step: string): string {
  return step.replace(/^\s*(?:step\s*)?\d+[.):-]?\s*/i, "").trim() || step.trim();
}
