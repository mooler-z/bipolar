import { v } from "convex/values";

import { query, type QueryCtx } from "./_generated/server";
import type { Doc, Id } from "./_generated/dataModel";
import {
  aggregateFor,
  aggregateValidator,
  countryBreakdown,
  gatedAggregate,
  hasAccess,
} from "./stats";
import { currentUser } from "./users";
import {
  JITTER,
  VELOCITY_WINDOW_MS,
  hashSeed,
  interleave,
  jitter,
  score,
  seededShuffle,
  type Candidate,
  type Context,
} from "./lib/rank";

/**
 * Reading topics. Every public shape in here passes through the gate in
 * `stats.ts`: a reader who has neither voted nor peeked gets `stats: null` in
 * the payload, not a hidden field in the markup.
 *
 * What stays public on every topic, for every reader:
 *
 *   - the question, its category, when it was posed, what it was made from
 *   - the country lean — which countries lean LOVE and which lean HATE
 *
 * The country lean is deliberately *not* the four counters per country. Those
 * sum to the two-layer aggregate, so publishing them would hand over the exact
 * thing the gate protects, one subtraction later. What ships is the combined
 * love share and a coarse sample size: enough for "which country hates this
 * most", which is the shareable claim, and not enough to reconstruct the split
 * between the crowd and the committed, which is the gated one.
 */

/**
 * The full per-country picture, free and paid apart.
 *
 * Gated with the aggregate, and for the same reason: these numbers sum to it.
 * A reader who has voted or peeked has earned the whole board; one who has not
 * gets `countryLean` above, which says which way a country leans and nothing
 * about how the crowd and the committed differ.
 */
const countryFull = v.object({
  countryCode: v.string(),
  love: v.number(),
  hate: v.number(),
  sparkLove: v.number(),
  sparkHate: v.number(),
});

const countryLean = v.object({
  countryCode: v.string(),
  /** 0-100, free and paid votes combined. Never split by layer. */
  lovePct: v.number(),
  /** How much to trust it, without publishing a count. */
  sample: v.union(v.literal("few"), v.literal("some"), v.literal("many")),
});

const card = v.object({
  _id: v.id("topics"),
  slug: v.string(),
  question: v.string(),
  description: v.optional(v.string()),
  categorySlug: v.string(),
  sourceUrl: v.optional(v.string()),
  /**
   * The picture, already resolved. An uploaded image wins over the one a
   * Wikipedia lookup found, so a deliberate choice always beats the automatic
   * one and the caller never has to know which it got.
   */
  imageUrl: v.optional(v.string()),
  isSensitive: v.boolean(),
  isFeatured: v.boolean(),
  postedAt: v.number(),
  closesAt: v.optional(v.number()),
  /**
   * How many have voted, free and paid together. Public: that a room is busy
   * says nothing about which way it leans, and the ballot needs it to feel
   * alive before anyone has earned the result.
   */
  voteCount: v.number(),
  /** Comments posted here. Public on every topic, like the vote count. */
  commentCount: v.number(),
  /**
   * How many free votes are in. Public: a count says the room is big enough to
   * be read, and says nothing at all about which way it reads.
   */
  crowdSize: v.number(),
  /** The country the topic is *about*. Absent means global. */
  scopeCountry: v.optional(v.string()),
  /** What a reader would look this up by. */
  tags: v.array(v.string()),
  /** Null unless this reader has voted or peeked. The gate, in the payload. */
  stats: v.union(v.null(), aggregateValidator),
});

function leanOf(rows: Doc<"countryTopicStats">[]) {
  return rows
    .map((r) => {
      const love = r.freeLove + r.paidLove;
      const total = love + r.freeHate + r.paidHate;
      return {
        countryCode: r.countryCode,
        lovePct: total === 0 ? 50 : Math.round((love / total) * 100),
        sample: (total < 10 ? "few" : total < 100 ? "some" : "many") as
          | "few"
          | "some"
          | "many",
        total,
      };
    })
    .filter((r) => r.total > 0)
    .sort((a, b) => b.total - a.total)
    .map(({ total: _total, ...rest }) => rest);
}

/** Storage first, then whatever discovery found. Null when a topic is type only. */
async function imageOf(
  ctx: QueryCtx,
  topic: Doc<"topics">,
): Promise<string | undefined> {
  if (topic.imageId) {
    const url = await ctx.storage.getUrl(topic.imageId);
    if (url) return url;
  }
  return topic.externalImageUrl;
}

async function toCard(ctx: QueryCtx, topic: Doc<"topics">) {
  const category = await ctx.db.get("categories", topic.categoryId);
  const totals = await aggregateFor(ctx, topic._id);
  const tagRows = await ctx.db
    .query("topicTags")
    .withIndex("by_topic", (q) => q.eq("topicId", topic._id))
    .take(5);
  const tags: string[] = [];
  for (const row of tagRows) {
    const tag = await ctx.db.get("tags", row.tagId);
    if (tag) tags.push(tag.name);
  }
  const stats = await ctx.db
    .query("topicStats")
    .withIndex("by_topic", (q) => q.eq("topicId", topic._id))
    .unique();
  return {
    _id: topic._id,
    slug: topic.slug,
    question: topic.question,
    description: topic.description,
    categorySlug: category?.slug ?? "culture",
    sourceUrl: topic.sourceUrl,
    imageUrl: await imageOf(ctx, topic),
    isSensitive: topic.isSensitive,
    isFeatured: topic.isFeatured,
    postedAt: topic._creationTime,
    closesAt: topic.closesAt,
    voteCount:
      totals.freeLove + totals.freeHate + totals.paidLove + totals.paidHate,
    commentCount: stats?.comments ?? 0,
    crowdSize: totals.freeLove + totals.freeHate,
    scopeCountry: topic.scopeCountry,
    tags,
    stats: await gatedAggregate(ctx, topic._id),
  };
}

/** The browse list. Newest active topics; nothing gated leaks into it. */
export const list = query({
  args: { limit: v.optional(v.number()) },
  returns: v.array(card),
  handler: async (ctx, args) => {
    const topics = await ctx.db
      .query("topics")
      .withIndex("by_status", (q) => q.eq("status", "active"))
      .order("desc")
      .take(Math.min(args.limit ?? 20, 50));
    return await Promise.all(topics.map((t) => toCard(ctx, t)));
  },
});

/** One topic, by the slug in its URL. The page a pasted link opens. */
export const bySlug = query({
  args: { slug: v.string() },
  returns: v.union(
    v.null(),
    v.object({
      topic: card,
      countries: v.array(countryLean),
      /** Null until this reader has earned the aggregate. */
      countriesFull: v.union(v.null(), v.array(countryFull)),
      /** What this reader has already done here. Drives the buttons. */
      viewer: v.object({
        signedIn: v.boolean(),
        votedFree: v.union(v.null(), v.string()),
        votedPaid: v.union(v.null(), v.string()),
        peeked: v.boolean(),
        unlocked: v.boolean(),
      }),
      sources: v.array(
        v.object({ url: v.string(), title: v.string() }),
      ),
    }),
  ),
  handler: async (ctx, args) => {
    const topic = await ctx.db
      .query("topics")
      .withIndex("by_slug", (q) => q.eq("slug", args.slug))
      .unique();
    if (!topic || topic.status === "draft") return null;

    const user = await currentUser(ctx);
    const votes = user
      ? await ctx.db
          .query("votes")
          .withIndex("by_user_topic_type", (q) =>
            q.eq("userId", user._id).eq("topicId", topic._id),
          )
          .take(2)
      : [];
    const peeked = user
      ? (await ctx.db
          .query("topicPeeks")
          .withIndex("by_user_topic", (q) =>
            q.eq("userId", user._id).eq("topicId", topic._id),
          )
          .unique()) !== null
      : false;

    const unlocked = await hasAccess(ctx, user?._id ?? null, topic._id);
    const rows = await countryBreakdown(ctx, topic._id);

    const sources = await ctx.db
      .query("topicSources")
      .withIndex("by_topic", (q) => q.eq("topicId", topic._id))
      .take(5);

    return {
      topic: await toCard(ctx, topic),
      countries: leanOf(rows),
      countriesFull: unlocked
        ? rows.map((r) => ({
            countryCode: r.countryCode,
            love: r.freeLove + r.paidLove,
            hate: r.freeHate + r.paidHate,
            sparkLove: r.paidLove,
            sparkHate: r.paidHate,
          }))
        : null,
      viewer: {
        signedIn: user !== null,
        votedFree: votes.find((x) => x.voteType === "free")?.choice ?? null,
        votedPaid: votes.find((x) => x.voteType === "paid")?.choice ?? null,
        peeked,
        unlocked,
      },
      sources: sources.map((s) => ({ url: s.url, title: s.title })),
    };
  },
});

/**
 * The feed.
 *
 * Not "newest first" and not an interest filter: a weighted score over eight
 * signals, the strongest of which is **tension** — the best topic is the one
 * nobody agrees on, and this is the only product where that is the right answer.
 * Affinity blends what a reader said at onboarding with what they have since
 * done; local heat looks for topics where their country is out of step with the
 * world; provocation looks for rooms that disagree with them personally.
 *
 * Every input is a bounded, indexed read of a running total. Nothing here scans
 * a table, and the arithmetic lives in `lib/rank.ts` where it can be tested
 * without a database.
 *
 * Signed out, none of those signals exist, so it falls back to recency — which
 * is the honest ordering when the ranker knows nothing.
 */
export const feed = query({
  args: {
    limit: v.optional(v.number()),
    now: v.optional(v.number()),
    /**
     * Reshuffles the serve order. The client mints one per page load, so a
     * reload opens on a different question — the order within a sitting stays
     * put, but coming back is never the same wall of topics twice.
     */
    seed: v.optional(v.string()),
  },
  returns: v.array(card),
  handler: async (ctx, args) => {
    const want = Math.min(args.limit ?? 10, 100);
    const user = await currentUser(ctx);

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
    if (candidates.length === 0) return [];

    // The clock is an argument so the query stays cacheable and reruns when the
    // caller says time moved, rather than going stale holding a reading nobody
    // refreshed.
    const nowMs = args.now ?? 0;

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
      };
    });

    // Serve order, not score order: no three cards from one category in a row,
    // and one slot in ten pulled from the lower half so taste keeps moving.
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
  },
});
