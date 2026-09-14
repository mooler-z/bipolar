import { v } from "convex/values";

import { internalMutation, internalQuery, type MutationCtx } from "./_generated/server";
import type { Id } from "./_generated/dataModel";

/**
 * A crawling session's bookkeeping: opening it, numbering it, telling its
 * story as it goes, and closing it. The URL ledger and the mint stay in
 * `ingestStore.ts`; this file is only ever about the run row and its lines.
 */

/** When the last crawling session opened. The clock the cadence is judged by. */
export const lastStartedAt = internalQuery({
  args: {},
  returns: v.union(v.null(), v.number()),
  handler: async (ctx) => {
    const last = await ctx.db.query("ingestRuns").order("desc").first();
    return last?._creationTime ?? null;
  },
});

/**
 * Open a session and give it its number.
 *
 * The number is read and written in one transaction, so two sessions that
 * overlap cannot both claim the same one — the second conflicts, retries, and
 * reads the first's number. A counter in a separate table would buy nothing
 * that serialisability does not already give.
 */
export const startRun = internalMutation({
  args: { query: v.string(), startedBy: v.optional(v.id("users")) },
  returns: v.id("ingestRuns"),
  handler: async (ctx, args) => await openRun(ctx, args.query, args.startedBy),
});

/** The insert itself, shared with the admin's button in `adminQueue.fire`. */
export async function openRun(
  ctx: MutationCtx,
  query: string,
  startedBy?: Id<"users">,
): Promise<Id<"ingestRuns">> {
  const last = await ctx.db
    .query("ingestRuns")
    .withIndex("by_seq")
    .order("desc")
    .first();
  return await ctx.db.insert("ingestRuns", {
    seq: (last?.seq ?? 0) + 1,
    query,
    found: 0,
    minted: 0,
    rejected: 0,
    duplicate: 0,
    startedBy,
  });
}

/** A line of the story, as it happens. Bounded so a runaway loop cannot fill a table. */
export const note = internalMutation({
  args: {
    runId: v.id("ingestRuns"),
    kind: v.union(
      v.literal("search"),
      v.literal("read"),
      v.literal("draft"),
      v.literal("minted"),
      v.literal("duplicate"),
      v.literal("rejected"),
      v.literal("failed"),
      v.literal("picture"),
      v.literal("done"),
      v.literal("error"),
    ),
    text: v.string(),
    topicId: v.optional(v.id("topics")),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const already = await ctx.db
      .query("ingestEvents")
      .withIndex("by_run", (q) => q.eq("runId", args.runId))
      .take(400);
    if (already.length >= 400) return null;
    await ctx.db.insert("ingestEvents", { ...args, text: args.text.slice(0, 240) });
    return null;
  },
});

/** The totals so far, so the row on the console moves while the session runs. */
export const progress = internalMutation({
  args: {
    runId: v.id("ingestRuns"),
    query: v.optional(v.string()),
    found: v.number(),
    minted: v.number(),
    rejected: v.number(),
    duplicate: v.number(),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const { runId, query, ...rest } = args;
    await ctx.db.patch("ingestRuns", runId, query ? { ...rest, query } : rest);
    return null;
  },
});

export const finishRun = internalMutation({
  args: {
    runId: v.id("ingestRuns"),
    found: v.number(),
    minted: v.number(),
    rejected: v.number(),
    duplicate: v.optional(v.number()),
    error: v.optional(v.string()),
    finishedAt: v.number(),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const { runId, ...rest } = args;
    await ctx.db.patch("ingestRuns", runId, rest);
    return null;
  },
});
