import { v } from "convex/values";

import { PEEK_CENTS, SPARK_CENTS } from "./config";
import { mutation } from "./_generated/server";
import { record as recordCall, verdictValidator } from "./calls";
import { noteCategoryLean, nudgeTaste } from "./interests";
import { note } from "./interactions";
import { aggregateValidator, aggregateFor, bumpCounters } from "./stats";
import { limiter } from "./limits";
import { requireUser } from "./users";

/**
 * The vote. Everything else in bipolar exists to get somebody to this
 * mutation and to show them what happened after.
 *
 * Postgres enforced the product's central rule with
 * `UNIQUE(user_id, topic_id, vote_type)`. Convex has no unique index, so the
 * rule is the index read at step 3 below. A Convex mutation is a serializable
 * transaction, so two simultaneous casts cannot both find nothing and both
 * write — but the guarantee is code now, and code without a test is a rumour.
 * `votes.test.ts` hammers it.
 *
 * All seven steps are one mutation: the vote, the money, the ledger row, and
 * both sets of counters commit together or not at all. There is no arrangement
 * of failures that takes somebody's spark and does not record their vote.
 */

const choice = v.union(v.literal("love"), v.literal("hate"));
const voteType = v.union(v.literal("free"), v.literal("paid"));

export const cast = mutation({
  args: {
    topicId: v.id("topics"),
    choice,
    voteType,
    /**
     * Which way the voter thinks the crowd went. Optional, and carried on the
     * vote rather than sent afterwards on purpose: a separate call would let a
     * reader take the vote, read the result it unlocks, and then "predict" a
     * room they had already seen.
     */
    call: v.optional(choice),
  },
  returns: v.object({
    /** The reader has now earned the aggregate, so it comes back with the vote. */
    stats: aggregateValidator,
    walletBalanceCents: v.number(),
    /** Null when the room was too small to read, or already called. */
    verdict: verdictValidator,
  }),
  handler: async (ctx, args) => {
    const user = await requireUser(ctx);
    await limiter.limit(ctx, "vote", { key: user._id, throws: true });

    // 1. The topic must be open.
    const topic = await ctx.db.get("topics", args.topicId);
    if (!topic) throw new Error("No such topic.");
    if (topic.status !== "active") throw new Error("This topic is not open.");
    if (topic.isLocked) throw new Error("Voting on this topic is frozen.");
    if (topic.closesAt !== undefined && topic.closesAt <= Date.now()) {
      throw new Error("Voting on this topic has closed.");
    }

    // 2. One free and one paid vote per person per topic. The rule.
    const already = await ctx.db
      .query("votes")
      .withIndex("by_user_topic_type", (q) =>
        q
          .eq("userId", user._id)
          .eq("topicId", args.topicId)
          .eq("voteType", args.voteType),
      )
      .unique();
    if (already) {
      throw new Error(
        args.voteType === "paid"
          ? "You have already backed this topic."
          : "You have already voted on this topic.",
      );
    }

    // 3. The money, before anything is written. A wallet at zero cannot vote.
    const stake = args.voteType === "paid" ? SPARK_CENTS : 0;
    if (stake > 0) {
      if (user.walletBalanceCents < stake) {
        throw new Error("Not enough credit. Top up to back a topic.");
      }
      await ctx.db.patch("users", user._id, {
        walletBalanceCents: user.walletBalanceCents - stake,
        // One more topic backed. A paid vote is one per topic, so this cannot
        // double-count: the uniqueness check above already refused a repeat.
        topicsBacked: user.topicsBacked + 1,
      });
    }

    // 4. The vote itself. Country and source are stamped from what the server
    //    knows, never from an argument — a client-chosen country would make
    //    the entire country breakdown fiction.
    const countryCode = user.countryCode ?? "ZZ";
    await ctx.db.insert("votes", {
      userId: user._id,
      topicId: args.topicId,
      voteType: args.voteType,
      choice: args.choice,
      countryCode,
      source: "web",
    });

    // 5. The ledger. Append-only, and in this mutation so a spend row cannot
    //    exist without its vote or a vote without its spend row.
    if (stake > 0) {
      await ctx.db.insert("creditTransactions", {
        userId: user._id,
        type: "spend",
        amountCents: -stake,
        topicId: args.topicId,
      });
    }

    // 6. The call, graded against the crowd **as it stood a moment ago** — the
    //    room this voter is about to join, not the one they just moved.
    const before = await ctx.db
      .query("topicStats")
      .withIndex("by_topic", (q) => q.eq("topicId", args.topicId))
      .unique();
    const verdict = args.call
      ? await recordCall(
          ctx,
          user._id,
          args.topicId,
          args.call,
          args.choice,
          {
            freeLove: before?.freeLove ?? 0,
            freeHate: before?.freeHate ?? 0,
          },
        )
      : null;

    // 7. What this taught the ranker. Taste is a derived cache and could be
    //    rebuilt from the votes, but it rides in the same transaction so the
    //    very next feed reflects the tap that just happened.
    await nudgeTaste(ctx, user._id, topic.categoryId, "vote");
    await noteCategoryLean(ctx, user._id, topic.categoryId, args.choice);
    await note(ctx, user._id, topic, args.voteType === "paid" ? "spark" : "vote", args.choice);

    // 8 & 9. Both sets of running totals.
    await bumpCounters(
      ctx,
      args.topicId,
      countryCode,
      args.voteType,
      args.choice,
      stake,
    );

    return {
      stats: await aggregateFor(ctx, args.topicId),
      walletBalanceCents: user.walletBalanceCents - stake,
      verdict,
    };
  },
});

/**
 * Pay to see without deciding.
 *
 * Permanent, and not a vote: the user's vote rows are untouched, and voting
 * later does not refund it. Two independent acts, as in the original.
 */
export const peek = mutation({
  args: { topicId: v.id("topics") },
  returns: v.object({
    stats: aggregateValidator,
    walletBalanceCents: v.number(),
  }),
  handler: async (ctx, args) => {
    const user = await requireUser(ctx);

    const topic = await ctx.db.get("topics", args.topicId);
    if (!topic) throw new Error("No such topic.");

    // Already paid, or already voted: give the numbers, charge nothing. A
    // second charge for something the reader can already see is a bug that
    // looks exactly like a scam.
    const paid = await ctx.db
      .query("topicPeeks")
      .withIndex("by_user_topic", (q) =>
        q.eq("userId", user._id).eq("topicId", args.topicId),
      )
      .unique();
    const voted = await ctx.db
      .query("votes")
      .withIndex("by_user_topic_type", (q) =>
        q.eq("userId", user._id).eq("topicId", args.topicId),
      )
      .first();
    if (paid || voted) {
      return {
        stats: await aggregateFor(ctx, args.topicId),
        walletBalanceCents: user.walletBalanceCents,
      };
    }

    if (user.walletBalanceCents < PEEK_CENTS) {
      throw new Error("Not enough credit to peek.");
    }

    await ctx.db.patch("users", user._id, {
      walletBalanceCents: user.walletBalanceCents - PEEK_CENTS,
    });
    await ctx.db.insert("topicPeeks", {
      userId: user._id,
      topicId: args.topicId,
      amountCents: PEEK_CENTS,
    });
    await note(ctx, user._id, topic, "peek");
    await ctx.db.insert("creditTransactions", {
      userId: user._id,
      type: "peek",
      amountCents: -PEEK_CENTS,
      topicId: args.topicId,
    });

    return {
      stats: await aggregateFor(ctx, args.topicId),
      walletBalanceCents: user.walletBalanceCents - PEEK_CENTS,
    };
  },
});

/**
 * Not interested. Unlike a vote, a skip repeats — the second one says more
 * than the first, so the count climbs rather than the row being rewritten.
 */
export const skip = mutation({
  args: { topicId: v.id("topics") },
  returns: v.null(),
  handler: async (ctx, args) => {
    const user = await requireUser(ctx);

    const existing = await ctx.db
      .query("topicSkips")
      .withIndex("by_user_topic", (q) =>
        q.eq("userId", user._id).eq("topicId", args.topicId),
      )
      .unique();
    if (existing) {
      await ctx.db.patch("topicSkips", existing._id, {
        count: existing.count + 1,
      });
    } else {
      await ctx.db.insert("topicSkips", {
        userId: user._id,
        topicId: args.topicId,
        count: 1,
      });
    }

    const totals = await ctx.db
      .query("topicStats")
      .withIndex("by_topic", (q) => q.eq("topicId", args.topicId))
      .unique();
    if (totals) {
      await ctx.db.patch("topicStats", totals._id, { skips: totals.skips + 1 });
    }

    const skipped = await ctx.db.get("topics", args.topicId);
    if (skipped) await note(ctx, user._id, skipped, "skip");

    // A skip is a signal, not an absence of one: it pulls the category's taste
    // weight down, which is the whole reason skipping is worth recording.
    const topic = await ctx.db.get("topics", args.topicId);
    if (topic) await nudgeTaste(ctx, user._id, topic.categoryId, "skip");
    return null;
  },
});
