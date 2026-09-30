import { authTables } from "@convex-dev/auth/server";
import { defineSchema, defineTable } from "convex/server";
import { Infer, v } from "convex/values";

// default user roles. can add / remove based on the project as needed
export const ROLES = {
  ADMIN: "admin",
  USER: "user",
  MEMBER: "member",
} as const;

export const roleValidator = v.union(
  v.literal(ROLES.ADMIN),
  v.literal(ROLES.USER),
  v.literal(ROLES.MEMBER),
);
export type Role = Infer<typeof roleValidator>;

const schema = defineSchema(
  {
    // default auth tables using convex auth.
    ...authTables, // do not remove or modify

    // the users table is the default users table that is brought in by the authTables
    users: defineTable({
      name: v.optional(v.string()), // name of the user. do not remove
      image: v.optional(v.string()), // image of the user. do not remove
      email: v.optional(v.string()), // email of the user. do not remove
      emailVerificationTime: v.optional(v.number()), // email verification time. do not remove
      isAnonymous: v.optional(v.boolean()), // is the user anonymous. do not remove

      role: v.optional(roleValidator), // role of the user. do not remove
    }).index("email", ["email"]), // index for the email. do not remove or modify

    // giveaways a user has bookmarked from the feed, kept as a snapshot so the
    // saved library renders instantly without hitting the upstream API.
    savedGiveaways: defineTable({
      userId: v.id("users"),
      giveawayId: v.number(),
      name: v.string(),
      store: v.string(),
      worth: v.string(),
      thumbnail: v.string(),
      // The 460px art alongside the 300px thumb, so library cards stay sharp.
      image: v.optional(v.string()),
      url: v.string(),
      endsAt: v.optional(v.number()),
      savedAt: v.number(),
      // Set once the user actually redeems the offer, so the library can split
      // "still hunting" from "already in my games".
      claimedAt: v.optional(v.number()),
    })
      .index("by_user", ["userId"])
      .index("by_user_and_giveaway", ["userId", "giveawayId"]),

    // Opt-in notification settings. One row per user; the row's absence means
    // "no subscriptions", which is the safe default.
    notificationPrefs: defineTable({
      userId: v.id("users"),
      email: v.optional(v.string()),
      digest: v.optional(v.union(v.literal("off"), v.literal("daily"), v.literal("weekly"))),
      /** Skip offers priced below this. */
      minWorth: v.optional(v.number()),
      /** Restrict the digest to these platform group values. */
      platforms: v.optional(v.array(v.string())),
      /** Last successful digest, so runs stay idempotent. */
      lastSentAt: v.optional(v.number()),
      lastItemId: v.optional(v.number()),
    })
      .index("by_user", ["userId"])
      .index("by_digest", ["digest"]),
  },
  {
    schemaValidation: false,
  },
);

export default schema;
