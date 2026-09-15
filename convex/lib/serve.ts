/**
 * Serve order: the shuffles and interleaves that turn a score order into an
 * order somebody can sit through. Split from the ranker so each stays small
 * enough to read at once.
 */

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

