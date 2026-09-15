import { v } from "convex/values";

import { query } from "./_generated/server";

/**
 * The two boards that read the room rather than the people in it.
 *
 * They live apart from `leaderboards.ts` because that file is the podiums —
 * who is best at this — and these are the weather: where the votes are coming
 * from and which questions people stayed to argue on. Both are aggregates over
 * many questions, which is what keeps them public: a country's lean across
 * ninety topics gives away none of them, and a comment count is not an answer.
 */

/**
 * Loudest countries, by votes cast.
 *
 * The most real board on this rail, because it is the one thing the product
 * has a lot of. It is an aggregate over every question a country has answered,
 * which is exactly what keeps it public: a nation's lean across ninety
 * questions gives away none of them.
 */
export const countries = query({
  args: { limit: v.optional(v.number()) },
  returns: v.array(
    v.object({
      code: v.string(),
      votes: v.number(),
      topics: v.number(),
      lovePct: v.number(),
    }),
  ),
  handler: async (ctx, args) => {
    const rows = await ctx.db.query("countryTopicStats").take(4000);
    const acc = new Map<string, { love: number; hate: number; topics: number }>();
    for (const r of rows) {
      if (r.countryCode === "ZZ") continue;
      const love = r.freeLove + r.paidLove;
      const hate = r.freeHate + r.paidHate;
      if (love + hate === 0) continue;
      const at = acc.get(r.countryCode) ?? { love: 0, hate: 0, topics: 0 };
      at.love += love;
      at.hate += hate;
      at.topics += 1;
      acc.set(r.countryCode, at);
    }
    return [...acc]
      .map(([code, a]) => ({
        code,
        votes: a.love + a.hate,
        topics: a.topics,
        lovePct: Math.round((a.love / (a.love + a.hate)) * 100),
      }))
      .sort((x, y) => y.votes - x.votes)
      .slice(0, Math.min(args.limit ?? 5, 20));
  },
});

/** Most argued: the questions people came back to answer each other on. */
export const argued = query({
  args: { limit: v.optional(v.number()) },
  returns: v.array(
    v.object({
      slug: v.string(),
      question: v.string(),
      comments: v.number(),
      votes: v.number(),
    }),
  ),
  handler: async (ctx, args) => {
    const want = Math.min(args.limit ?? 5, 20);
    const rows = await ctx.db.query("topicStats").take(1200);
    const ranked = rows
      .filter((r) => r.comments > 0)
      .sort((a, b) => b.comments - a.comments)
      .slice(0, want + 8);

    const out = [];
    for (const row of ranked) {
      if (out.length >= want) break;
      const topic = await ctx.db.get("topics", row.topicId);
      if (!topic || topic.status !== "active") continue;
      out.push({
        slug: topic.slug,
        question: topic.question,
        comments: row.comments,
        votes: row.freeLove + row.freeHate + row.paidLove + row.paidHate,
      });
    }
    return out;
  },
});
