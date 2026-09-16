import { v } from "convex/values";

import { internal } from "./_generated/api";
import { internalAction, internalMutation, internalQuery } from "./_generated/server";
import { ageBandOf, ageOf, eraOf, regionOf, facets as facetsValidator, type Facets } from "./lib/facets";
import { label } from "./lib/facetModel";

/**
 * Labelling the six hundred questions nobody wrote by hand.
 *
 * `seedFacets.markFacets` fills what the two seed files and the votes already
 * know, which is everything for two hundred and ten topics and the four
 * derived fields for the rest. This is the other six hundred: crawled
 * questions about events, policies and practices, where what a question is
 * about is a reading rather than a lookup.
 *
 * Three layers, and the order is the point. **The model reads** and names the
 * attributes it can. **The server checks** every one against the closed
 * vocabularies in `lib/facets.ts`, so a value the model invents is dropped
 * rather than stored. **The derivations run last** and overwrite: an era
 * always follows from a year and an age band from a birth year, and a model's
 * opinion about either is worth less than arithmetic.
 *
 * What is already known is never overwritten. The hand-written facets outrank
 * the model, and a second run costs nothing but the topics it has not reached.
 */

const pending = v.object({
  slug: v.string(),
  question: v.string(),
  description: v.string(),
  category: v.string(),
});

/** Topics with no reading yet: no kind, which is the first thing a label says. */
export const unlabelled = internalQuery({
  args: { limit: v.number(), cursor: v.number() },
  returns: v.object({ rows: v.array(pending), nextCursor: v.union(v.number(), v.null()) }),
  handler: async (ctx, args) => {
    const take = Math.min(args.limit, 40);
    const skip = Math.max(0, args.cursor);
    const all = await ctx.db.query("topics").take(skip + take * 6 + 1);
    const categories = new Map<string, string>();
    const rows: { slug: string; question: string; description: string; category: string }[] = [];

    let seen = skip;
    for (const topic of all.slice(skip)) {
      seen += 1;
      if (rows.length >= take) break;
      if (topic.status !== "active") continue;
      if ((topic.facets as Facets | undefined)?.kind !== undefined) continue;
      if (!categories.has(topic.categoryId)) {
        const c = await ctx.db.get("categories", topic.categoryId);
        categories.set(topic.categoryId, c?.slug ?? "other");
      }
      rows.push({
        slug: topic.slug,
        question: topic.question,
        description: (topic.description ?? "").slice(0, 200),
        category: categories.get(topic.categoryId)!,
      });
    }
    return { rows, nextCursor: seen < all.length ? seen : null };
  },
});

/** Write a batch of readings, keeping whatever was already known. */
export const apply = internalMutation({
  args: {
    rows: v.array(v.object({ slug: v.string(), facets: facetsValidator })),
  },
  returns: v.number(),
  handler: async (ctx, args) => {
    let written = 0;
    for (const row of args.rows) {
      const topic = await ctx.db
        .query("topics")
        .withIndex("by_slug", (q) => q.eq("slug", row.slug))
        .unique();
      if (!topic) continue;

      const known = (topic.facets ?? {}) as Facets;
      // What is already there wins: the hand-written files and the vote-derived
      // scale are both better sources than a reading of the words.
      const merged: Facets = { ...row.facets, ...known };

      // The derivations run last, because they are arithmetic and the model's
      // opinion about arithmetic is worth nothing.
      const born = merged.bornYear ?? (merged.kind === "person" ? merged.year : undefined);
      merged.bornYear = born;
      merged.ageBand = ageBandOf(ageOf(born, Date.now())) ?? undefined;
      merged.era = eraOf(merged.year ?? born) ?? undefined;
      merged.region = (regionOf(merged.nationality) ?? merged.region) as Facets["region"];

      const kept = Object.fromEntries(
        Object.entries(merged).filter(([, value]) => value !== undefined && value !== null),
      ) as Facets;

      await ctx.db.patch("topics", topic._id, { facets: kept });
      written += 1;
    }
    return written;
  },
});

type Run = { asked: number; written: number; nextCursor: number | null };

/**
 * One pass: read a slice, label it, write it back.
 *
 * The explicit return type is not decoration — this handler reaches its own
 * module through `internal`, and without it TypeScript infers a type that
 * depends on itself and gives up, taking the whole generated API with it.
 */
export const run = internalAction({
  args: { cursor: v.optional(v.number()), batch: v.optional(v.number()) },
  returns: v.object({
    asked: v.number(),
    written: v.number(),
    nextCursor: v.union(v.number(), v.null()),
  }),
  handler: async (ctx, args): Promise<Run> => {
    const batch = Math.min(args.batch ?? 14, 40);
    const found: { rows: { slug: string; question: string; description: string; category: string }[]; nextCursor: number | null } =
      await ctx.runQuery(internal.facetAI.unlabelled, {
        limit: batch,
        cursor: args.cursor ?? 0,
      });
    if (found.rows.length === 0) {
      return { asked: 0, written: 0, nextCursor: found.nextCursor };
    }

    const labelled = await label(found.rows);
    const written: number = await ctx.runMutation(internal.facetAI.apply, {
      rows: labelled,
    });
    return { asked: found.rows.length, written, nextCursor: found.nextCursor };
  },
});
