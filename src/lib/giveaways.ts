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
  { value: "value", label: "Most valuable" },
  { value: "popularity", label: "Most popular" },
  { value: "newest", label: "Newest" },
  { value: "random", label: "Surprise me" },
] as const;

export interface PlatformFilter {
  value: string;
  label: string;
}

export const PLATFORM_FILTERS: PlatformFilter[] = [
  { value: "all", label: "All stores" },
  { value: "steam", label: "Steam" },
  { value: "epic-games-store", label: "Epic Games" },
  { value: "gog", label: "GOG" },
  { value: "itchio", label: "itch.io" },
  { value: "ubisoft-connect", label: "Ubisoft" },
  { value: "ea-app", label: "EA App" },
  { value: "xbox-game-pass", label: "Game Pass" },
  { value: "playstation", label: "PlayStation" },
  { value: "nintendo", label: "Nintendo" },
  { value: "itunes", label: "iTunes" },
  { value: "android", label: "Android" },
];

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

/** Fraction of the offer window already elapsed, for the urgency meter. */
export function urgencyLevel(endsAt: number | null, now = Date.now()): "none" | "low" | "high" {
  if (endsAt === null) return "none";
  const remaining = endsAt - now;
  if (remaining <= 0) return "none";
  if (remaining < 24 * 3_600_000) return "high";
  return "low";
}

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
