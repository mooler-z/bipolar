/**
 * The words a percentage is worth saying out loud.
 *
 * A page of numbers is a page nobody repeats. "Ethiopia despises it" travels;
 * "Ethiopia 8%" does not — and the two say the same thing, except the first
 * one lands. So the atlas leads with the word and keeps the number beside it
 * in small type as the evidence for it.
 *
 * Three scales, because a percentage means three different things depending
 * on what it is counting:
 *
 *   **What a country makes of something** — a verb. It *adores* this, it
 *   *despises* that.
 *   **What a country is like** — a noun. Somewhere that loves most of what it
 *   sees is *a softie*; somewhere that hates most of it is *a hater*.
 *   **How two countries get on** — an adjective. Ninety per cent agreement is
 *   not "90%", it is *inseparable*.
 *
 * Pure and tested, because a scale with an off-by-one at a boundary calls a
 * country a hater for liking something, and that is the sort of error that is
 * invisible in review and obvious on screen.
 */

/** Which side of the line a lean falls on. Fifty exactly is love's, by the
    same convention the reveal uses. */
export function sideOf(lovePct: number): "love" | "hate" {
  return lovePct >= 50 ? "love" : "hate";
}

/**
 * The share that is actually being claimed.
 *
 * A country at 8% love is not "8%" of anything anybody cares about — it is
 * 92% against. The word carries the direction, so the number beside it has to
 * agree with the word rather than contradict it.
 */
export function strengthOf(lovePct: number): number {
  return sideOf(lovePct) === "love" ? lovePct : 100 - lovePct;
}

type Band = { at: number; word: string };

/** Read top down; the first band a value reaches is its word. */
function pick(bands: Band[], value: number): string {
  for (const b of bands) if (value >= b.at) return b.word;
  return bands[bands.length - 1]!.word;
}

/* ── what a country makes of something ──────────────────────────────────── */

const DOES: Band[] = [
  { at: 92, word: "worships" },
  { at: 84, word: "adores" },
  { at: 74, word: "loves" },
  { at: 64, word: "likes" },
  { at: 56, word: "warms to" },
  { at: 45, word: "is split on" },
  { at: 37, word: "cools on" },
  { at: 27, word: "dislikes" },
  { at: 17, word: "hates" },
  { at: 8, word: "can't stand" },
  { at: 0, word: "despises" },
];

/** "Ethiopia **despises** questions about the United States." */
export function leanWord(lovePct: number): string {
  return pick(DOES, lovePct);
}

/* ── what a country is like ─────────────────────────────────────────────── */

const IS: Band[] = [
  { at: 92, word: "a devotee" },
  { at: 84, word: "a romantic" },
  { at: 74, word: "a lover" },
  { at: 64, word: "a softie" },
  { at: 56, word: "easily pleased" },
  { at: 45, word: "a fence-sitter" },
  { at: 37, word: "hard to please" },
  { at: 27, word: "a sceptic" },
  { at: 17, word: "a cynic" },
  { at: 8, word: "a hater" },
  { at: 0, word: "impossible" },
];

/** "Ethiopia is **a sceptic**." */
export function moodWord(lovePct: number): string {
  return pick(IS, lovePct);
}

/* ── how two countries get on ───────────────────────────────────────────── */

const TOGETHER: Band[] = [
  { at: 88, word: "inseparable" },
  { at: 76, word: "kindred" },
  { at: 64, word: "friendly" },
  { at: 56, word: "civil" },
  { at: 44, word: "indifferent" },
  { at: 36, word: "wary" },
  { at: 26, word: "at odds" },
  { at: 14, word: "hostile" },
  { at: 0, word: "sworn enemies" },
];

/** "Russia and Ukraine are **at odds**." */
export function agreeWord(agreement: number): string {
  return pick(TOGETHER, agreement);
}

/**
 * How loud a word is allowed to be, 0–1.
 *
 * Nothing uses this to hide a number; it is what lets the strongest verdicts
 * be set larger than the lukewarm ones, so a page of words still has a
 * hierarchy rather than reading as one flat list of adjectives.
 */
export function heat(lovePct: number): number {
  return Math.min(1, Math.abs(lovePct - 50) / 45);
}
