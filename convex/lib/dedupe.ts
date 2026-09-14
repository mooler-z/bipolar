import { DISCOVERY } from "../config";

/**
 * Is this question already in the feed?
 *
 * Discovery reads the open web, and the open web writes the same story twenty
 * times in a morning. The URL ledger stops the same *page* being minted twice;
 * it does nothing about twenty pages that are all about the same argument. Left
 * alone, a busy news day fills the feed with one question phrased six ways, and
 * a reader answering the same thing six times stops believing the feed.
 *
 * Two comparisons, both on a **key** rather than on the sentence:
 *
 *   `keyOf` throws away everything that is not the subject — punctuation,
 *   casing, the function words, the order. "Is pineapple on pizza good?" and
 *   "Pineapple on a pizza?" become the same string, so an exact match catches a
 *   rewording, and an index can do it in one read.
 *
 *   `overlap` catches the rest. Two keys that share most of their words are the
 *   same argument even when neither is a rewording of the other, and the share
 *   is a Jaccard ratio so a long question and a short one are still comparable.
 *
 * Both are pure, and live here rather than in the pipeline, because a rule this
 * consequential should be testable without a network.
 */

/**
 * Words that never decide what a question is about.
 *
 * Deliberately short. Stripping a word that carries meaning — "ban", "free",
 * "war" — would collapse two arguments that are genuinely different, which is
 * the one failure this file must not have.
 */
const STOP = new Set([
  "a", "an", "and", "are", "as", "at", "be", "been", "being", "but", "by",
  "did", "do", "does", "for", "from", "had", "has", "have", "he", "her",
  "hers", "him", "his", "how", "i", "if", "in", "into", "is", "it", "its",
  "me", "my", "of", "on", "or", "our", "ours", "out", "over", "re", "she",
  "should", "so", "than", "that", "the", "their", "theirs", "them", "then",
  "there", "these", "they", "this", "those", "to", "too", "up", "us", "ve",
  "was", "we", "were", "what", "when", "where", "which", "who", "whom",
  "why", "will", "with", "would", "you", "your", "yours",
]);

/**
 * The subject of a question, as a canonical string.
 *
 * Sorted and de-duplicated, so word order and repetition cannot make two
 * identical subjects look different. Falls back to the flattened sentence when
 * a question is nothing but function words, because a key of `""` would match
 * every other empty key and quietly reject unrelated questions.
 */
export function keyOf(question: string): string {
  const words = question
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9\s]/g, " ")
    .split(/\s+/)
    .filter((w) => w.length > 1 && !STOP.has(w));

  const key = Array.from(new Set(words)).sort().join(" ");
  return key || question.toLowerCase().replace(/\s+/g, " ").trim();
}

/** How much two keys share, 0 to 1. Jaccard: shared over everything either has. */
export function overlap(a: string, b: string): number {
  if (!a || !b) return 0;
  if (a === b) return 1;

  const left = new Set(a.split(" "));
  const right = new Set(b.split(" "));
  let shared = 0;
  for (const word of left) if (right.has(word)) shared += 1;
  return shared / (left.size + right.size - shared);
}

/**
 * Has this argument been made already?
 *
 * `known` is a list of keys, newest first, held in memory for the length of one
 * crawling session — including the keys of anything minted earlier in that same
 * session, so two findings about one story cannot both get through.
 */
export function alreadyAsked(
  key: string,
  known: readonly string[],
  threshold: number = DISCOVERY.sameness,
): boolean {
  return known.some((other) => overlap(key, other) >= threshold);
}
