import { v } from "convex/values";

import { internalMutation } from "./_generated/server";

/**
 * Clearing the deployment.
 *
 * Deliberately internal and deliberately explicit: every table is named, so
 * adding a table without deciding whether it should be wiped is impossible to
 * do by accident. It runs in batches and reports what is left, because a
 * mutation that tries to delete a hundred thousand rows in one transaction
 * fails at the worst moment — half done.
 *
 * Better Auth's own tables are untouched: this clears what the *product* knows
 * about an account, not the credential. Signing in again mints a fresh account
 * through `users.ensure`, which is what "cleared" should mean — not being
 * locked out of your own deployment.
 */

const TABLES = [
  // Everything that hangs off a topic.
  "votes",
  "calls",
  "topicPeeks",
  "topicSkips",
  "comments",
  "topicStats",
  "countryTopicStats",
  "topicSources",
  "topicTags",
  "topics",
  // Everything that hangs off an account.
  "callerStats",
  "creditTransactions",
  "userInterests",
  "userTaste",
  "userCategoryStats",
  "countryChanges",
  "mailLog",
  "users",
  // The record of the machinery itself.
  "ingestSeen",
  "ingestRuns",
  "auditLog",
] as const;

export const wipe = internalMutation({
  args: {
    /** Named explicitly so this cannot be run by reflex. */
    confirm: v.literal("yes-wipe-everything"),
    batch: v.optional(v.number()),
  },
  returns: v.object({
    deleted: v.number(),
    remaining: v.number(),
    done: v.boolean(),
  }),
  handler: async (ctx, args) => {
    const batch = Math.min(args.batch ?? 400, 800);
    let deleted = 0;

    for (const table of TABLES) {
      if (deleted >= batch) break;
      const rows = await ctx.db.query(table).take(batch - deleted);
      for (const row of rows) {
        await ctx.db.delete(table, row._id);
        deleted += 1;
      }
    }

    let remaining = 0;
    for (const table of TABLES) {
      remaining += (await ctx.db.query(table).take(1)).length;
    }

    return { deleted, remaining, done: remaining === 0 };
  },
});

/** What is in here, before anything is deleted. */
export const census = internalMutation({
  args: {},
  returns: v.array(v.object({ table: v.string(), atLeast: v.number() })),
  handler: async (ctx) => {
    const out = [];
    for (const table of TABLES) {
      const rows = await ctx.db.query(table).take(1000);
      out.push({ table, atLeast: rows.length });
    }
    return out.filter((t) => t.atLeast > 0);
  },
});

/**
 * Retire topics the filters should have caught but did not.
 *
 * Archived rather than deleted: the row is the record of what discovery did,
 * and `ingestSeen` still points at it. Archiving takes it out of every feed
 * and every board without pretending it never happened.
 */
export const retire = internalMutation({
  args: { slugs: v.array(v.string()) },
  returns: v.object({ archived: v.number() }),
  handler: async (ctx, args) => {
    let archived = 0;
    for (const slug of args.slugs) {
      const topic = await ctx.db
        .query("topics")
        .withIndex("by_slug", (q) => q.eq("slug", slug))
        .unique();
      if (!topic || topic.status === "archived") continue;
      await ctx.db.patch("topics", topic._id, { status: "archived" });
      await ctx.db.insert("auditLog", {
        actorId: topic.createdBy,
        action: "topic.retired",
        targetType: "topics",
        targetId: topic._id,
        metadata: { reason: "slipped the drafting rules" },
      });
      archived += 1;
    }
    return { archived };
  },
});
