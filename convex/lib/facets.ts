import { v, type Validator } from "convex/values";

/**
 * What a question is *about*, past its words.
 *
 * The boards could say who loves a thing and never what kind of thing it was,
 * so every cut across the catalogue had to be a cut across one question at a
 * time. These are the attributes that let a reading be specific: not "who is
 * most hated" but "are women in politics judged more harshly than men", "do
 * founders travel better than heads of state", "is a premium phone forgiven
 * things a cheap one is not".
 *
 * Every field is optional and every field is a **closed vocabulary** where it
 * can be one. A free-text facet is a facet nobody can group by, and grouping
 * is the entire reason these exist.
 *
 * ── What is deliberately not here ────────────────────────────────────────
 * **Race and ethnicity.** A catalogue of named people, tagged by race, with a
 * board that ranks by how hated each group is, is a machine for ranking
 * hatred of ethnic groups — and it would be the product's most shareable
 * page. Nationality is here, because a question about Netanyahu genuinely is
 * a question about Israel and the atlas is built on that; a person's race is
 * not the subject of any question in this catalogue. The same reasoning keeps
 * a person's religion out. Gender is here because "are women judged more
 * harshly" is a real question with a real literature, asked about people who
 * are public figures by choice.
 * ─────────────────────────────────────────────────────────────────────────
 */

/** What sort of thing the question is about. */
export const KINDS = ["person", "product", "event", "idea", "place", "org", "media"] as const;
/** As publicly stated by the person themselves. */
export const GENDERS = ["female", "male", "nonbinary"] as const;
/** What they are argued about *for*. */
export const ROLES = [
  "head-of-state", "politician", "official", "founder", "executive", "investor",
  "economist", "athlete", "musician", "actor", "author", "journalist",
  "commentator", "academic", "activist", "royal", "religious", "criminal",
] as const;
/** Where a public political figure sits, where that is public. */
export const LEANS = ["left", "centre", "right", "none"] as const;
/** What it costs, relative to its own shelf. */
export const PRICE_BANDS = ["free", "budget", "mid", "premium", "luxury"] as const;
/** What the argument is actually about. */
export const AXES = [
  "money", "power", "speech", "war", "identity", "environment", "technology",
  "health", "faith", "taste", "safety", "privacy",
] as const;
/** How far the argument reaches. */
export const SCALES = ["global", "regional", "national", "niche"] as const;
/** Who is in the room for it. */
export const AUDIENCES = ["everyone", "enthusiast", "expert"] as const;
/** How the question got here: written by hand, or found on the live web. */
export const ORIGINS = ["written", "crawled"] as const;

/** The world, in the pieces the atlas already thinks in. */
export const REGIONS = [
  "africa", "asia", "europe", "middle-east", "north-america", "south-america",
  "oceania", "global",
] as const;

/** Which region a country belongs to. Coarse on purpose: a reading grouped
    into twenty regions is twenty rows of one. */
const REGION_OF: Record<string, (typeof REGIONS)[number]> = {
  DZ: "africa", EG: "africa", ET: "africa", GH: "africa", KE: "africa", NG: "africa",
  RW: "africa", SN: "africa", SO: "africa", SD: "africa", TZ: "africa", UG: "africa",
  ZA: "africa", ZW: "africa", AO: "africa", MA: "africa", TN: "africa", LY: "africa",
  CN: "asia", JP: "asia", KR: "asia", KP: "asia", IN: "asia", PK: "asia", BD: "asia",
  ID: "asia", MY: "asia", PH: "asia", SG: "asia", TH: "asia", VN: "asia", TW: "asia",
  LK: "asia", NP: "asia", MM: "asia", KZ: "asia", AF: "asia",
  AL: "europe", AT: "europe", BE: "europe", BG: "europe", CH: "europe", CZ: "europe",
  DE: "europe", DK: "europe", EE: "europe", ES: "europe", EU: "europe", FI: "europe",
  FR: "europe", GB: "europe", GR: "europe", HR: "europe", HU: "europe", IE: "europe",
  IS: "europe", IT: "europe", LT: "europe", LV: "europe", NL: "europe", NO: "europe",
  PL: "europe", PT: "europe", RO: "europe", RS: "europe", RU: "europe", SE: "europe",
  SK: "europe", UA: "europe", BY: "europe",
  AE: "middle-east", BH: "middle-east", IL: "middle-east", IQ: "middle-east",
  IR: "middle-east", JO: "middle-east", KW: "middle-east", LB: "middle-east",
  OM: "middle-east", PS: "middle-east", QA: "middle-east", SA: "middle-east",
  SY: "middle-east", TR: "middle-east", YE: "middle-east",
  CA: "north-america", US: "north-america", MX: "north-america", CU: "north-america",
  AR: "south-america", BO: "south-america", BR: "south-america", CL: "south-america",
  CO: "south-america", PE: "south-america", VE: "south-america", UY: "south-america",
  AU: "oceania", NZ: "oceania",
};

export function regionOf(code: string | null | undefined): string | null {
  if (!code) return null;
  return REGION_OF[code.toUpperCase()] ?? null;
}

/** The decade something belongs to, from a year. */
export function eraOf(year: number | null | undefined): string | null {
  // Birkenstock is 1774 and the bicycle is 1817, so the floor is not the
  // nineteenth century. Everything before 1900 is one band, because a decade
  // is a useful unit for living memory and a useless one for a sandal.
  if (!year || year < 1500 || year > 2100) return null;
  if (year < 1900) return "pre-1900";
  return `${Math.floor(year / 10) * 10}s`;
}

/** An age in whole years, from a birth year and the clock. */
export function ageOf(bornYear: number | null | undefined, nowMs: number): number | null {
  if (!bornYear) return null;
  const age = new Date(nowMs).getUTCFullYear() - bornYear;
  return age > 0 && age < 130 ? age : null;
}

/** The bracket an age falls in. The number is for one person; the bracket
    is what a board can group by. */
export function ageBandOf(age: number | null): string | null {
  if (age === null) return null;
  if (age < 30) return "under-30";
  if (age < 45) return "30s-40s";
  if (age < 60) return "45-59";
  if (age < 75) return "60s-70s";
  return "75-plus";
}

/**
 * An optional "one of these words" validator, from a list of words.
 *
 * `v.union` wants at least two validators as separate arguments and a list is
 * neither, so the spread is helped along by hand. The cast is on the *shape*
 * of the argument list and not on the type of what it holds, which is what
 * keeps `Facets["gender"]` reading as the three words rather than as `string`.
 */
function one<T extends string>(list: readonly T[]) {
  const [first, second, ...rest] = list.map((s) => v.literal(s)) as unknown as [
    Validator<T>,
    Validator<T>,
    ...Validator<T>[],
  ];
  return v.optional(v.union(first, second, ...rest));
}

/** The twenty-two, as they sit on a topic. */
export const facets = v.object({
  kind: one(KINDS),                       //  1  person, product, event, idea…
  region: one(REGIONS),                   //  2  the part of the world
  nationality: v.optional(v.string()),    //  3  ISO alpha-2
  era: v.optional(v.string()),            //  4  the decade it belongs to
  year: v.optional(v.number()),           //  5  born, launched, or happened
  origin: one(ORIGINS),                   //  6  written by hand, or crawled
  gender: one(GENDERS),                   //  7  as publicly stated
  bornYear: v.optional(v.number()),       //  8
  ageBand: v.optional(v.string()),        //  9  the bracket, not the number
  role: one(ROLES),                       // 10  what they are argued about for
  living: v.optional(v.boolean()),        // 11
  lean: one(LEANS),                       // 12  where they stand, in public
  office: v.optional(v.string()),         // 13  the post held, where there is one
  prominentSince: v.optional(v.number()), // 14
  priceBand: one(PRICE_BANDS),            // 15  dear or cheap for its own shelf
  brand: v.optional(v.string()),          // 16
  maker: v.optional(v.string()),          // 17  ISO alpha-2 of who makes it
  form: v.optional(v.string()),           // 18  phone, car, console, shoe…
  platform: v.optional(v.string()),       // 19  the ecosystem it belongs to
  axis: one(AXES),                        // 20  what the argument is about
  scale: one(SCALES),                     // 21  how far it reaches
  audience: one(AUDIENCES),               // 22  who is in the room for it
});

export type Facets = typeof facets.type;

/** Every facet name, for the router's vocabulary and for the tests. */
export const FACET_NAMES = [
  "kind", "region", "nationality", "era", "year", "origin", "gender", "bornYear",
  "ageBand", "role", "living", "lean", "office", "prominentSince",
  "priceBand", "brand", "maker", "form", "platform", "axis", "scale",
  "audience",
] as const;
