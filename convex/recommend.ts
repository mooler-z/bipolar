import { v } from "convex/values";

import { internal } from "./_generated/api";
import {
  action,
  internalAction,
  internalMutation,
  internalQuery,
  query,
} from "./_generated/server";
import type { Id } from "./_generated/dataModel";
import { requirePermission } from "./admin";
import { keysOf, metrics, step, type Act } from "./lib/affinity";
import { WEIGHTS, score, type Candidate, type Context, type Weights } from "./lib/rank";
import type { Infer } from "convex/values";

/**
 * Proof that the recommender learned something, as a number.
 *
 * Every reader's real acts are replayed in the order they happened. At each
 * act the reader took *towards* a topic — voted, paid, pulled it from the
 * room, wrote about it, peeked — the ranker is asked, knowing only what came
 * before, where it would have placed that topic among everything the reader
 * could have been shown. Two rankers answer: the one that shipped before the
 * interaction log existed, and the one that reads it. The yardsticks are mean
 * reciprocal rank and hit@10, the standard ones for exactly this question,
 * and neither can be gamed by the ranker that produced them.
 *
 * The comparison is deliberately fair to the old ranker: both see the same
 * candidates, the same counters, no velocity, and the reader's first acts are
 * warm-up for neither.
 */

/** The ranker as it was before it could learn from anything but votes and skips. */
export const BASELINE: Weights = {
  affinity: 0.3,
  learned: 0,
  tension: 0.25,
  velocity: 0.15,
  freshness: 0.12,
  featured: 0.1,
  country: 0.08,
  provocation: 0.1,
  skip: 0.2,
  fatigue: 0,
};

const WARMUP = 3;
const K = 10;
const TOWARDS = new Set<Act>([
  "vote",
  "spark",
  "pull",
  "comment",
  "reply",
  "like",
  "peek",
]);

const candidate = v.object({
  id: v.string(),
  categoryId: v.string(),
  createdAtMs: v.number(),
  isFeatured: v.boolean(),
  isLocked: v.boolean(),
  closesAtMs: v.union(v.null(), v.number()),
  scopeCountry: v.union(v.null(), v.string()),
  tagSlugs: v.array(v.string()),
  freeLove: v.number(),
  freeHate: v.number(),
  paidLove: v.number(),
  paidHate: v.number(),
  skips: v.number(),
});

const act = v.object({
  topicId: v.string(),
  kind: v.string(),
  atMs: v.number(),
  categoryId: v.string(),
  tagSlugs: v.array(v.string()),
  scopeCountry: v.union(v.null(), v.string()),
});

/** Everything a reader could have been shown, with its current counters. */
export const corpus = internalQuery({
  args: {},
  returns: v.array(candidate),
  handler: async (ctx) => {
    const topics = await ctx.db
      .query("topics")
      .withIndex("by_status", (q) => q.eq("status", "active"))
      .take(900);
    const out = [];
    for (const t of topics) {
      const s = await ctx.db
        .query("topicStats")
        .withIndex("by_topic", (q) => q.eq("topicId", t._id))
        .unique();
      out.push({
        id: t._id as string,
        categoryId: t.categoryId as string,
        createdAtMs: t._creationTime,
        isFeatured: t.isFeatured,
        isLocked: t.isLocked,
        closesAtMs: t.closesAt ?? null,
        scopeCountry: t.scopeCountry ?? null,
        tagSlugs: t.tagSlugs ?? [],
        freeLove: s?.freeLove ?? 0,
        freeHate: s?.freeHate ?? 0,
        paidLove: s?.paidLove ?? 0,
        paidHate: s?.paidHate ?? 0,
        skips: s?.skips ?? 0,
      });
    }
    return out;
  },
});

/** Every reader with enough history to replay, and what the old ranker knew about them. */
export const readers = internalQuery({
  args: {},
  returns: v.array(
    v.object({
      userId: v.string(),
      country: v.union(v.null(), v.string()),
      interests: v.array(v.string()),
      acts: v.array(act),
    }),
  ),
  handler: async (ctx) => {
    const byUser = new Map<string, typeof act.type[]>();
    for (const i of await ctx.db.query("interactions").take(6000)) {
      const mine = byUser.get(i.userId) ?? [];
      mine.push({
        topicId: i.topicId as string,
        kind: i.kind,
        atMs: i._creationTime,
        categoryId: i.categoryId as string,
        tagSlugs: i.tagSlugs,
        scopeCountry: i.scopeCountry ?? null,
      });
      byUser.set(i.userId, mine);
    }
    const out = [];
    for (const [userId, acts] of byUser) {
      if (acts.length < WARMUP + 2 || out.length >= 40) continue;
      const user = await ctx.db.get("users", userId as Id<"users">);
      const interests = await ctx.db
        .query("userInterests")
        .withIndex("by_user", (q) => q.eq("userId", userId as Id<"users">))
        .take(30);
      out.push({
        userId,
        country: user?.countryCode ?? null,
        interests: interests.map((r) => r.categoryId as string),
        acts: acts.sort((a, b) => a.atMs - b.atMs).slice(0, 500),
      });
    }
    return out;
  },
});

export const keep = internalMutation({
  args: {
    readers: v.number(),
    acts: v.number(),
    baseline: v.object({ mrr: v.number(), hitAtK: v.number(), medianRank: v.number() }),
    learned: v.object({ mrr: v.number(), hitAtK: v.number(), medianRank: v.number() }),
    separation: v.number(),
    k: v.number(),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    await ctx.db.insert("recommendReports", args);
    return null;
  },
});

const report = v.object({
  readers: v.number(),
  acts: v.number(),
  baseline: v.object({ mrr: v.number(), hitAtK: v.number(), medianRank: v.number() }),
  learned: v.object({ mrr: v.number(), hitAtK: v.number(), medianRank: v.number() }),
  separation: v.number(),
  k: v.number(),
});
type Report = Infer<typeof report>;

type Reader = {
  userId: string;
  country: string | null;
  interests: string[];
  acts: Infer<typeof act>[];
};

/** Where the ranker would have put this topic: 1 + how many it scored above it. */
function rankOf(pool: Candidate[], id: string, ctx: Context, w: Weights): number {
  const target = pool.find((c) => c.id === id);
  if (!target) return pool.length;
  const mine = score(target, ctx, w).score;
  let above = 0;
  for (const c of pool) if (c.id !== id && score(c, ctx, w).score > mine) above += 1;
  return above + 1;
}

export const evaluate = internalAction({
  args: {},
  returns: report,
  /* The explicit types are not decoration: this handler reaches its own
     module through `internal`, so without them TypeScript tries to infer a
     type that depends on itself, gives up, and the resulting `any` poisons
     every generated function type in the app. */
  handler: async (ctx): Promise<Report> => {
    const pool: Candidate[] = await ctx.runQuery(internal.recommend.corpus, {});
    const people: Reader[] = await ctx.runQuery(internal.recommend.readers, {});

    const ranksB: number[] = [];
    const ranksL: number[] = [];
    const towards: number[] = [];
    const away: number[] = [];

    for (const person of people) {
      const learned = new Map<string, number>();
      const voted = new Set<string>();
      const recentSkips: { categoryId: string; atMs: number }[] = [];
      const base = {
        userCountry: person.country,
        interests: new Set(person.interests),
        taste: new Map<string, number>(),
        velocity: new Map<string, number>(),
        countryLean: new Map<string, { love: number; hate: number }>(),
        categoryLean: new Map<string, { love: number; total: number }>(),
        skips: new Map<string, number>(),
      };

      person.acts.forEach((a: Infer<typeof act>, i: number) => {
        const kind = a.kind as Act;
        // What existed, minus what this reader had already answered.
        const shown = pool.filter((c) => c.createdAtMs <= a.atMs && !voted.has(c.id));
        const withL: Context = { ...base, nowMs: a.atMs, learned, recentSkips };
        const withB: Context = { ...base, nowMs: a.atMs, learned: new Map(), recentSkips: [] };

        const target = shown.find((c) => c.id === a.topicId);
        if (target) {
          const s = score(target, withL, WEIGHTS).score;
          if (TOWARDS.has(kind)) towards.push(s);
          else if (kind === "skip") away.push(s);
          if (TOWARDS.has(kind) && i >= WARMUP) {
            ranksL.push(rankOf(shown, a.topicId, withL, WEIGHTS));
            ranksB.push(rankOf(shown, a.topicId, withB, BASELINE));
          }
        }

        // Then learn from it, exactly as the live path does.
        for (const key of keysOf(a)) learned.set(key, step(learned.get(key), kind));
        if (kind === "skip") recentSkips.push({ categoryId: a.categoryId, atMs: a.atMs });
        if (kind === "vote" || kind === "spark") voted.add(a.topicId);
      });
    }

    const mean = (xs: number[]) => (xs.length ? xs.reduce((s, x) => s + x, 0) / xs.length : 0);
    const b = metrics(ranksB, K);
    const l = metrics(ranksL, K);
    const out: Report = {
      readers: people.length,
      acts: ranksL.length,
      baseline: { mrr: b.mrr, hitAtK: b.hitAtK, medianRank: b.medianRank },
      learned: { mrr: l.mrr, hitAtK: l.hitAtK, medianRank: l.medianRank },
      separation: mean(towards) - mean(away),
      k: K,
    };
    await ctx.runMutation(internal.recommend.keep, out);
    return out;
  },
});

/** The replay, on demand, from the console. */
export const run = action({
  args: {},
  returns: report,
  handler: async (ctx): Promise<Report> => {
    const role: string | null = await ctx.runQuery(internal.ingest.callerRole, {});
    if (role !== "admin") throw new Error("Administrators only.");
    const out: Report = await ctx.runAction(internal.recommend.evaluate, {});
    return out;
  },
});

/** The latest report card, for the overview. */
export const latest = query({
  args: {},
  returns: v.union(v.null(), v.object({ ...report.fields, at: v.number() })),
  handler: async (ctx) => {
    await requirePermission(ctx, "dashboard:view");
    const row = await ctx.db.query("recommendReports").order("desc").first();
    if (!row) return null;
    return {
      readers: row.readers,
      acts: row.acts,
      baseline: row.baseline,
      learned: row.learned,
      separation: row.separation,
      k: row.k,
      at: row._creationTime,
    };
  },
});
