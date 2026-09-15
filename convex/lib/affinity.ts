/**
 * What a reader's acts say about what they want, as pure arithmetic.
 *
 * The ranker used to learn one number per category, from votes and skips
 * only. That is a coarse instrument: "tech" is not a taste, "Musk" is, and a
 * reader who pulled a topic out of the room by hand has told you far more than
 * one who tapped through it. This module turns every kind of act into a
 * weight per **key** — a tag, a category, a country — with a strength that
 * matches how deliberate the act was, and gives the ranker two new terms to
 * read them with.
 *
 * Nothing here touches a database. The strengths and the metrics are tested as
 * arithmetic, and the replay in `recommend.ts` is what proves the arithmetic
 * describes real people.
 */

export type Act =
  | "vote"
  | "spark"
  | "skip"
  | "undo"
  | "pull"
  | "comment"
  | "reply"
  | "like"
  | "unlike"
  | "peek";

/**
 * How much each act moves a weight, and which way.
 *
 * Ordered by how deliberate it is. Pulling a topic out of the room is the
 * reader going and *getting* something; commenting is spending a quill on it;
 * a spark is money; a vote is a tap. A skip is a tap the other way. An undo is
 * mostly the vote taken back, with a little uncertainty left behind — the
 * reader looked twice, which is not nothing.
 */
export const STRENGTH: Record<Act, { signal: number; alpha: number }> = {
  pull: { signal: 1, alpha: 0.35 },
  comment: { signal: 1, alpha: 0.35 },
  /** Answering somebody costs a quill and takes a side. The strongest signal. */
  reply: { signal: 1, alpha: 0.38 },
  spark: { signal: 1, alpha: 0.3 },
  peek: { signal: 1, alpha: 0.2 },
  vote: { signal: 1, alpha: 0.2 },
  /** Free, and one tap — so it counts, but less than anything that was paid for. */
  like: { signal: 1, alpha: 0.12 },
  /**
   * Taking a like back, the same shape as an undo and gentler: the reader
   * looked twice. Without this a like could only ever be added, and a weight
   * that can rise but never fall is a weight that ends up saying nothing.
   */
  unlike: { signal: 0.4, alpha: 0.12 },
  undo: { signal: 0.35, alpha: 0.25 },
  skip: { signal: 0, alpha: 0.18 },
};

/** An untouched key sits neutral. */
export const PRIOR = 0.5;

/** One EMA step: weight ← α·signal + (1−α)·weight. */
export function step(prev: number | undefined, act: Act): number {
  const { signal, alpha } = STRENGTH[act];
  return alpha * signal + (1 - alpha) * (prev ?? PRIOR);
}

/** The keys an act about a topic teaches: its tags, its category, its country. */
export function keysOf(topic: {
  categoryId: string;
  tagSlugs?: string[] | null;
  scopeCountry?: string | null;
}): string[] {
  const keys = [`cat:${topic.categoryId}`];
  for (const t of topic.tagSlugs ?? []) keys.push(`tag:${t}`);
  if (topic.scopeCountry) keys.push(`cc:${topic.scopeCountry}`);
  return keys;
}

/**
 * How much this reader has liked what this topic is made of, in [0,1].
 *
 * The mean over the topic's known keys, tags counting double against the
 * category because a tag is the specific thing and the category the drawer
 * it lives in. `undefined` when the reader has touched none of it, so the
 * ranker can fall back to the onboarding answer rather than treating silence
 * as indifference.
 */
export function affinityOf(
  weights: Map<string, number>,
  topic: { categoryId: string; tagSlugs?: string[] | null; scopeCountry?: string | null },
): number | undefined {
  let sum = 0;
  let n = 0;
  for (const key of keysOf(topic)) {
    const w = weights.get(key);
    if (w === undefined) continue;
    const m = key.startsWith("tag:") ? 2 : 1;
    sum += w * m;
    n += m;
  }
  return n === 0 ? undefined : sum / n;
}

/**
 * Fatigue: the reader has been bouncing off this category *just now*.
 *
 * Two skips in the same category inside the window is a reader telling you,
 * in the only language a feed can hear, that they do not want this right now.
 * The long-run taste barely moves on two skips — it should not — but the next
 * card should. Returns [0,1]: 0 at no recent skips, 1 at three or more.
 */
export const FATIGUE_WINDOW_MS = 30 * 60 * 1000;

export function fatigueOf(
  recentSkips: { categoryId: string; atMs: number }[],
  categoryId: string,
  nowMs: number,
): number {
  let n = 0;
  for (const s of recentSkips) {
    if (s.categoryId === categoryId && nowMs - s.atMs <= FATIGUE_WINDOW_MS) n += 1;
  }
  return Math.min(1, n / 3);
}

/* ── Proof ──────────────────────────────────────────────────────────────── */

/**
 * How well an ordering predicted what the reader actually did.
 *
 * `rank` is the 1-based position of the topic the reader engaged with, among
 * everything they could have been shown at that moment. Mean reciprocal rank
 * rewards putting it first; hit@k asks only whether it was on the first
 * screen. Both are the standard yardsticks for exactly this question, and
 * neither can be gamed by the ranker that produced them.
 */
export function metrics(ranks: number[], k = 10): {
  n: number;
  mrr: number;
  hitAtK: number;
  medianRank: number;
} {
  if (ranks.length === 0) return { n: 0, mrr: 0, hitAtK: 0, medianRank: 0 };
  const mrr = ranks.reduce((s, r) => s + 1 / r, 0) / ranks.length;
  const hitAtK = ranks.filter((r) => r <= k).length / ranks.length;
  const sorted = [...ranks].sort((a, b) => a - b);
  const medianRank = sorted[Math.floor(sorted.length / 2)]!;
  return { n: ranks.length, mrr, hitAtK, medianRank };
}
