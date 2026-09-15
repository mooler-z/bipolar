/**
 * The feed ranker, as pure arithmetic.
 *
 * No database, no context, nothing to mock: every term normalises to [0,1],
 * the score is a weighted sum minus a skip penalty, and a `reach` multiplier
 * sinks anything the reader cannot act on. Keeping it pure is the point — a
 * ranker you cannot test is a ranker nobody dares change.
 */

export const MIN_VOLUME = 20; // votes before tension counts fully
export const VELOCITY_CAP = 50; // votes in the window that max the term
export const VELOCITY_WINDOW_MS = 6 * 60 * 60 * 1000;
export const FRESHNESS_TAU_H = 72; // freshness e-fold, in hours
export const MIN_CC_VOLUME = 5; // per-country votes before local heat counts
export const MIN_CAT_VOTES = 3; // a reader's votes in a category before provocation
export const PROVOKE_FULL_VOTES = 10; // category votes that max provocation

import { affinityOf, fatigueOf } from "./affinity";

export type Weights = {
  affinity: number;
  learned: number;
  tension: number;
  velocity: number;
  freshness: number;
  featured: number;
  country: number;
  provocation: number;
  skip: number;
  fatigue: number;
};

export const WEIGHTS: Weights = {
  affinity: 0.15,
  learned: 0.35, // what the reader's acts say about this topic's tags and country
  tension: 0.22,
  velocity: 0.12,
  freshness: 0.1,
  featured: 0.08,
  country: 0.08,
  provocation: 0.1,
  skip: 0.2, // a penalty, subtracted
  fatigue: 0.3, // a penalty, subtracted: bouncing off this category right now
};

export type Candidate = {
  id: string;
  categoryId: string;
  createdAtMs: number;
  isFeatured: boolean;
  isLocked: boolean;
  closesAtMs: number | null;
  scopeCountry: string | null;
  /** What the topic is about, finer than its category. */
  tagSlugs: string[];
  freeLove: number;
  freeHate: number;
  paidLove: number;
  paidHate: number;
  skips: number;
};

export type Context = {
  nowMs: number;
  userCountry: string | null;
  /** Categories chosen at onboarding. */
  interests: Set<string>;
  /** Live EMA weight per category, absent until the reader touches one. */
  taste: Map<string, number>;
  /** Votes on each topic inside the velocity window. */
  velocity: Map<string, number>;
  /** The reader's own country's split on each topic. */
  countryLean: Map<string, { love: number; hate: number }>;
  /** How the reader themselves leans, per category. */
  categoryLean: Map<string, { love: number; total: number }>;
  /** How many times the reader has skipped each topic. */
  skips: Map<string, number>;
  /** Learned from every kind of act: `tag:x`, `cat:id`, `cc:XX` → [0,1]. */
  learned: Map<string, number>;
  /** Skips in the last half hour, for the fatigue term. */
  recentSkips: { categoryId: string; atMs: number }[];
};

export type Terms = {
  affinity: number;
  learned: number;
  tension: number;
  velocity: number;
  freshness: number;
  featured: number;
  country: number;
  provocation: number;
  skip: number;
  fatigue: number;
  reach: number;
};

const clamp01 = (n: number) => (n < 0 ? 0 : n > 1 ? 1 : n);

export function score(
  c: Candidate,
  ctx: Context,
  w: Weights = WEIGHTS,
): { score: number; terms: Terms } {
  const total = c.freeLove + c.freeHate + c.paidLove + c.paidHate;
  const love = c.freeLove + c.paidLove;
  const lovePct = total > 0 ? love / total : 0.5;

  // Affinity — what you said you liked, blended with what you have since done.
  // An untouched category keeps the onboarding answer alone; once you have
  // acted in a category, your behaviour gets equal say.
  const interestHit = ctx.interests.has(c.categoryId) ? 1 : 0;
  const taste = ctx.taste.get(c.categoryId);
  const affinity =
    taste === undefined ? interestHit : 0.5 * interestHit + 0.5 * taste;

  // Learned — what every kind of act has said about this topic's tags, its
  // category and the country it is about. A pull out of the room, a comment,
  // a spark, a vote, a peek, a skip, an undo: each moved these weights by an
  // amount matching how deliberate it was. Silence falls back to the
  // onboarding answer rather than reading as indifference.
  const learned = affinityOf(ctx.learned, c) ?? affinity;

  // Tension — 1.0 at a dead 50/50, gated by volume so three votes cannot fake
  // a national argument. This is the term that makes the feed *this* product's
  // feed: the best topic is the one nobody agrees on.
  const rawTension = 1 - Math.abs(lovePct - 0.5) / 0.5;
  const tension = clamp01(rawTension * Math.min(1, total / MIN_VOLUME));

  // Velocity — recent votes, log-compressed so one viral topic cannot flatten
  // everything else to zero.
  const recent = ctx.velocity.get(c.id) ?? 0;
  const velocity = clamp01(Math.log1p(recent) / Math.log1p(VELOCITY_CAP));

  // Freshness — exponential decay, never reaching zero, because an evergreen
  // argument is still an argument.
  const ageH = Math.max(0, (ctx.nowMs - c.createdAtMs) / 3.6e6);
  const freshness = clamp01(Math.exp(-ageH / FRESHNESS_TAU_H));

  const featured = c.isFeatured ? 1 : 0;

  // Local heat — your country disagrees with the world. The single most
  // shareable state a topic can be in, so the feed goes looking for it.
  let country = 0;
  const cc = ctx.countryLean.get(c.id);
  if (cc) {
    const ccTotal = cc.love + cc.hate;
    if (ccTotal >= MIN_CC_VOLUME) {
      country = clamp01(Math.abs(cc.love / ccTotal - lovePct) / 0.5);
    }
  }

  // Provocation — the crowd here opposes your usual stance in this category.
  // "You love tech; this room does not." Ramped by how many votes back your
  // lean, so a single vote cannot brand you.
  let provocation = 0;
  const lean = ctx.categoryLean.get(c.categoryId);
  if (lean && lean.total >= MIN_CAT_VOTES) {
    const mine = lean.love / lean.total;
    const confidence = Math.min(1, lean.total / PROVOKE_FULL_VOTES);
    provocation = clamp01(Math.abs(mine - lovePct) * confidence);
  }

  // Skip penalty — the room's disinterest and yours, weighted equally.
  const globalSkip = total + c.skips > 0 ? c.skips / (total + c.skips) : 0;
  const mineSkip = clamp01((ctx.skips.get(c.id) ?? 0) / 3);
  const skip = clamp01(0.5 * globalSkip + 0.5 * mineSkip);

  // Fatigue — two skips in this category in the last half hour. Taste barely
  // moves on two skips, and should not; the next card should.
  const fatigue = fatigueOf(ctx.recentSkips, c.categoryId, ctx.nowMs);

  const base =
    w.affinity * affinity +
    w.learned * learned +
    w.tension * tension +
    w.velocity * velocity +
    w.freshness * freshness +
    w.featured * featured +
    w.country * country +
    w.provocation * provocation -
    w.skip * skip -
    w.fatigue * fatigue;

  // Reach — a topic you cannot act on stays reachable but sinks, rather than
  // vanishing. Disappearing content is how a feed loses somebody's trust.
  const closed =
    c.isLocked || (c.closesAtMs !== null && c.closesAtMs <= ctx.nowMs);
  const elsewhere = c.scopeCountry !== null && c.scopeCountry !== ctx.userCountry;
  let reach = 1;
  if (closed) reach *= 0.1;
  if (elsewhere) reach *= 0.3;

  return {
    score: Math.max(0, base) * reach,
    terms: {
      affinity,
      learned,
      tension,
      velocity,
      freshness,
      featured,
      country,
      provocation,
      skip,
      fatigue,
      reach,
    },
  };
}

/* ── Taste ──────────────────────────────────────────────────────────────── */

/** An untouched category sits neutral: a first vote lifts it, a first skip drops it. */
export const TASTE_PRIOR = 0.5;
export const ALPHA = { vote: 0.2, skip: 0.15 } as const;
export const SIGNAL = { vote: 1, skip: 0 } as const;

/** One exponential-moving-average step. weight ← α·signal + (1−α)·weight. */
export function ema(prev: number, signal: number, alpha: number): number {
  return alpha * signal + (1 - alpha) * prev;
}
