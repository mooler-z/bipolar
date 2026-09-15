import { v } from "convex/values";

import { SPARK_CENTS } from "./config";
import { mutation } from "./_generated/server";
import { audit } from "./admin";
import { retract as retractCall } from "./calls";
import { noteCategoryLean } from "./interests";
import { note } from "./interactions";
import { bumpCounters } from "./stats";
import { requireUser } from "./users";

const choice = v.union(v.literal("love"), v.literal("hate"));
const voteType = v.union(v.literal("free"), v.literal("paid"));

/**
 * Take a vote back, for as long as the run has not moved on.
 *
 * **This is the one exception to "a vote is final", and it is a narrow one.**
 * The reveal opens with a countdown to the next question; while that countdown
 * is running the vote can still be pulled, and the moment it ends the vote is
 * as permanent as it ever was. `RETRACT_MS` is the server's backstop — the
 * countdown pauses on a hover, so the client cannot be trusted to bound the
 * window on its own.
 *
 * Everything the cast wrote comes back out in one transaction, and two of them
 * do **not** come out the way they went in:
 *
 * - **The ledger is still append-only.** The spend row stays exactly where it
 *   was and a `refund` row is written beside it. A ledger that deletes is a
 *   ledger nobody can audit.
 * - **The retraction is recorded.** An `auditLog` row names the voter, the
 *   topic and the side, in the same transaction. A vote that can vanish
 *   without trace is worse than one that cannot vanish at all.
 *
 * The skip counter, the taste weight and the peek are untouched: a taste weight
 * is a decaying cache rather than a tally, and a peek was never part of this.
 */
const RETRACT_MS = 5 * 60_000;

export const vote = mutation({
  args: { topicId: v.id("topics") },
  returns: v.object({
    walletBalanceCents: v.number(),
    /** What was taken back, so the client can put the question back as it was. */
    choice,
    voteType,
  }),
  handler: async (ctx, args) => {
    const user = await requireUser(ctx);

    // The newest vote this person cast here. A topic can hold one free and one
    // paid vote; one press casts one of them, so one press takes one back.
    const votes = await ctx.db
      .query("votes")
      .withIndex("by_user_topic_type", (q) =>
        q.eq("userId", user._id).eq("topicId", args.topicId),
      )
      .take(2);
    const vote = votes.sort((a, b) => b._creationTime - a._creationTime)[0];
    if (!vote) throw new Error("There is no vote here to take back.");
    if (Date.now() - vote._creationTime > RETRACT_MS) {
      throw new Error("That vote is final — the run has moved on.");
    }

    const stake = vote.voteType === "paid" ? SPARK_CENTS : 0;

    // 1. The call the vote carried. Graded against a snapshot, so it is undone
    //    from a snapshot rather than by arithmetic.
    await retractCall(ctx, user._id, args.topicId, vote.choice);

    // 2. Both sets of running totals, back down.
    await bumpCounters(
      ctx,
      args.topicId,
      vote.countryCode,
      vote.voteType,
      vote.choice,
      stake,
      -1,
    );

    // 3. What the ranker learned from the choice.
    const topic = await ctx.db.get("topics", args.topicId);
    if (topic) {
      await noteCategoryLean(ctx, user._id, topic.categoryId, vote.choice, -1);
      await note(ctx, user._id, topic, "undo", vote.choice);
    }

    // 4. The money. The spend row stays; a refund row joins it.
    if (stake > 0) {
      await ctx.db.patch("users", user._id, {
        walletBalanceCents: user.walletBalanceCents + stake,
        topicsBacked: Math.max(0, user.topicsBacked - 1),
      });
      await ctx.db.insert("creditTransactions", {
        userId: user._id,
        type: "refund",
        amountCents: stake,
        topicId: args.topicId,
      });
    }

    // 5. The vote itself, and the record that it was taken back.
    await ctx.db.delete("votes", vote._id);
    await audit(ctx, user._id, "vote.retract", "topic", args.topicId, {
      choice: vote.choice,
      voteType: vote.voteType,
      refundedCents: stake,
    });

    return {
      walletBalanceCents: user.walletBalanceCents + stake,
      choice: vote.choice,
      voteType: vote.voteType,
    };
  },
});

