/** Small pure helpers the views share. No state, no fetching. */

export type Side = "love" | "hate";

/**
 * Free votes a topic needs before its crowd can be read.
 *
 * Mirrors `MIN_ROOM` in `convex/calls.ts`, which is the authority — the server
 * refuses to grade a smaller room whatever the client believes, so the worst a
 * drift here can do is offer a call that comes back ungraded.
 */
export const MIN_ROOM = 5;

export function fmtInt(n: number): string {
  return new Intl.NumberFormat("en-US").format(n);
}

/** Cents to a readable amount. Money is integer cents everywhere else. */
export function fmtMoney(cents: number): string {
  return cents % 100 === 0
    ? `$${cents / 100}`
    : `$${(cents / 100).toFixed(2)}`;
}

/** Two percentages that always add to 100, so the bars never leave a sliver. */
export function pct(love: number, hate: number): [number, number] {
  const total = love + hate;
  if (total === 0) return [50, 50];
  const l = Math.round((love / total) * 100);
  return [l, 100 - l];
}

/** The word for a split. What the result stamp says out loud. */
export function verdict(love: number, hate: number): string {
  const [l] = pct(love, hate);
  if (love + hate === 0) return "No votes yet";
  if (l >= 80) return "Adored";
  if (l >= 62) return "Liked";
  if (l > 55) return "Leans love";
  if (l >= 45) return "Dead split";
  if (l > 38) return "Leans hate";
  if (l > 20) return "Disliked";
  return "Despised";
}

/**
 * A country's flag, from its ISO code.
 *
 * The house rule is no emoji anywhere — with exactly one exception, which is
 * this: a country is always shown with its flag. Two regional-indicator code
 * points, nothing else, so any valid alpha-2 code works without a lookup table.
 *
 * Returns a white flag for anything that is not a two-letter code, so an
 * unknown or unset country renders as a placeholder rather than as mojibake.
 */
export function flagEmoji(code: string): string {
  if (!/^[A-Za-z]{2}$/.test(code)) return "\u{1F3F3}\uFE0F";
  return String.fromCodePoint(
    ...[...code.toUpperCase()].map((c) => 0x1f1e6 + c.charCodeAt(0) - 65),
  );
}

/** The uppercase ISO code, or `??`. Shown beside the flag, never instead of it. */
export function countryCode(code: string): string {
  return /^[A-Za-z]{2}$/.test(code) ? code.toUpperCase() : "??";
}

export function fmtShortDate(ms: number): string {
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
  }).format(ms);
}

/**
 * A player's rank, derived from topics actually backed with a spark.
 *
 * Presentation over a real number, never a separate score to keep in step: the
 * only way to climb is to put money behind an opinion, which is the behaviour
 * the product is for. Titles change; the number under them is the truth.
 */
export function rankOf(topicsBacked: number): { title: string } {
  if (topicsBacked >= 100) return { title: "Zealot" };
  if (topicsBacked >= 50) return { title: "Veteran" };
  if (topicsBacked >= 20) return { title: "Backer" };
  if (topicsBacked >= 5) return { title: "Regular" };
  if (topicsBacked >= 1) return { title: "Rookie" };
  return { title: "Spectator" };
}

