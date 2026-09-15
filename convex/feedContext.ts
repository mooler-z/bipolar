import type { Doc, Id } from "./_generated/dataModel";
import type { QueryCtx } from "./_generated/server";
import { FATIGUE_WINDOW_MS } from "./lib/affinity";
import { VELOCITY_WINDOW_MS, type Context } from "./lib/rank";

/**
 * Everything the ranker needs to know about one reader, gathered in one
 * place. Every read is indexed and bounded; the feed query is what calls it.
 */
export async function contextFor(
  ctx: QueryCtx,
  user: Doc<"users">,
  pool: Doc<"topics">[],
  nowMs: number,
): Promise<{
  candidates: Doc<"topics">[];
  context: Context;
  statsByTopic: Map<string, Doc<"topicStats">>;
}> {
    // Already answered, and therefore not a candidate at all.
    const answered = new Set<Id<"topics">>();
    for (const vote of await ctx.db
      .query("votes")
      .withIndex("by_user", (q) => q.eq("userId", user._id))
      .order("desc")
      .take(400)) {
      answered.add(vote.topicId);
    }
    const candidates = pool.filter((t) => !answered.has(t._id));
    if (candidates.length === 0) {
      return { candidates, context: {} as Context, statsByTopic: new Map() };
    }

    // The clock is an argument so the query stays cacheable and reruns when the
    // caller says time moved, rather than going stale holding a reading nobody
    // refreshed.

    const interests = new Set<string>();
    for (const row of await ctx.db
      .query("userInterests")
      .withIndex("by_user", (q) => q.eq("userId", user._id))
      .take(30)) {
      interests.add(row.categoryId);
    }

    const taste = new Map<string, number>();
    for (const row of await ctx.db
      .query("userTaste")
      .withIndex("by_user_category", (q) => q.eq("userId", user._id))
      .take(60)) {
      taste.set(row.categoryId, row.weight);
    }

    const categoryLean = new Map<string, { love: number; total: number }>();
    for (const row of await ctx.db
      .query("userCategoryStats")
      .withIndex("by_user", (q) => q.eq("userId", user._id))
      .take(60)) {
      categoryLean.set(row.categoryId, {
        love: row.love,
        total: row.love + row.hate,
      });
    }

    /* What every act has said, and what the reader is bouncing off right now.
       Both bounded; both indexed; both what makes this feed *this reader's*. */
    const learned = new Map<string, number>();
    for (const row of await ctx.db
      .query("userAffinity")
      .withIndex("by_user", (q) => q.eq("userId", user._id))
      .take(400)) {
      learned.set(row.key, row.weight);
    }
    const recentSkips = (
      await ctx.db
        .query("interactions")
        .withIndex("by_user", (q) => q.eq("userId", user._id))
        .order("desc")
        .take(40)
    )
      .filter((i) => i.kind === "skip" && nowMs - i._creationTime <= FATIGUE_WINDOW_MS)
      .map((i) => ({ categoryId: i.categoryId as string, atMs: i._creationTime }));

    const skips = new Map<string, number>();
    for (const row of await ctx.db
      .query("topicSkips")
      .withIndex("by_user_topic", (q) => q.eq("userId", user._id))
      .take(300)) {
      skips.set(row.topicId, row.count);
    }

    // Velocity from one bounded read of the newest votes, bucketed by topic —
    // rather than a per-candidate query, which would be sixty reads to learn
    // the same thing.
    const velocity = new Map<string, number>();
    if (nowMs > 0) {
      for (const vote of await ctx.db.query("votes").order("desc").take(600)) {
        if (nowMs - vote._creationTime > VELOCITY_WINDOW_MS) break;
        velocity.set(vote.topicId, (velocity.get(vote.topicId) ?? 0) + 1);
      }
    }

    const countryLean = new Map<string, { love: number; hate: number }>();
    const statsByTopic = new Map<string, Doc<"topicStats">>();
    for (const topic of candidates) {
      const totals = await ctx.db
        .query("topicStats")
        .withIndex("by_topic", (q) => q.eq("topicId", topic._id))
        .unique();
      if (totals) statsByTopic.set(topic._id, totals);

      if (user.countryCode) {
        const cc = await ctx.db
          .query("countryTopicStats")
          .withIndex("by_topic_country", (q) =>
            q.eq("topicId", topic._id).eq("countryCode", user.countryCode!),
          )
          .unique();
        if (cc) {
          countryLean.set(topic._id, {
            love: cc.freeLove + cc.paidLove,
            hate: cc.freeHate + cc.paidHate,
          });
        }
      }
    }

    const context: Context = {
      nowMs: nowMs || candidates[0]._creationTime,
      userCountry: user.countryCode ?? null,
      interests,
      taste,
      velocity,
      countryLean,
      categoryLean,
      skips,
      learned,
      recentSkips,
    };

    return { candidates, context, statsByTopic };
}
