import { v } from "convex/values";

import { SPARK_CENTS } from "./config";
import type { MutationCtx } from "./_generated/server";
import type { Doc, Id } from "./_generated/dataModel";
import { record as recordCall, verdictValidator } from "./calls";
import { noteCategoryLean, nudgeTaste } from "./interests";
import { note } from "./interactions";
import { aggregateFor, bumpCounters, type Aggregate } from "./stats";

/**
 * The vote transaction, in one place so there is exactly one of it.
 *
 * It moved out of `votes.ts` when the Telegram bot arrived. A bot has no
 * session — it acts for a user it looked up by their Telegram id — so it
 * cannot call the mutation the web calls, and the tempting shortcut is a
 * second copy of the write "just for the bot". That copy is how the product's
 * central rule ends up enforced in one place and not the other.
 *
 * So the mutations are thin: each one decides *who* is voting and from
 * *where*, and both call this. One free and one paid vote per person per
 * topic, the money, the ledger, the call, the ranker and both sets of counters
 * commit together or not at all, whichever surface asked.
 */

export const choice = v.union(v.literal("love"), v.literal("hate"));
export const voteType = v.union(v.literal("free"), v.literal("paid"));
export const source = v.union(v.literal("web"), v.literal("telegram"));

export type Cast = {
  stats: Aggregate;
  walletBalanceCents: number;
  verdict: typeof verdictValidator.type;
};

export async function castVote(
  ctx: MutationCtx,
  user: Doc<"users">,
  args: {
    topicId: Id<"topics">;
    choice: "love" | "hate";
    voteType: "free" | "paid";
    call?: "love" | "hate";
  },
  from: "web" | "telegram",
): Promise<Cast> {
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
      q.eq("userId", user._id).eq("topicId", args.topicId).eq("voteType", args.voteType),
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
  //    knows, never from an argument — a client-chosen country would make the
  //    entire country breakdown fiction.
  const countryCode = user.countryCode ?? "ZZ";
  await ctx.db.insert("votes", {
    userId: user._id,
    topicId: args.topicId,
    voteType: args.voteType,
    choice: args.choice,
    countryCode,
    source: from,
  });

  // 5. The ledger. Append-only, and in this transaction so a spend row cannot
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
    ? await recordCall(ctx, user._id, args.topicId, args.call, args.choice, {
        freeLove: before?.freeLove ?? 0,
        freeHate: before?.freeHate ?? 0,
      })
    : null;

  // 7. What this taught the ranker. Taste is a derived cache and could be
  //    rebuilt from the votes, but it rides in the same transaction so the
  //    very next feed reflects the tap that just happened.
  await nudgeTaste(ctx, user._id, topic.categoryId, "vote");
  await noteCategoryLean(ctx, user._id, topic.categoryId, args.choice);
  await note(ctx, user._id, topic, args.voteType === "paid" ? "spark" : "vote", args.choice);

  // 8 & 9. Both sets of running totals.
  await bumpCounters(ctx, args.topicId, countryCode, args.voteType, args.choice, stake);

  return {
    stats: await aggregateFor(ctx, args.topicId),
    walletBalanceCents: user.walletBalanceCents - stake,
    verdict,
  };
}
