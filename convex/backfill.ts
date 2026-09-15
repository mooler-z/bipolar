import { v } from "convex/values";

import { internalMutation } from "./_generated/server";
import type { Doc, Id } from "./_generated/dataModel";
import { keysOf, step } from "./lib/affinity";

/**
 * Writing down what happened before it was written down.
 *
 * Each of these is idempotent, bounded, and safe to run twice. They exist
 * because the recommender arrived after the votes did: the log it learns from
 * and the replay that proves it both need history, and the history was in
 * three other tables.
 */

/** Stamp tag slugs on every topic written before the field existed. */
export const backfillTagSlugs = internalMutation({
  args: { batch: v.optional(v.number()) },
  returns: v.object({ filled: v.number(), remaining: v.boolean() }),
  handler: async (ctx, args) => {
    const limit = Math.min(args.batch ?? 400, 800);
    // Only the unfilled, or the first page is read forever and the rest never.
    const rows = await ctx.db
      .query("topics")
      .filter((q) => q.eq(q.field("tagSlugs"), undefined))
      .take(limit + 1);
    let filled = 0;
    for (const topic of rows.slice(0, limit)) {
      const links = await ctx.db
        .query("topicTags")
        .withIndex("by_topic", (q) => q.eq("topicId", topic._id))
        .take(8);
      const slugs: string[] = [];
      for (const link of links) {
        const tag = await ctx.db.get("tags", link.tagId);
        if (tag) slugs.push(tag.slug);
      }
      await ctx.db.patch("topics", topic._id, { tagSlugs: slugs });
      filled += 1;
    }
    return { filled, remaining: rows.length > limit };
  },
});

/**
 * Write the acts that happened before acts were written down.
 *
 * Votes, skips and comments predate the interaction log, and the replay that
 * proves the recommender needs history to replay. A skip row carries a count
 * and one timestamp, so it becomes one line rather than `count` lines with
 * invented times. Idempotent: a user-topic-kind already present is left.
 */
export const backfillInteractions = internalMutation({
  args: {},
  returns: v.object({
    votes: v.number(),
    skips: v.number(),
    comments: v.number(),
    replies: v.number(),
    likes: v.number(),
  }),
  handler: async (ctx) => {
    const have = new Set<string>();
    for (const i of await ctx.db.query("interactions").take(6000)) {
      have.add(`${i.userId}:${i.topicId}:${i.kind}`);
    }
    const topics = new Map<string, Doc<"topics">>();
    for (const t of await ctx.db.query("topics").take(1000)) topics.set(t._id, t);

    const write = async (
      userId: Id<"users">,
      topicId: Id<"topics">,
      kind: "vote" | "spark" | "skip" | "comment" | "reply" | "like",
      choice?: "love" | "hate",
    ) => {
      const key = `${userId}:${topicId}:${kind}`;
      const topic = topics.get(topicId);
      if (have.has(key) || !topic) return false;
      have.add(key);
      await ctx.db.insert("interactions", {
        userId,
        topicId,
        kind,
        choice,
        categoryId: topic.categoryId,
        tagSlugs: topic.tagSlugs ?? [],
        scopeCountry: topic.scopeCountry,
      });
      return true;
    };

    let votes = 0;
    for (const row of await ctx.db.query("votes").take(4000)) {
      if (await write(row.userId, row.topicId, row.voteType === "paid" ? "spark" : "vote", row.choice)) votes += 1;
    }
    let skips = 0;
    for (const row of await ctx.db.query("topicSkips").take(4000)) {
      if (await write(row.userId, row.topicId, "skip")) skips += 1;
    }
    /* A reply is not a comment: it costs the same quill and says more, so it
       carries its own strength. Logging every line as a comment would flatten
       the difference the learner exists to notice. */
    let comments = 0;
    let replies = 0;
    for (const row of await ctx.db.query("comments").take(4000)) {
      const kind = row.parentId ? "reply" : "comment";
      if (await write(row.userId, row.topicId, kind)) {
        if (row.parentId) replies += 1;
        else comments += 1;
      }
    }
    let likes = 0;
    for (const row of await ctx.db.query("commentLikes").take(4000)) {
      if (await write(row.userId, row.topicId, "like")) likes += 1;
    }
    return { votes, skips, comments, replies, likes };
  },
});

/** Acts stamped before their topic carried tags get the topic's tags now. */
export const restampInteractions = internalMutation({
  args: {},
  returns: v.object({ restamped: v.number() }),
  handler: async (ctx) => {
    let restamped = 0;
    for (const act of await ctx.db.query("interactions").take(8000)) {
      if (act.tagSlugs.length > 0) continue;
      const topic = await ctx.db.get("topics", act.topicId);
      if (!topic?.tagSlugs?.length) continue;
      await ctx.db.patch("interactions", act._id, { tagSlugs: topic.tagSlugs });
      restamped += 1;
    }
    return { restamped };
  },
});

/**
 * Rebuild every learned weight from the log, in the order things happened.
 * The weights are a cache; the log is the truth. Run after a backfill, or
 * whenever the strengths in `lib/affinity.ts` change.
 */
export const rebuildAffinity = internalMutation({
  args: {},
  returns: v.object({ readers: v.number(), keys: v.number() }),
  handler: async (ctx) => {
    for (const row of await ctx.db.query("userAffinity").take(8000)) {
      await ctx.db.delete("userAffinity", row._id);
    }
    const acts = await ctx.db.query("interactions").take(8000);
    const weights = new Map<string, Map<string, { w: number; n: number }>>();
    for (const act of acts) {
      const mine = weights.get(act.userId) ?? new Map<string, { w: number; n: number }>();
      weights.set(act.userId, mine);
      for (const key of keysOf(act)) {
        const prev = mine.get(key);
        mine.set(key, { w: step(prev?.w, act.kind), n: (prev?.n ?? 0) + 1 });
      }
    }
    let keys = 0;
    for (const [userId, mine] of weights) {
      for (const [key, { w, n }] of mine) {
        await ctx.db.insert("userAffinity", { userId: userId as Id<"users">, key, weight: w, n });
        keys += 1;
      }
    }
    return { readers: weights.size, keys };
  },
});

