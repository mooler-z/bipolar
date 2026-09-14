import { v } from "convex/values";

import { DISCOVERY } from "./config";
import { internal } from "./_generated/api";
import { mutation, query } from "./_generated/server";
import type { Doc, Id } from "./_generated/dataModel";
import { audit, requirePermission } from "./admin";
import { openRun } from "./ingestRuns";
import { canManageAllContent, type Role } from "./lib/rbac";

/**
 * The review queue, by the wave it arrived in.
 *
 * Drafts do not trickle in. A crawling session lands fifteen at once, and the
 * unit a moderator actually works through is the session, not the topic: the
 * questions in one wave came from one sweep of the web on one afternoon, they
 * are about the same few stories, and the decision on most of them is the same
 * decision. Presenting them as one flat list of eighty means re-deciding the
 * same thing eighty times.
 *
 * So the queue is grouped by session, the session has a number a person can
 * say out loud, and the whole wave can be approved or dropped in one press.
 */

/** A session, and how much of it is still waiting on somebody. */
export const sessions = query({
  args: { limit: v.optional(v.number()) },
  returns: v.array(
    v.object({
      _id: v.id("ingestRuns"),
      seq: v.union(v.null(), v.number()),
      query: v.string(),
      found: v.number(),
      minted: v.number(),
      rejected: v.number(),
      duplicate: v.number(),
      error: v.union(v.null(), v.string()),
      at: v.union(v.null(), v.number()),
      /** Drafts from this session nobody has decided on yet. */
      pending: v.number(),
      /** Still out. */
      running: v.boolean(),
      /** Who pressed the button, or null for the clock. */
      startedBy: v.union(v.null(), v.string()),
    }),
  ),
  handler: async (ctx, args) => {
    await requirePermission(ctx, "topics:update");

    const runs = await ctx.db
      .query("ingestRuns")
      .order("desc")
      .take(Math.min(args.limit ?? 20, 60));

    const names = new Map<string, string>();
    const out = [];
    for (const run of runs) {
      if (run.startedBy && !names.has(run.startedBy)) {
        const who = await ctx.db.get("users", run.startedBy);
        names.set(run.startedBy, who?.displayName ?? "a deleted account");
      }
      // Bounded per session: a session mints fifteen, not fifteen thousand.
      const minted = await ctx.db
        .query("topics")
        .withIndex("by_run", (q) => q.eq("ingestRunId", run._id))
        .take(120);
      out.push({
        _id: run._id,
        seq: run.seq ?? null,
        query: run.query,
        found: run.found,
        minted: run.minted,
        rejected: run.rejected,
        duplicate: run.duplicate ?? 0,
        error: run.error ?? null,
        at: run.finishedAt ?? run._creationTime,
        pending: minted.filter((t) => t.status === "draft").length,
        running: run.finishedAt === undefined,
        startedBy: run.startedBy ? (names.get(run.startedBy) ?? null) : null,
      });
    }
    return out;
  },
});

/**
 * Decide on many topics at once.
 *
 * One mutation, so a wave of twelve either moves or does not — a partial
 * approval leaves a moderator with no way of knowing which half went through.
 * Each topic is still checked on its own: a creator acts only on what it wrote,
 * and each decision writes its own audit row, because Rule 8 is about the
 * individual privileged write and not about the button that triggered it.
 */
export const decideMany = mutation({
  args: {
    topicIds: v.array(v.id("topics")),
    status: v.union(v.literal("active"), v.literal("archived"), v.literal("draft")),
  },
  returns: v.object({ changed: v.number(), skipped: v.number() }),
  handler: async (ctx, args) => {
    const user = await requirePermission(
      ctx,
      args.status === "archived" ? "topics:archive" : "topics:publish",
    );
    if (args.topicIds.length > 60) {
      throw new Error("Sixty at a time. Narrow the selection.");
    }

    const all = canManageAllContent(user.role as Role);
    let changed = 0;
    let skipped = 0;

    for (const topicId of args.topicIds) {
      const topic: Doc<"topics"> | null = await ctx.db.get("topics", topicId);
      // Gone, not yours, or already where you are sending it. None of those is
      // a failure worth taking the whole batch down for.
      if (!topic || (!all && topic.createdBy !== user._id)) {
        skipped += 1;
        continue;
      }
      if (topic.status === args.status) {
        skipped += 1;
        continue;
      }

      await ctx.db.patch("topics", topicId, { status: args.status });
      await audit(ctx, user._id, "topic.status", "topic", topicId, {
        was: topic.status,
        now: args.status,
        batch: args.topicIds.length,
      });
      changed += 1;
    }

    return { changed, skipped };
  },
});

/** Every draft in one session, for "select the whole wave". */
export const inSession = query({
  args: { runId: v.id("ingestRuns") },
  returns: v.array(v.id("topics")),
  handler: async (ctx, args) => {
    await requirePermission(ctx, "topics:update");
    const rows = await ctx.db
      .query("topics")
      .withIndex("by_run", (q) => q.eq("ingestRunId", args.runId))
      .take(120);
    return rows.filter((t) => t.status === "draft").map((t) => t._id as Id<"topics">);
  },
});

/**
 * Fire a session now.
 *
 * The run row is opened **here**, before the action is scheduled, so the
 * console has something to watch from the first millisecond rather than a
 * second of nothing while the action wakes up. One at a time: a second press
 * while a session is out would spend the same searches twice and mint the
 * same wave against itself.
 */
export const fire = mutation({
  args: {},
  returns: v.id("ingestRuns"),
  handler: async (ctx) => {
    const user = await requirePermission(ctx, "ingest:run");

    const latest = await ctx.db.query("ingestRuns").order("desc").first();
    if (
      latest &&
      latest.finishedAt === undefined &&
      Date.now() - latest._creationTime < DISCOVERY.budgetMs + 60_000
    ) {
      throw new Error(`Session ${latest.seq ?? ""} is still out. Wait for it to come back.`);
    }

    const runId = await openRun(ctx, "on demand", user._id);
    await ctx.scheduler.runAfter(0, internal.ingest.discover, { runId });
    await audit(ctx, user._id, "discovery.fire", "ingestRuns", runId, {});
    return runId;
  },
});

/** The story of one session, oldest line first, so it reads top to bottom. */
export const events = query({
  args: { runId: v.id("ingestRuns") },
  returns: v.array(
    v.object({
      _id: v.id("ingestEvents"),
      at: v.number(),
      kind: v.string(),
      text: v.string(),
      /** Set on a minted line, so it can be opened rather than only read. */
      topic: v.union(v.null(), v.object({ slug: v.string(), question: v.string() })),
    }),
  ),
  handler: async (ctx, args) => {
    await requirePermission(ctx, "topics:update");
    const rows = await ctx.db
      .query("ingestEvents")
      .withIndex("by_run", (q) => q.eq("runId", args.runId))
      .take(400);

    const minted = new Map<string, { slug: string; question: string } | null>();
    for (const e of rows) {
      if (!e.topicId || minted.has(e.topicId)) continue;
      const topic = await ctx.db.get("topics", e.topicId);
      minted.set(
        e.topicId,
        topic ? { slug: topic.slug, question: topic.question } : null,
      );
    }

    return rows.map((e) => ({
      _id: e._id,
      at: e._creationTime,
      kind: e.kind,
      text: e.text,
      topic: e.topicId ? (minted.get(e.topicId) ?? null) : null,
    }));
  },
});
