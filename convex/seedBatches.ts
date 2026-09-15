import { v } from "convex/values";

import { internalMutation } from "./_generated/server";
import { ingest } from "./importTopics";
import { PEOPLE_TOPICS } from "./seedPeopleTopics";
import { WORLD_TOPICS } from "./seedWorldTopics";

/**
 * The batches that ship with the repository.
 *
 * Both are written by hand rather than crawled, and both come back through
 * `ingest` in `importTopics.ts` — so the length rule, the open-ended rule and
 * the slug check apply to them exactly as they do to anything the crawler
 * mints. A topic arriving from a file is still a topic.
 *
 * Sliced, because a hundred inserts with their tags and sources is more than
 * one transaction should carry, and re-runnable, because the slug check skips
 * anything already here.
 *
 *   npx convex run seedBatches:people '{}'
 */

/**
 * The written hundred, through the same door.
 *
 * `seedWorldTopics.ts` is a prepared batch, so it gets no shortcut: it runs
 * through `batch` above, which means every rule the model is held to runs
 * against it too. A topic arriving from a file is still a topic.
 *
 * Sliced, because a hundred inserts with their tags and sources is more than
 * one transaction should carry. Re-runnable: the slug check above skips
 * anything already here.
 */
export const world = internalMutation({
  args: { from: v.optional(v.number()), size: v.optional(v.number()) },
  returns: v.object({
    added: v.number(),
    skipped: v.number(),
    rejected: v.array(v.object({ q: v.string(), why: v.string() })),
    nextFrom: v.union(v.number(), v.null()),
  }),
  handler: async (ctx, args) => {
    const from = Math.max(0, args.from ?? 0);
    const size = Math.min(args.size ?? 25, 40);
    const slice = WORLD_TOPICS.slice(from, from + size);

    const rows = slice.map((row) => ({
      q: row.q,
      category: row.c,
      country: row.k,
      description: row.d,
      tags: [...row.t],
      wikipediaTitle: row.w,
    }));

    const result = await ingest(ctx, rows);
    const next = from + size;
    return { ...result, nextFrom: next < WORLD_TOPICS.length ? next : null };
  },
});

/**
 * The hundred people, through the same door.
 *
 * `seedPeopleTopics.ts` is a prepared batch and gets no shortcut: it runs
 * through `ingest` above, so the length rule, the open-ended rule and the
 * slug check all apply to it exactly as they do to anything the crawler
 * mints. A topic arriving from a file is still a topic.
 *
 * Sliced and re-runnable, for the same reasons as `world` above.
 */
export const people = internalMutation({
  args: { from: v.optional(v.number()), size: v.optional(v.number()) },
  returns: v.object({
    added: v.number(),
    skipped: v.number(),
    rejected: v.array(v.object({ q: v.string(), why: v.string() })),
    nextFrom: v.union(v.number(), v.null()),
  }),
  handler: async (ctx, args) => {
    const from = Math.max(0, args.from ?? 0);
    const size = Math.min(args.size ?? 25, 40);
    const slice = PEOPLE_TOPICS.slice(from, from + size);

    const rows = slice.map((row) => ({
      q: row.q,
      category: row.c,
      country: row.k,
      description: row.d,
      tags: [...row.t],
      wikipediaTitle: row.w,
    }));

    const result = await ingest(ctx, rows);
    const next = from + size;
    return { ...result, nextFrom: next < PEOPLE_TOPICS.length ? next : null };
  },
});
