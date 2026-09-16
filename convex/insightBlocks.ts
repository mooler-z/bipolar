import { v } from "convex/values";

/**
 * What an answer is made of, and the board it is read from.
 *
 * Seven kinds of block, because one answer is rarely one shape: "who hates
 * China" wants a ranking *and* a map, and a country profile wants a dial, a
 * ranking and a head-to-head. The client renders whatever it is handed and
 * nothing here knows what any of them look like.
 *
 * Apart from `insightViews.ts` because that file is the choosing — which rows
 * a lens asks for — and this one is the vocabulary it chooses in.
 */

export const block = v.union(
  v.object({
    kind: v.literal("headline"),
    label: v.string(),
    value: v.string(),
    word: v.string(),
    tone: v.string(),
    flag: v.union(v.null(), v.string()),
  }),
  v.object({
    kind: v.literal("ranking"),
    title: v.string(),
    rows: v.array(
      v.object({
        code: v.string(),
        pct: v.number(),
        /* One or the other. A board summed over many questions publishes the
           count; a board about a single question publishes how much there is
           to trust and not how many people said it, which is the same line the
           topic page has always drawn. */
        votes: v.optional(v.number()),
        sample: v.optional(v.string()),
      }),
    ),
  }),
  v.object({
    kind: v.literal("map"),
    title: v.string(),
    focus: v.union(v.null(), v.string()),
    cells: v.array(v.object({ code: v.string(), pct: v.number() })),
  }),
  v.object({
    kind: v.literal("versus"),
    a: v.object({ code: v.string(), pct: v.number() }),
    b: v.object({ code: v.string(), pct: v.number() }),
    agreement: v.union(v.null(), v.number()),
    shared: v.number(),
  }),
  v.object({
    kind: v.literal("bars"),
    title: v.string(),
    rows: v.array(
      v.object({ label: v.string(), pct: v.number(), votes: v.number() }),
    ),
  }),
  v.object({
    kind: v.literal("donut"),
    title: v.string(),
    lovePct: v.number(),
    votes: v.number(),
    flag: v.union(v.null(), v.string()),
  }),
  /* The thing itself, at the top of an answer about it. A chart of countries
     is an answer to "who", and the reader still has to hold "what" in their
     head while they read it — a picture does that for free, and the product
     already has one for most questions. */
  v.object({
    kind: v.literal("portrait"),
    title: v.string(),
    imageUrl: v.union(v.null(), v.string()),
    /** The country the thing belongs to, when it belongs to one. */
    flag: v.union(v.null(), v.string()),
    note: v.string(),
  }),
  v.object({ kind: v.literal("note"), text: v.string() }),
);

export type Block = typeof block.type;

/** One question, as the public may see it: leans per country, never counts. */
export type TopicBoard = {
  slug: string;
  question: string;
  /** The country the question is *about*, when it is about one. */
  about: string | null;
  /** The topic's own picture, where discovery found one. */
  imageUrl: string | null;
  rows: { code: string; lovePct: number; sample: string }[];
};

export type Board = {
  totals: { countries: number; votes: number; lovePct: number; topics: number };
  countries: { code: string; lovePct: number; votes: number; topics: number; contrary: number }[];
  verdicts: { from: string; about: string; lovePct: number; votes: number; topics: number }[];
  pairs: { a: string; b: string; agreement: number; shared: number }[];
  categories: { slug: string; lovePct: number; votes: number; topics: number }[];
  subjects: { code: string; slug: string; lovePct: number; votes: number }[];
};

/** The word for a lean, duplicated from the client's scale on purpose — the
    server says what it means rather than shipping a number to be interpreted. */
export function word(pct: number): string {
  if (pct >= 84) return "adores";
  if (pct >= 74) return "loves";
  if (pct >= 64) return "likes";
  if (pct >= 56) return "warms to";
  if (pct >= 45) return "is split on";
  if (pct >= 37) return "cools on";
  if (pct >= 27) return "dislikes";
  if (pct >= 17) return "hates";
  return "despises";
}

export const tone = (pct: number) => (pct >= 56 ? "love" : pct <= 44 ? "hate" : "neutral");
export const strength = (pct: number) => (pct >= 50 ? pct : 100 - pct);
