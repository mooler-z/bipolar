import { v } from "convex/values";

import { SIGNUP_GRANT_CENTS, SIGNUP_GRANT_QUILLS } from "./config";
import { keyOf } from "./lib/dedupe";
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
  "interactions",
  "userAffinity",
  "recommendReports",
  "comments",
  "commentLikes",
  "notifications",
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

/**
 * Back to a fresh table, without losing the table.
 *
 * `wipe` clears the deployment. This clears the *play* — every vote, call,
 * comment, peek, skip and ledger row — and leaves the accounts and the
 * questions exactly where they were. It is what "let me test that again"
 * actually means: the same hundred topics, the same sign-in, none of the
 * history.
 *
 * `topicStats` is zeroed rather than deleted, because a topic without one is a
 * topic the importer would have given one. `userInterests` survives, so nobody
 * is marched back through onboarding to test something else. Wallets are
 * refilled to the signup grant and the ledger is given the matching `grant`
 * row, because a balance the ledger cannot explain is the one thing worse than
 * no balance at all.
 */
const PLAY = [
  "votes",
  "calls",
  "topicPeeks",
  "topicSkips",
  "interactions",
  "userAffinity",
  "recommendReports",
  "comments",
  "commentLikes",
  "notifications",
  "countryTopicStats",
  "callerStats",
  "creditTransactions",
  "userTaste",
  "userCategoryStats",
  "countryChanges",
  "auditLog",
] as const;

export const reset = internalMutation({
  args: {
    confirm: v.literal("yes-reset-the-play"),
    batch: v.optional(v.number()),
  },
  returns: v.object({
    deleted: v.number(),
    remaining: v.number(),
    done: v.boolean(),
  }),
  handler: async (ctx, args) => {
    const batch = Math.min(args.batch ?? 500, 800);
    let deleted = 0;

    for (const table of PLAY) {
      if (deleted >= batch) break;
      const rows = await ctx.db.query(table).take(batch - deleted);
      for (const row of rows) {
        await ctx.db.delete(table, row._id);
        deleted += 1;
      }
    }

    let remaining = 0;
    for (const table of PLAY) {
      remaining += (await ctx.db.query(table).take(1)).length;
    }

    // Only once the deletions are done, so a refilled wallet is never left
    // sitting beside a ledger that is still being emptied.
    if (remaining === 0) {
      for (const stats of await ctx.db.query("topicStats").take(1000)) {
        await ctx.db.patch("topicStats", stats._id, {
          freeLove: 0,
          freeHate: 0,
          paidLove: 0,
          paidHate: 0,
          stakedCents: 0,
          skips: 0,
          comments: 0,
        });
      }
      for (const user of await ctx.db.query("users").take(1000)) {
        if (user.authId.startsWith("system:")) continue;
        await ctx.db.patch("users", user._id, {
          walletBalanceCents: SIGNUP_GRANT_CENTS,
          quillBalance: SIGNUP_GRANT_QUILLS,
          topicsBacked: 0,
        });
        await ctx.db.insert("creditTransactions", {
          userId: user._id,
          type: "grant",
          amountCents: SIGNUP_GRANT_CENTS,
        });
      }
    }

    return { deleted, remaining, done: remaining === 0 };
  },
});

/** What is in here, before anything is deleted. */
/**
 * Fill in the question key for everything written before there was one.
 *
 * The duplicate check reads an index, and an index cannot see a field that was
 * never written. Without this, discovery would happily re-ask a question that
 * has been in the feed since the seed — which is exactly the failure the check
 * exists to prevent. Idempotent, bounded, and safe to run twice.
 */
export const reindexQuestions = internalMutation({
  args: { batch: v.optional(v.number()) },
  returns: v.object({ filled: v.number(), remaining: v.boolean() }),
  handler: async (ctx, args) => {
    const limit = Math.min(args.batch ?? 400, 800);
    const rows = await ctx.db.query("topics").take(limit + 1);

    let filled = 0;
    for (const topic of rows.slice(0, limit)) {
      if (topic.questionKey) continue;
      await ctx.db.patch("topics", topic._id, {
        questionKey: keyOf(topic.question),
      });
      filled += 1;
    }
    return { filled, remaining: rows.length > limit };
  },
});

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
