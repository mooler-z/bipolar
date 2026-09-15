import type { QueryCtx } from "./_generated/server";
import type { Doc } from "./_generated/dataModel";
import { score, type Candidate } from "./lib/rank";
import { JITTER, hashSeed, interleave, jitter, noveltyOf, seededShuffle } from "./lib/serve";
import { contextFor } from "./feedContext";

/**
 * The ranked serve order, for whoever is asking.
 *
 * It moved out of `topics.ts` when the Telegram bot arrived, for the same
 * reason the vote write did: a bot has no session, so it cannot call a query
 * that reads the caller's identity — and ranking a second way "just for the
 * bot" would mean two recommenders, one of them untested and quietly
 * diverging from the one the replay evaluates.
 *
 * So the caller decides *who* this is for, and the ranking lives here, once.
 * `toCard` is handed in rather than imported, to keep the dependency pointing
 * one way: `topics.ts` owns the shape a topic is published in.
 */
export async function rankedFeed<T>(
  ctx: QueryCtx,
  user: Doc<"users"> | null,
  args: { limit?: number; now?: number; seed?: string },
  toCard: (ctx: QueryCtx, topic: Doc<"topics">) => Promise<T>,
): Promise<T[]> {
    const want = Math.min(args.limit ?? 10, 100);

    const pool = await ctx.db
      .query("topics")
      .withIndex("by_status", (q) => q.eq("status", "active"))
      .order("desc")
      .take(Math.min(want * 3, 180));

    if (!user) {
      // Signed out there are no signals to rank on, so recency is the honest
      // order — but shuffled *within* the newest slice, so a visitor reloading
      // gets a fresh question rather than the same one forever, and still gets
      // recent ones rather than something from a fortnight ago.
      const recent = pool.slice(0, Math.max(want * 3, 30));
      const served = seededShuffle(recent, hashSeed(args.seed ?? "anon")).slice(
        0,
        want,
      );
      return await Promise.all(served.map((t) => toCard(ctx, t)));
    }

    // The clock is an argument so the query stays cacheable and reruns when the
    // caller says time moved, rather than going stale holding a reading nobody
    // refreshed.
    const nowMs = args.now ?? 0;
    const { candidates, context, statsByTopic } = await contextFor(ctx, user, pool, nowMs);
    if (candidates.length === 0) return [];
    /* How much this reader has already told us about a candidate.
       `categoryLean.total` is their own votes in that category; `learned` holds
       a weight for every tag they have acted on at all. Both are evidence, not
       affinity — a tag they hate is still a tag we know about them. */
    const evidence = (topic: Doc<"topics">) => {
      const cat = context.categoryLean.get(topic.categoryId as string)?.total ?? 0;
      const tags = (topic.tagSlugs ?? []).filter((t) =>
        context.learned.has(`tag:${t}`),
      ).length;
      return noveltyOf(cat, tags);
    };

    const scored = candidates.map((topic) => {
      const totals = statsByTopic.get(topic._id);
      const candidate: Candidate = {
        id: topic._id,
        categoryId: topic.categoryId,
        createdAtMs: topic._creationTime,
        isFeatured: topic.isFeatured,
        isLocked: topic.isLocked,
        closesAtMs: topic.closesAt ?? null,
        scopeCountry: topic.scopeCountry ?? null,
        tagSlugs: topic.tagSlugs ?? [],
        freeLove: totals?.freeLove ?? 0,
        freeHate: totals?.freeHate ?? 0,
        paidLove: totals?.paidLove ?? 0,
        paidHate: totals?.paidHate ?? 0,
        skips: totals?.skips ?? 0,
      };
      // A little seeded noise, so two visits do not open on the same question
      // when a dozen topics are all but tied. Small enough that it reorders
      // near-ties and never floats a weak topic over a strong one.
      const base = score(candidate, context).score;
      return {
        id: topic._id as string,
        categoryId: topic.categoryId as string,
        score: base + (args.seed ? jitter(args.seed, topic._id) * JITTER : 0),
        novelty: evidence(topic),
      };
    });

    // Serve order, not score order: no three cards from one category in a row,
    // and about one slot in six given to whatever this reader has told us the
    // least about, so the feed keeps learning instead of agreeing with itself.
    const byId = new Map(candidates.map((t) => [t._id as string, t]));
    const order = interleave(scored, {
      seed: hashSeed(
        args.seed ??
          `${user._id}:${new Date(nowMs || 0).toISOString().slice(0, 10)}`,
      ),
    });

    const served = order
      .slice(0, want)
      .map((id) => byId.get(id))
      .filter((t): t is NonNullable<typeof t> => t !== undefined);

    return await Promise.all(served.map((t) => toCard(ctx, t)));
}
