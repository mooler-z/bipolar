import worldMap from "../data/world-map.json";

/**
 * Turning tallies into sentences.
 *
 * A percentage is a fact; "Japan hated it most" is a claim somebody will repeat
 * out loud, and repeating it out loud is the entire growth mechanic. Everything
 * here is a pure function over counts, so the same numbers always produce the
 * same sentence and nothing has to be stored.
 */

const ATLAS = new Map(worldMap.countries.map((c) => [c.code, c.name]));

export function countryName(code: string): string {
  return ATLAS.get(code.toUpperCase()) ?? code.toUpperCase();
}

/* ── The verdict ────────────────────────────────────────────────────────── */

export type Verdict = {
  label: string;
  side: "love" | "hate" | null;
  margin: number;
};

/**
 * A race call, not an adjective.
 *
 * Borrowed from how elections are described, because it is the one vocabulary
 * everybody already reads correctly: a four-point win is a tossup and a
 * forty-point win is a landslide, and "Adored" says neither.
 */
export function verdictOf(love: number, hate: number): Verdict {
  const total = love + hate;
  const lovePct = total ? Math.round((love / total) * 100) : 50;
  const margin = Math.abs(lovePct - 50);
  const side = lovePct === 50 ? null : lovePct > 50 ? "love" : "hate";
  const word = side ? (side === "love" ? "LOVE" : "HATE") : "";

  if (total === 0) return { label: "NO VOTES", side: null, margin: 0 };
  if (margin < 5) return { label: "TOSSUP", side: null, margin };
  if (margin < 15) return { label: `LEAN ${word}`, side, margin };
  if (margin < 30) return { label: `SOLID ${word}`, side, margin };
  return { label: `LANDSLIDE ${word}`, side, margin };
}

/* ── The country board ──────────────────────────────────────────────────── */

export type CountryRow = {
  countryCode: string;
  love: number;
  hate: number;
  sparkLove: number;
  sparkHate: number;
};

export type CountryInsight = {
  code: string;
  name: string;
  love: number;
  hate: number;
  total: number;
  lovePct: number;
  hatePct: number;
  lean: "love" | "hate" | "split";
  /** How lopsided, in points. */
  margin: number;
  sparkLove: number;
  sparkHate: number;
  sparkTotal: number;
  sparkLovePct: number;
};

function share(love: number, hate: number): number {
  const total = love + hate;
  return total === 0 ? 50 : Math.round((love / total) * 100);
}

export function toInsight(row: CountryRow): CountryInsight {
  const lovePct = share(row.love, row.hate);
  return {
    code: row.countryCode,
    name: countryName(row.countryCode),
    love: row.love,
    hate: row.hate,
    total: row.love + row.hate,
    lovePct,
    hatePct: 100 - lovePct,
    lean: lovePct >= 55 ? "love" : lovePct <= 45 ? "hate" : "split",
    margin: Math.abs(lovePct - (100 - lovePct)),
    sparkLove: row.sparkLove,
    sparkHate: row.sparkHate,
    sparkTotal: row.sparkLove + row.sparkHate,
    sparkLovePct: share(row.sparkLove, row.sparkHate),
  };
}

export type Board = {
  countries: CountryInsight[];
  mostLoved: CountryInsight | null;
  mostHated: CountryInsight | null;
  mostPolarized: CountryInsight | null;
  mostActive: CountryInsight | null;
};

function maxBy<T>(rows: T[], f: (x: T) => number): T | null {
  return rows.length === 0 ? null : rows.reduce((a, b) => (f(b) > f(a) ? b : a));
}

/**
 * `minVotes` is a floor, not a filter for tidiness: one person in a country is
 * not that country's opinion, and calling it one produces exactly the kind of
 * confident nonsense this product would deserve to be mocked for.
 */
export function buildBoard(rows: CountryRow[], minVotes = 3): Board {
  const all = rows.map(toInsight).filter((c) => c.total > 0);
  const ranked = all.filter((c) => c.total >= minVotes);

  return {
    countries: all.sort((a, b) => b.total - a.total),
    mostLoved: maxBy(ranked, (c) => c.lovePct),
    mostHated: maxBy(ranked, (c) => c.hatePct),
    mostPolarized: maxBy(ranked, (c) => c.margin),
    mostActive: maxBy(ranked, (c) => c.total),
  };
}

/* ── The sentences ──────────────────────────────────────────────────────── */

/**
 * "🇯🇵 Japan hates it — 78% against, across 41 votes."
 *
 * The flag leads because a country named in a sentence should be recognisable
 * before the sentence is read — it is the one place emoji earn their keep here.
 */
export function phraseCountry(c: CountryInsight): string {
  const votes = `${c.total} ${c.total === 1 ? "vote" : "votes"}`;
  const who = `${c.name}`;
  if (c.lean === "split") {
    return `${who} cannot decide — ${c.lovePct}/${c.hatePct} across ${votes}.`;
  }
  const verb = c.lean === "love" ? "loves it" : "hates it";
  const pct = c.lean === "love" ? c.lovePct : c.hatePct;
  return `${who} ${verb} — ${pct}% ${c.lean === "love" ? "for" : "against"}, across ${votes}.`;
}

/**
 * The headline a result is worth sharing for.
 *
 * Prefers the sharpest true thing available: a country at odds with the world
 * beats a country that merely agrees with it loudly, because disagreement is
 * what people repeat.
 */
export function headline(board: Board, globalLovePct: number): string | null {
  const { mostLoved, mostHated, mostPolarized } = board;
  if (!mostLoved || !mostHated) return null;

  const worldSide = globalLovePct >= 50 ? "love" : "hate";
  const rebel = worldSide === "love" ? mostHated : mostLoved;

  // A country going the other way to the whole world is the best line there is.
  if (rebel && rebel.lean !== "split" && rebel.lean !== worldSide) {
    const pct = rebel.lean === "love" ? rebel.lovePct : rebel.hatePct;
    return `The world says ${worldSide}. ${rebel.name} says ${rebel.lean} — ${pct}%.`;
  }

  if (mostPolarized && mostPolarized.margin >= 40) {
    const pct =
      mostPolarized.lean === "love"
        ? mostPolarized.lovePct
        : mostPolarized.hatePct;
    return `${mostPolarized.name} is the least divided — ${pct}% one way.`;
  }

  const top = worldSide === "love" ? mostLoved : mostHated;
  const pct = worldSide === "love" ? top.lovePct : top.hatePct;
  return `${top.name} feels it hardest — ${pct}% ${worldSide}.`;
}

/**
 * How the money differs from the mouth, for one country.
 *
 * The product's whole claim is that paying changes what people admit to, so
 * when a country's sparks disagree with its free votes that is the single most
 * interesting fact on the page.
 */
export function phraseSparkGap(c: CountryInsight): string | null {
  if (c.sparkTotal < 3) return null;
  const gap = c.sparkLovePct - c.lovePct;
  if (Math.abs(gap) < 12) return null;
  const direction = gap > 0 ? "warmer" : "colder";
  return `${c.name}'s money runs ${direction} than its mouth — ${c.sparkLovePct}% love when it costs 50¢, ${c.lovePct}% when it is free.`;
}
