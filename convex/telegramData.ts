import { v } from "convex/values";

import { internalMutation, internalQuery } from "./_generated/server";
import type { Id } from "./_generated/dataModel";
import { note } from "./interactions";
import { nudgeTaste } from "./interests";
import { rankedFeed } from "./feedRank";
import { toCard } from "./topics";
import { castVote } from "./voteWrite";

/**
 * What the bot reads and writes.
 *
 * All internal: a bot has no session, so every one of these takes the user it
 * is acting for explicitly, and the only thing that decides that user is the
 * Telegram id on a webhook delivery Telegram signed with our secret. Nothing
 * here is callable from a browser.
 *
 * They are queries and mutations rather than one big action because a Convex
 * action cannot touch the database — it calls these. That split is also what
 * keeps the vote a real transaction: the bot's network round trip happens
 * either side of it, never inside it.
 */

const ballot = v.object({
  topicId: v.id("topics"),
  question: v.string(),
  slug: v.string(),
  categoryName: v.string(),
  voteCount: v.number(),
  imageUrl: v.union(v.null(), v.string()),
});

/** The next question for this reader, from the same ranker the web serves. */
export const nextBallot = internalQuery({
  args: { userId: v.id("users") },
  returns: v.union(v.null(), ballot),
  handler: async (ctx, args) => {
    const user = await ctx.db.get("users", args.userId);
    if (!user) return null;

    /* A short slice: the bot deals one card, so the ranker only has to be
       right about the top of the list. `now` moves so freshness is scored
       rather than frozen at zero. */
    const cards = await rankedFeed(ctx, user, { limit: 3, now: Date.now() }, toCard);
    const next = cards[0];
    if (!next) return null;

    return {
      topicId: next._id,
      question: next.question,
      slug: next.slug,
      categoryName: next.categorySlug,
      voteCount: next.voteCount,
      imageUrl: next.imageUrl ?? null,
    };
  },
});

/**
 * A vote from the chat.
 *
 * Free, always: the bot never spends a wallet. Sparks are a deliberate act
 * with money attached and a two-tap inline keyboard is not where that belongs.
 * Everything else is the web's transaction exactly — same rule, same ledger,
 * same counters — stamped `telegram` so the two surfaces stay tellable apart.
 */
export const castFor = internalMutation({
  args: {
    userId: v.id("users"),
    topicId: v.id("topics"),
    choice: v.union(v.literal("love"), v.literal("hate")),
  },
  returns: v.union(
    v.object({ ok: v.literal(true), freeLove: v.number(), freeHate: v.number() }),
    v.object({ ok: v.literal(false), why: v.string() }),
  ),
  handler: async (ctx, args) => {
    const user = await ctx.db.get("users", args.userId);
    if (!user) return { ok: false as const, why: "Not connected." };
    if (user.isBanned) return { ok: false as const, why: "This account cannot vote." };

    try {
      const out = await castVote(
        ctx,
        user,
        { topicId: args.topicId, choice: args.choice, voteType: "free" },
        "telegram",
      );
      return { ok: true as const, freeLove: out.stats.freeLove, freeHate: out.stats.freeHate };
    } catch (err) {
      /* Returned rather than thrown: the caller is a webhook, and a throw
         there makes Telegram redeliver the same tap forever. */
      return { ok: false as const, why: (err as Error).message };
    }
  },
});

/** A skip from the chat. Same signal the web writes — it is not an absence. */
export const skipFor = internalMutation({
  args: { userId: v.id("users"), topicId: v.id("topics") },
  returns: v.null(),
  handler: async (ctx, args) => {
    const existing = await ctx.db
      .query("topicSkips")
      .withIndex("by_user_topic", (q) =>
        q.eq("userId", args.userId).eq("topicId", args.topicId),
      )
      .unique();
    if (existing) {
      await ctx.db.patch("topicSkips", existing._id, { count: existing.count + 1 });
    } else {
      await ctx.db.insert("topicSkips", {
        userId: args.userId,
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

    const topic = await ctx.db.get("topics", args.topicId);
    if (topic) {
      await note(ctx, args.userId, topic, "skip");
      await nudgeTaste(ctx, args.userId, topic.categoryId, "skip");
    }
    return null;
  },
});

/** The last few this person answered, newest first. */
export const recentVotes = internalQuery({
  args: { userId: v.id("users"), limit: v.optional(v.number()) },
  returns: v.array(
    v.object({
      question: v.string(),
      slug: v.string(),
      choice: v.string(),
      at: v.number(),
    }),
  ),
  handler: async (ctx, args) => {
    const rows = await ctx.db
      .query("votes")
      .withIndex("by_user", (q) => q.eq("userId", args.userId))
      .order("desc")
      .take(Math.min(args.limit ?? 8, 20));

    const out = [];
    for (const row of rows) {
      const topic = await ctx.db.get("topics", row.topicId as Id<"topics">);
      if (!topic) continue;
      out.push({
        question: topic.question,
        slug: topic.slug,
        choice: row.choice,
        at: row._creationTime,
      });
    }
    return out;
  },
});

/** The record, as the bot prints it. The crowd's lean only — never the layers. */
export const myStats = internalQuery({
  args: { userId: v.id("users") },
  returns: v.object({
    votes: v.number(),
    love: v.number(),
    hate: v.number(),
    streak: v.number(),
    accuracy: v.union(v.null(), v.number()),
  }),
  handler: async (ctx, args) => {
    // Bounded: this is a chat line, not an accounting report.
    const rows = await ctx.db
      .query("votes")
      .withIndex("by_user", (q) => q.eq("userId", args.userId))
      .take(500);
    const love = rows.filter((r) => r.choice === "love").length;

    const caller = await ctx.db
      .query("callerStats")
      .withIndex("by_user", (q) => q.eq("userId", args.userId))
      .unique();

    return {
      votes: rows.length,
      love,
      hate: rows.length - love,
      streak: caller?.streak ?? 0,
      accuracy:
        caller && caller.graded > 0
          ? Math.round((caller.right / caller.graded) * 100)
          : null,
    };
  },
});
