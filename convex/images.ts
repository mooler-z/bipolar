import { v } from "convex/values";

import { WIKI } from "./config";
import { internal } from "./_generated/api";
import type { Id } from "./_generated/dataModel";
import {
  internalAction,
  internalMutation,
  internalQuery,
} from "./_generated/server";
import { fetchSummaries } from "./lib/wikipedia";

/**
 * Turning a named article into a picture.
 *
 * A mutation cannot `fetch`, so this is split the same way discovery already
 * is: a query finds the work, an action does the network, a mutation writes the
 * result. Nothing here is user-facing — it runs from the CLI or a cron.
 *
 * **Idempotent by construction.** `pending` only returns topics that name an
 * article and have no image yet, so a re-run after a partial failure resumes
 * rather than repeats, and a second full run is free.
 */

type Pending = {
  _id: Id<"topics">;
  title: string;
  hasSource: boolean;
  hasDescription: boolean;
};

type Resolved = {
  considered: number;
  withImage: number;
  withoutImage: number;
  unavailable: number;
  remaining: boolean;
};

export const pending = internalQuery({
  args: { limit: v.number() },
  returns: v.array(
    v.object({
      _id: v.id("topics"),
      title: v.string(),
      hasSource: v.boolean(),
      hasDescription: v.boolean(),
    }),
  ),
  handler: async (ctx, args) => {
    /* Bounded, and **newest first**. The scan is mostly over topics that
       already have their picture, so the order is what decides whether a
       question minted this hour gets one today or waits behind six hundred
       older rows that were resolved months ago. */
    const rows = await ctx.db.query("topics").order("desc").take(600);
    return rows
      .filter(
        (t) =>
          t.wikipediaTitle &&
          !t.externalImageUrl &&
          !t.imageId &&
          t.imageCheckedAt === undefined,
      )
      .slice(0, args.limit)
      .map((t) => ({
        _id: t._id,
        title: t.wikipediaTitle!,
        hasSource: !!t.sourceUrl,
        hasDescription: !!t.description,
      }));
  },
});

export const apply = internalMutation({
  args: {
    topicId: v.id("topics"),
    imageUrl: v.optional(v.string()),
    sourceUrl: v.optional(v.string()),
    description: v.optional(v.string()),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    // Stamped whether or not anything was found — the stamp is the record that
    // this topic has been asked about, which is what keeps the queue draining.
    const patch: {
      externalImageUrl?: string;
      sourceUrl?: string;
      description?: string;
      imageCheckedAt: number;
    } = { imageCheckedAt: Date.now() };
    if (args.imageUrl) patch.externalImageUrl = args.imageUrl;
    // Only ever fills a gap. A topic that already carries a source or a
    // description was written by someone; this does not overrule them.
    if (args.sourceUrl) patch.sourceUrl = args.sourceUrl;
    if (args.description) patch.description = args.description;
    await ctx.db.patch(args.topicId, patch);
    return null;
  },
});

/**
 * Resolve a batch of named articles into pictures.
 *
 * One call per topic, sequentially. Wikipedia's rate limiting is etiquette
 * rather than contract, and hammering it in parallel from a named user agent is
 * how a keyless source stops being available.
 */
export const resolve = internalAction({
  args: { limit: v.optional(v.number()) },
  returns: v.object({
    considered: v.number(),
    withImage: v.number(),
    withoutImage: v.number(),
    unavailable: v.number(),
    remaining: v.boolean(),
  }),
  /* The explicit return type is not decoration: this handler reaches its own
     module through `internal`, so without it TypeScript tries to infer a type
     that depends on itself and gives up. */
  handler: async (ctx, args): Promise<Resolved> => {
    const limit = Math.min(args.limit ?? WIKI.batch, 200);
    const rows: Pending[] = await ctx.runQuery(internal.images.pending, {
      limit: limit + 1,
    });
    const work = rows.slice(0, limit);

    /* One request for the whole batch. The quota is counted in requests, not
       titles, so asking fifty at once is the difference between clearing the
       backlog and clearing ten of it. */
    const answers = await fetchSummaries(work.map((w) => w.title));

    let withImage = 0;
    let absent = 0;
    let unavailable = 0;

    for (const row of work) {
      const look = answers.get(row.title) ?? { status: "unavailable" as const };

      /* Could not ask. Leave the topic unstamped so a later run retries it —
         recording this as "no picture" would be recording an answer we never
         got. */
      if (look.status === "unavailable") {
        unavailable += 1;
        continue;
      }

      const found = look.status === "found" ? look.summary : null;
      if (found?.imageUrl) withImage += 1;
      else absent += 1;

      await ctx.runMutation(internal.images.apply, {
        topicId: row._id,
        imageUrl: found?.imageUrl ?? undefined,
        sourceUrl: row.hasSource ? undefined : (found?.pageUrl ?? undefined),
        description: row.hasDescription
          ? undefined
          : (found?.extract?.slice(0, 200) ?? undefined),
      });
    }

    return {
      considered: withImage + absent + unavailable,
      withImage,
      withoutImage: absent,
      unavailable,
      remaining: rows.length > limit || unavailable > 0,
    };
  },
});

/**
 * Point a topic at a different article.
 *
 * Some subjects have no photograph of their own. An abstract — a policy, a
 * doctrine, a legal test — has an article and no lead image, and no number of
 * retries will conjure one. What works is naming something concrete the
 * subject is *about*: the bank rather than the rate, the singer rather than
 * the genre, the court rather than the ruling.
 *
 * Clears the stamp as it goes, so the next `resolve` picks the topic back up.
 */
export const retitle = internalMutation({
  args: {
    pairs: v.array(v.object({ from: v.string(), to: v.string() })),
  },
  returns: v.object({ retitled: v.number() }),
  handler: async (ctx, args) => {
    const rows = await ctx.db.query("topics").take(1000);
    let retitled = 0;
    for (const { from, to } of args.pairs) {
      for (const topic of rows) {
        if (topic.wikipediaTitle !== from) continue;
        if (topic.externalImageUrl || topic.imageId) continue;
        await ctx.db.patch("topics", topic._id, {
          wikipediaTitle: to,
          imageCheckedAt: undefined,
        });
        retitled += 1;
      }
    }
    return { retitled };
  },
});

/**
 * Let previously-checked topics be asked about again.
 *
 * Clears the stamp on topics that name an article but carry no picture. Use it
 * after a run that was throttled, or after changing what counts as a usable
 * image. It touches nothing that already has an image, so it cannot undo good
 * work.
 */
export const retry = internalMutation({
  args: {},
  returns: v.object({ cleared: v.number() }),
  handler: async (ctx) => {
    const rows = await ctx.db.query("topics").take(600);
    let cleared = 0;
    for (const t of rows) {
      if (!t.wikipediaTitle || t.externalImageUrl || t.imageId) continue;
      if (t.imageCheckedAt === undefined) continue;
      await ctx.db.patch(t._id, { imageCheckedAt: undefined });
      cleared += 1;
    }
    return { cleared };
  },
});
