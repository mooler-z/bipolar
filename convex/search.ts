import { v } from "convex/values";

import { query } from "./_generated/server";

/**
 * Finding a question by typing at it.
 *
 * Ten results, because the box is a dropdown rather than a results page and
 * an eleventh row is one nobody reads. Live topics only — a reader who finds
 * a draft has found something they cannot open, which is worse than finding
 * nothing.
 *
 * What comes back is exactly what the dropdown draws and nothing more: the
 * question, its picture, and how busy it is. **Never how it went.** A search
 * result that showed the split would be a way around the gate that voting is
 * the price of, and it would be the easiest one in the product to find.
 */
export const topics = query({
  args: { q: v.string(), limit: v.optional(v.number()) },
  returns: v.array(
    v.object({
      slug: v.string(),
      question: v.string(),
      imageUrl: v.union(v.null(), v.string()),
      categorySlug: v.string(),
      votes: v.number(),
      /** The country it is about, when it is about one. */
      about: v.union(v.null(), v.string()),
    }),
  ),
  handler: async (ctx, args) => {
    const needle = args.q.trim();
    if (needle.length < 2) return [];

    const found = await ctx.db
      .query("topics")
      .withSearchIndex("search_question", (q) =>
        q.search("question", needle).eq("status", "active"),
      )
      .take(Math.min(args.limit ?? 10, 20));

    const categories = new Map<string, string>();
    const out = [];
    for (const topic of found) {
      if (!categories.has(topic.categoryId)) {
        const c = await ctx.db.get("categories", topic.categoryId);
        categories.set(topic.categoryId, c?.slug ?? "other");
      }
      const stats = await ctx.db
        .query("topicStats")
        .withIndex("by_topic", (q) => q.eq("topicId", topic._id))
        .unique();

      const url =
        topic.imageId !== undefined
          ? await ctx.storage.getUrl(topic.imageId)
          : (topic.externalImageUrl ?? null);

      out.push({
        slug: topic.slug,
        question: topic.question,
        imageUrl: url,
        categorySlug: categories.get(topic.categoryId)!,
        votes: stats
          ? stats.freeLove + stats.freeHate + stats.paidLove + stats.paidHate
          : 0,
        about: topic.scopeCountry ?? null,
      });
    }
    return out;
  },
});
