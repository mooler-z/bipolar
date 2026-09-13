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

export type Weights = {
  affinity: number;
  tension: number;
  velocity: number;
  freshness: number;
  featured: number;
  country: number;
  provocation: number;
  skip: number;
};

export const WEIGHTS: Weights = {
  affinity: 0.3,
  tension: 0.25,
  velocity: 0.15,
  freshness: 0.12,
  featured: 0.1,
  country: 0.08,
  provocation: 0.1,
  skip: 0.2, // a penalty, subtracted
};

export type Candidate = {
  id: string;
  categoryId: string;
  createdAtMs: number;
  isFeatured: boolean;
  isLocked: boolean;
  closesAtMs: number | null;
  scopeCountry: string | null;
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
};

export type Terms = {
  affinity: number;
  tension: number;
  velocity: number;
  freshness: number;
  featured: number;
  country: number;
  provocation: number;
  skip: number;
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

  const base =
    w.affinity * affinity +
    w.tension * tension +
    w.velocity * velocity +
    w.freshness * freshness +
    w.featured * featured +
    w.country * country +
    w.provocation * provocation -
    w.skip * skip;

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
      tension,
      velocity,
      freshness,
      featured,
      country,
      provocation,
      skip,
      reach,
    },
  };
}

/* ── Serve order ────────────────────────────────────────────────────────── */

export const MAX_RUN = 2; // consecutive cards from one category
export const EPSILON = 0.1; // chance a slot is a discovery pick

/** FNV-1a, so a reader's order is stable within a day and different the next. */
export function hashSeed(s: string): number {
  let h = 0x811c9dc5;
  for (let i = 0; i < s.length; i += 1) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  return h >>> 0;
}

function mulberry32(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/**
 * Greedy from the score order, with two corrections.
 *
 * A third card in a row from one category is skipped past, because a feed that
 * serves six food questions reads as broken however well each one scored. And
 * one slot in ten pulls from the lower half — without it a ranker only ever
 * confirms what it already believes about you, and taste stops moving.
 *
 * Nothing is ever dropped; deterministic for a given seed.
 */
export function interleave(
  items: { id: string; score: number; categoryId: string }[],
  opts: { seed: number; maxRun?: number; epsilon?: number },
): string[] {
  const maxRun = opts.maxRun ?? MAX_RUN;
  const epsilon = opts.epsilon ?? EPSILON;
  const rng = mulberry32(opts.seed);
  const pool = [...items].sort(
    (a, b) => b.score - a.score || (a.id < b.id ? -1 : 1),
  );

  const out: string[] = [];
  let lastCat: string | null = null;
  let run = 0;

  while (pool.length > 0) {
    let idx = 0;
    if (pool.length > 3 && rng() < epsilon) {
      const lo = Math.floor(pool.length / 2);
      idx = lo + Math.floor(rng() * (pool.length - lo));
    } else if (lastCat !== null && run >= maxRun && pool[0].categoryId === lastCat) {
      const alt = pool.findIndex((p) => p.categoryId !== lastCat);
      idx = alt === -1 ? 0 : alt;
    }
    const picked = pool.splice(idx, 1)[0];
    if (picked.categoryId === lastCat) run += 1;
    else {
      lastCat = picked.categoryId;
      run = 1;
    }
    out.push(picked.id);
  }
  return out;
}

/**
 * A stable pseudo-random number in [0,1) for one id under one seed.
 *
 * Used to break near-ties differently on every visit. Without it a ranker is
 * deterministic to a fault: the same reader opens the app and meets the same
 * question, forever, because nothing about their situation changed between one
 * load and the next.
 */
export function jitter(seed: string, id: string): number {
  return mulberry32(hashSeed(`${seed}:${id}`))();
}

/** How much of a topic's score a reshuffle may move. Enough to reorder
 *  near-ties, never enough to float a bad topic over a good one. */
export const JITTER = 0.06;

/** A seeded shuffle. Deterministic for a seed, uniform, and never drops. */
export function seededShuffle<T>(items: T[], seed: number): T[] {
  const rng = mulberry32(seed);
  const out = [...items];
  for (let i = out.length - 1; i > 0; i -= 1) {
    const j = Math.floor(rng() * (i + 1));
    [out[i], out[j]] = [out[j], out[i]];
  }
  return out;
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
