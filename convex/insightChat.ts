import { v } from "convex/values";

import { api, internal } from "./_generated/api";
import { action, internalMutation, mutation, query } from "./_generated/server";
import { limiter } from "./limits";
import { plan as route } from "./lib/insight";
import { block, build, type Block } from "./insightViews";
import { currentUser, requireUser } from "./users";

/**
 * Asking the boards a question, and keeping what was said.
 *
 * Two halves with different rules, and it is worth being exact about which is
 * which because "an AI button" is a thing readers are right to be suspicious
 * of.
 *
 * **The model cannot touch the product's data.** It is handed the list of
 * countries that have votes and the question; it returns which of six views to
 * draw. It never receives a topic's split, never receives anybody's identity,
 * and never emits a figure — every number on screen is read from the public
 * board by `insightViews.ts` afterwards. The worst a wrong answer can be is
 * the wrong chart of true numbers.
 *
 * **The chat log is the reader's own.** That is the one write here, it is
 * scoped to the caller both writing and reading, and it holds the rendered
 * answer rather than a question to re-run — the boards move, and re-deriving
 * an old answer from today's numbers would quietly rewrite what somebody was
 * told yesterday.
 */

const entry = v.object({
  _id: v.id("insightChats"),
  at: v.number(),
  question: v.string(),
  title: v.string(),
  note: v.string(),
  lens: v.string(),
  blocks: v.array(block),
});

/** Whether to offer the thing at all. */
export const available = query({
  args: {},
  returns: v.boolean(),
  handler: async () => process.env.OPENAI_API_KEY !== undefined,
});

/** This reader's own conversation, oldest first so it reads like one. */
export const history = query({
  args: { limit: v.optional(v.number()) },
  returns: v.array(entry),
  handler: async (ctx, args) => {
    const me = await currentUser(ctx);
    if (!me) return [];
    const rows = await ctx.db
      .query("insightChats")
      .withIndex("by_user", (q) => q.eq("userId", me._id))
      .order("desc")
      .take(Math.min(args.limit ?? 20, 50));
    return rows.reverse().map((r) => ({
      _id: r._id,
      at: r._creationTime,
      question: r.question,
      title: r.title,
      note: r.note,
      lens: r.lens,
      blocks: r.blocks as Block[],
    }));
  },
});

export const remember = internalMutation({
  args: {
    userId: v.id("users"),
    question: v.string(),
    title: v.string(),
    note: v.string(),
    lens: v.string(),
    blocks: v.array(block),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    await ctx.db.insert("insightChats", args);
    return null;
  },
});

/** Somebody asked. The one place the chat log is cleared, by its owner. */
export const forget = mutation({
  args: {},
  returns: v.null(),
  handler: async (ctx) => {
    const me = await requireUser(ctx);
    const rows = await ctx.db
      .query("insightChats")
      .withIndex("by_user", (q) => q.eq("userId", me._id))
      .take(200);
    for (const row of rows) await ctx.db.delete("insightChats", row._id);
    return null;
  },
});

/** The rate limit lives on its own mutation so the action can consume one
    before spending anybody's money on a model call. */
export const spend = internalMutation({
  args: { userId: v.id("users") },
  returns: v.boolean(),
  handler: async (ctx, args) => {
    const out = await limiter.limit(ctx, "insight", { key: args.userId });
    return out.ok;
  },
});

export const ask = action({
  args: { question: v.string() },
  returns: v.object({
    title: v.string(),
    note: v.string(),
    lens: v.string(),
    blocks: v.array(block),
    why: v.union(v.null(), v.string()),
  }),
  handler: async (
    ctx,
    args,
  ): Promise<{
    title: string;
    note: string;
    lens: string;
    blocks: Block[];
    why: string | null;
  }> => {
    const empty = { title: "", note: "", lens: "", blocks: [] as Block[] };
    const question = args.question.trim().slice(0, 200);
    if (question.length < 3) {
      return { ...empty, why: "Ask something a little longer." };
    }

    const me = await ctx.runQuery(api.users.me, {});
    if (!me) return { ...empty, why: "Sign in to ask." };

    const allowed = await ctx.runMutation(internal.insightChat.spend, { userId: me._id });
    if (!allowed) {
      return { ...empty, why: "That is a few too many in an hour. Try again shortly." };
    }

    /* The public board — the same numbers a signed-out reader sees. There is
       no privileged read on this path at all. */
    const board = await ctx.runQuery(api.world.board, {});
    if (board.totals.votes === 0) {
      return { ...empty, why: "Nobody has voted yet, so there is nothing to read." };
    }

    const chosen = await route(question, board.countries.map((c) => c.code));
    if (!chosen) {
      return { ...empty, why: "The model did not answer. Try again in a moment." };
    }

    const blocks = build(chosen, board);
    await ctx.runMutation(internal.insightChat.remember, {
      userId: me._id,
      question,
      title: chosen.title,
      note: chosen.note,
      lens: chosen.lens,
      blocks,
    });

    return { title: chosen.title, note: chosen.note, lens: chosen.lens, blocks, why: null };
  },
});
