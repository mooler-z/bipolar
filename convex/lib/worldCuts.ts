/**
 * The fun cuts, as pure arithmetic.
 *
 * Every one of these takes rows and returns a board. No database, no context,
 * no clock — which is what makes a page of superlatives testable at all. A
 * "most divided country" that is quietly wrong is not something anybody
 * notices by looking at it; it has to be asserted.
 *
 * **One rule runs through all of it: aggregate, never single out.** A topic's
 * own love/hate split is what voting or paying for a peek buys, and this page
 * is public. So a country's lean is summed across every topic it has voted on,
 * a pair's agreement is averaged over the topics they share, and a topic named
 * here carries its volume — which the leaderboards already publish — and never
 * its split. Nothing on this page can be arithmetic'd back into a single
 * topic's answer.
 *
 * `ZZ` is the sentinel for "country unknown" and is dropped everywhere. It is
 * not a place, and left in it wins every board by volume.
 */

export type StatRow = {
  topicId: string;
  countryCode: string;
  freeLove: number;
  freeHate: number;
  paidLove: number;
  paidHate: number;
};

export type TopicRow = {
  _id: string;
  slug: string;
  question: string;
  /** The country the topic is *about*. Absent means the whole world. */
  scopeCountry?: string;
  categorySlug: string;
};

export const UNKNOWN = "ZZ";

/** Whole numbers that add to 100, and a flag for "nobody has spoken". */
export function lean(love: number, hate: number): { lovePct: number; votes: number } {
  const votes = love + hate;
  return { lovePct: votes === 0 ? 50 : Math.round((love / votes) * 100), votes };
}

function loveOf(r: StatRow): number {
  return r.freeLove + r.paidLove;
}
function hateOf(r: StatRow): number {
  return r.freeHate + r.paidHate;
}

export type CountryLean = {
  code: string;
  love: number;
  hate: number;
  votes: number;
  lovePct: number;
  /** How many distinct topics this country has voted on. */
  topics: number;
};

/** Every voting country, summed over everything it has ever answered. */
export function byCountry(rows: StatRow[]): CountryLean[] {
  const acc = new Map<string, { love: number; hate: number; topics: Set<string> }>();
  for (const r of rows) {
    if (r.countryCode === UNKNOWN) continue;
    const love = loveOf(r);
    const hate = hateOf(r);
    if (love + hate === 0) continue;
    const at = acc.get(r.countryCode) ?? { love: 0, hate: 0, topics: new Set<string>() };
    at.love += love;
    at.hate += hate;
    at.topics.add(r.topicId);
    acc.set(r.countryCode, at);
  }
  return [...acc]
    .map(([code, a]) => ({
      code,
      love: a.love,
      hate: a.hate,
      topics: a.topics.size,
      ...lean(a.love, a.hate),
    }))
    .sort((x, y) => y.votes - x.votes);
}

export type Verdict = {
  /** Who is voting. */
  from: string;
  /** Who they are voting *about*. */
  about: string;
  votes: number;
  lovePct: number;
  /** How many distinct topics about `about` this country has answered. */
  topics: number;
};

/**
 * What each country thinks of each other country.
 *
 * The one board that is literally what it sounds like, and it exists because a
 * topic here knows who it is about. Not an inference from disagreement — it is
 * Ethiopia's actual lean across every question that was about the United
 * States. Summed over topics, so it says nothing about any single one.
 *
 * `floor` keeps a board of accidents out, and it has to be set higher than
 * feels necessary. At three, the board filled with rows reading 0% over four
 * votes — four different countries "hating" the same place because four
 * questions about it happened to go one way — and the actual rivalries sat
 * underneath them. The strongest-looking rows are always the ones with the
 * least behind them, so the floor is what decides whether this board says
 * anything at all.
 */
export function verdicts(
  rows: StatRow[],
  topics: Map<string, TopicRow>,
  floor = 6,
): Verdict[] {
  const acc = new Map<string, { love: number; hate: number; topics: Set<string> }>();
  for (const r of rows) {
    if (r.countryCode === UNKNOWN) continue;
    const topic = topics.get(r.topicId);
    const about = topic?.scopeCountry;
    if (!about || about === UNKNOWN) continue;
    // A country voting on a topic about itself is a different question, and a
    // more interesting one — it is kept and labelled rather than dropped.
    const love = loveOf(r);
    const hate = hateOf(r);
    if (love + hate === 0) continue;
    const key = `${r.countryCode}>${about}`;
    const at = acc.get(key) ?? { love: 0, hate: 0, topics: new Set<string>() };
    at.love += love;
    at.hate += hate;
    at.topics.add(r.topicId);
    acc.set(key, at);
  }

  return [...acc]
    .map(([key, a]) => {
      const [from, about] = key.split(">") as [string, string];
      return { from, about, topics: a.topics.size, ...lean(a.love, a.hate) };
    })
    .filter((v) => v.votes >= floor)
    .sort((x, y) => x.lovePct - y.lovePct || y.votes - x.votes);
}

export type Pair = {
  a: string;
  b: string;
  /** 0–100. How closely the two leaned the same way, averaged over shared topics. */
  agreement: number;
  shared: number;
  /** On how many of those they landed on the same side of fifty. */
  sameSide: number;
};

/**
 * Which two countries argue, and which two are the same country twice.
 *
 * Agreement is the average closeness of their leans across topics they have
 * both answered — 100 means identical every time. `sameSide` is the blunter
 * version: how often they simply agreed on love or hate.
 *
 * Needs at least `floor` shared topics. Two countries that overlap on one
 * question are not rivals, they are a coincidence.
 */
export function pairs(rows: StatRow[], floor = 3): Pair[] {
  const byTopic = new Map<string, { code: string; lovePct: number }[]>();
  for (const r of rows) {
    if (r.countryCode === UNKNOWN) continue;
    const love = loveOf(r);
    const hate = hateOf(r);
    if (love + hate === 0) continue;
    const list = byTopic.get(r.topicId) ?? [];
    list.push({ code: r.countryCode, lovePct: lean(love, hate).lovePct });
    byTopic.set(r.topicId, list);
  }

  const acc = new Map<string, { close: number; shared: number; same: number }>();
  for (const list of byTopic.values()) {
    const sorted = [...list].sort((x, y) => x.code.localeCompare(y.code));
    for (let i = 0; i < sorted.length; i++) {
      for (let j = i + 1; j < sorted.length; j++) {
        const a = sorted[i]!;
        const b = sorted[j]!;
        const key = `${a.code}|${b.code}`;
        const at = acc.get(key) ?? { close: 0, shared: 0, same: 0 };
        at.close += 100 - Math.abs(a.lovePct - b.lovePct);
        at.shared += 1;
        if (a.lovePct > 50 === b.lovePct > 50) at.same += 1;
        acc.set(key, at);
      }
    }
  }

  return [...acc]
    .map(([key, a]) => {
      const [x, y] = key.split("|") as [string, string];
      return {
        a: x,
        b: y,
        agreement: Math.round(a.close / a.shared),
        shared: a.shared,
        sameSide: a.same,
      };
    })
    .filter((p) => p.shared >= floor)
    .sort((x, y) => x.agreement - y.agreement);
}

export type CategoryLean = {
  slug: string;
  votes: number;
  lovePct: number;
  topics: number;
};

/** Which subjects the world likes, and which it came here to argue about. */
export function byCategory(rows: StatRow[], topics: Map<string, TopicRow>): CategoryLean[] {
  const acc = new Map<string, { love: number; hate: number; topics: Set<string> }>();
  for (const r of rows) {
    if (r.countryCode === UNKNOWN) continue;
    const topic = topics.get(r.topicId);
    if (!topic) continue;
    const love = loveOf(r);
    const hate = hateOf(r);
    if (love + hate === 0) continue;
    const at = acc.get(topic.categorySlug) ?? { love: 0, hate: 0, topics: new Set<string>() };
    at.love += love;
    at.hate += hate;
    at.topics.add(r.topicId);
    acc.set(topic.categorySlug, at);
  }
  return [...acc]
    .map(([slug, a]) => ({ slug, topics: a.topics.size, ...lean(a.love, a.hate) }))
    .sort((x, y) => y.votes - x.votes);
}
