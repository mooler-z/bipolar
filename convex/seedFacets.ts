import { v } from "convex/values";

import { internalMutation } from "./_generated/server";
import { ageBandOf, ageOf, eraOf, regionOf, type Facets } from "./lib/facets";
import { PEOPLE_FACETS } from "./seedPeopleFacets";
import { PRODUCT_FACETS } from "./seedProductFacets";

/**
 * Filling in what a question is about.
 *
 * Three sources, in order of how much they are worth. **What was written by
 * hand** — a person's gender and birth year, a product's price band and the
 * year it arrived — comes from the two facet files, because nothing can derive
 * it. **What follows from that** — an age band from a birth year, an era from
 * a year, a region from a country — is computed, because a stored copy of a
 * derivable fact is a second thing to keep right. **What the votes say** —
 * how far the argument about this actually reached — is read from the country
 * boards, because it is the only honest source for it.
 *
 * Idempotent: a topic is rewritten with the same answer every time, and a run
 * that half finished can simply be run again.
 */

/** What the argument is really about, from the shelf it sits on. */
const AXIS_BY_CATEGORY: Record<string, string> = {
  politics: "power", world: "power", conflict: "war", business: "money",
  money: "money", tech: "technology", ai: "technology", science: "technology",
  health: "health", climate: "environment", culture: "speech",
  entertainment: "taste", sport: "taste", food: "taste", life: "taste",
  history: "power", religion: "faith", education: "identity", work: "money",
  law: "safety", internet: "privacy", music: "taste", gaming: "taste",
  travel: "environment",
};

/** Who is in the room for it. */
const AUDIENCE_BY_CATEGORY: Record<string, string> = {
  ai: "expert", science: "expert", money: "expert", business: "expert",
  law: "expert", tech: "enthusiast", gaming: "enthusiast", music: "enthusiast",
  internet: "enthusiast",
};

/** How far the argument reached, which only the votes can say. */
function scaleOf(countries: number): string {
  if (countries >= 15) return "global";
  if (countries >= 8) return "regional";
  if (countries >= 3) return "national";
  return "niche";
}

export const markFacets = internalMutation({
  args: { cursor: v.optional(v.number()), size: v.optional(v.number()) },
  returns: v.object({
    seen: v.number(),
    written: v.number(),
    nextCursor: v.union(v.number(), v.null()),
  }),
  handler: async (ctx, args) => {
    const size = Math.min(args.size ?? 80, 120);
    const skip = Math.max(0, args.cursor ?? 0);

    // Whole-table walk with a numeric cursor: there is no index on "not yet
    // stamped", and inventing one for a backfill that runs a handful of times
    // is an index the product then carries for ever.
    const all = await ctx.db.query("topics").take(skip + size + 1);
    const slice = all.slice(skip, skip + size);
    if (slice.length === 0) return { seen: 0, written: 0, nextCursor: null };

    const categories = new Map<string, string>();
    let written = 0;

    for (const topic of slice) {
      if (!categories.has(topic.categoryId)) {
        const c = await ctx.db.get("categories", topic.categoryId);
        categories.set(topic.categoryId, c?.slug ?? "other");
      }
      const category = categories.get(topic.categoryId)!;
      const tags = topic.tagSlugs ?? [];
      const person = PEOPLE_FACETS[topic.question];
      const product = PRODUCT_FACETS[topic.question];

      const rows = await ctx.db
        .query("countryTopicStats")
        .withIndex("by_topic", (q) => q.eq("topicId", topic._id))
        .take(60);
      const voting = rows.filter(
        (r) => r.freeLove + r.freeHate + r.paidLove + r.paidHate > 0,
      ).length;

      const year = person?.b ?? product?.y;
      /* Where the question came from. The two batches were written by hand and
         everything else was found on the live web, which is a real difference
         in how a question reads and therefore worth being able to group by. */
      const author = await ctx.db.get("users", topic.createdBy);
      const origin =
        author?.authId === "system:import"
          ? ("written" as const)
          : author?.authId === "system:discovery"
            ? ("crawled" as const)
            : undefined;
      const age = person ? ageOf(person.b, Date.now()) : null;

      const next: Facets = {
        kind: person
          ? "person"
          : product
            ? "product"
            : tags.includes("person")
              ? "person"
              : tags.includes("product")
                ? "product"
                : undefined,
        region: (regionOf(topic.scopeCountry) ?? undefined) as Facets["region"],
        nationality: topic.scopeCountry,
        era: eraOf(year) ?? undefined,
        year,
        origin,
        gender: person?.g,
        bornYear: person?.b,
        ageBand: ageBandOf(age) ?? undefined,
        role: person?.r as Facets["role"],
        living: person ? true : undefined,
        lean: person?.l,
        priceBand: product?.p,
        brand: product?.b,
        maker: product ? topic.scopeCountry : undefined,
        form: product?.f,
        platform: product?.e,
        axis: AXIS_BY_CATEGORY[category] as Facets["axis"],
        scale: scaleOf(voting) as Facets["scale"],
        audience: (AUDIENCE_BY_CATEGORY[category] ?? "everyone") as Facets["audience"],
      };

      // Drop the empties, so a facets object is a list of what is known rather
      // than a list of what is not.
      const kept = Object.fromEntries(
        Object.entries(next).filter(([, value]) => value !== undefined && value !== null),
      ) as Facets;

      await ctx.db.patch("topics", topic._id, { facets: kept });
      written += 1;
    }

    const next = skip + size;
    return {
      seen: slice.length,
      written,
      nextCursor: all.length > skip + size ? next : null,
    };
  },
});
