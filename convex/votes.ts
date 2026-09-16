import { v } from "convex/values";

import { PEEK_CENTS } from "./config";
import { mutation } from "./_generated/server";
import { verdictValidator } from "./calls";
import { nudgeTaste } from "./interests";
import { note } from "./interactions";
import { aggregateValidator, aggregateFor } from "./stats";
import { limiter } from "./limits";
import { requireUser } from "./users";
import { castVote, choice, voteType } from "./voteWrite";

/**
 * The vote. Everything else in bipolar exists to get somebody to this
 * mutation and to show them what happened after.
 *
 * The product's central rule — one free and one paid vote per person per
 * topic — has nothing in the database enforcing it, because Convex has no
 * unique index. It is the index read at step 3 below. A mutation is a
 * serializable transaction, so two simultaneous casts cannot both find
 * nothing and both write — but the guarantee is code, and code without a test
 * is a rumour. `votes.test.ts` hammers it.
 *
 * All seven steps are one mutation: the vote, the money, the ledger row, and
 * both sets of counters commit together or not at all. There is no arrangement
 * of failures that takes somebody's spark and does not record their vote.
 *
 * The write itself lives in `voteWrite.ts`, because the Telegram bot votes too
 * and a bot has no session. Two surfaces, one transaction — a second copy of
 * this write is how the central rule ends up enforced in one place only.
 */



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
    return await castVote(ctx, user, args, "web");
  },
});

/**
 * Pay to see without deciding.
 *
 * Permanent, and not a vote: the user's vote rows are untouched, and voting
 * later does not refund it. Two independent acts.
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
