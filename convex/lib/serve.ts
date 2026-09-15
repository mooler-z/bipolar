/**
 * Serve order: the shuffles and interleaves that turn a score order into an
 * order somebody can sit through. Split from the ranker so each stays small
 * enough to read at once.
 */

export const MAX_RUN = 2; // consecutive cards from one category
export const EPSILON = 0.16; // chance a slot is a discovery pick

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
 * How little is known about a candidate: 1 is a total stranger, and it falls
 * away fast as evidence arrives.
 *
 * Tags count double. A category is coarse — "culture" covers a pop star and a
 * building — and it is the tags that say what a reader has actually been
 * answering, which on a feed that has learned somebody likes famous people is
 * the difference between "another one" and "something else".
 */
export function noveltyOf(seenCategory: number, seenTags: number): number {
  return 1 / (1 + seenCategory + seenTags * 2);
}

/**
 * Greedy from the score order, with two corrections.
 *
 * A third card in a row from one category is skipped past, because a feed that
 * serves six food questions reads as broken however well each one scored.
 *
 * And roughly one slot in six is a **discovery pick**. This is the correction
 * that matters: without it a ranker only ever confirms what it already
 * believes about you, and a reader who answered a few questions about famous
 * people is served famous people until they stop coming.
 *
 * What a discovery pick *is* has changed twice. It used to reach into the
 * bottom half of the score order, which sounds like exploring and is not — the
 * bottom half of a board that has learned one taste is the same taste, scored
 * worse. Then it took whatever the *reader* had said least about, which is
 * right and is not enough: a reader with no history at all has said nothing
 * about anything, so every candidate tied and the pick was a coin toss over a
 * catalogue that is three-quarters one kind of question.
 *
 * So it is both. A discovery pick takes the candidate that is strangest
 * **against what this serve has already handed out** — least-served category,
 * least-served tags, tags counting double — with the reader's own evidence
 * added on top as the tie-break. That works on the first visit, when there is
 * nothing to know about somebody, and it keeps working on the thousandth.
 *
 * Nothing is ever dropped; deterministic for a given seed.
 */
export function interleave(
  items: {
    id: string;
    score: number;
    categoryId: string;
    /** What the question is about. The category is too coarse on its own. */
    tags?: string[];
    /** From `noveltyOf`: how little the *reader* has said about this. */
    novelty?: number;
  }[],
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

  /* What this serve has handed out so far. A queue of thirteen famous people
     is thirteen cards that each looked reasonable on their own. */
  const servedCat = new Map<string, number>();
  const servedTag = new Map<string, number>();
  const strangeness = (p: (typeof pool)[number]) => {
    let seen = servedCat.get(p.categoryId) ?? 0;
    for (const t of p.tags ?? []) seen += 2 * (servedTag.get(t) ?? 0);
    return 1 / (1 + seen) + (p.novelty ?? 0);
  };

  while (pool.length > 0) {
    let idx = 0;
    if (pool.length > 3 && rng() < epsilon) {
      const best = pool.reduce((n, p) => Math.max(n, strangeness(p)), 0);
      // Everything joint-strangest, and one of them at random: picking the
      // first would make "the stranger" the same stranger every time.
      const strangers = pool
        .map((p, i) => (strangeness(p) === best ? i : -1))
        .filter((i) => i >= 0);
      idx = strangers[Math.floor(rng() * strangers.length)];
    } else if (lastCat !== null && run >= maxRun && pool[0].categoryId === lastCat) {
      const alt = pool.findIndex((p) => p.categoryId !== lastCat);
      idx = alt === -1 ? 0 : alt;
    }
    const picked = pool.splice(idx, 1)[0];
    servedCat.set(picked.categoryId, (servedCat.get(picked.categoryId) ?? 0) + 1);
    for (const t of picked.tags ?? []) servedTag.set(t, (servedTag.get(t) ?? 0) + 1);
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

