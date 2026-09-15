import { v } from "convex/values";

import { query } from "./_generated/server";
import {
  byCategory,
  byCountry,
  pairs,
  subjects,
  verdicts,
  type StatRow,
  type TopicRow,
} from "./lib/worldCuts";

/**
 * The world page, in one payload.
 *
 * Everything here is an **aggregate across many topics**, which is what makes
 * a public page of this possible at all. A topic's own love/hate split is what
 * voting or paying for a peek buys; summing a country's leaning over every
 * question it has answered gives away none of them, and neither does averaging
 * two countries' agreement over the topics they share. Topics are named with
 * their volume — which the leaderboards already publish — and never with their
 * answer. The page is a reason to go and vote, not a way around it.
 *
 * One query rather than six, because every board is cut from the same two
 * reads and six subscriptions over the same rows is six times the work for the
 * same bytes. The client slices what it needs.
 *
 * The reads are bounded, and the ceiling is stated on screen rather than
 * hidden: a page that has quietly stopped counting looks exactly like a page
 * that has counted everything.
 */

const STATS = 4000;
const TOPICS = 1200;

const countryLean = v.object({
  code: v.string(),
  love: v.number(),
  hate: v.number(),
  votes: v.number(),
  lovePct: v.number(),
  topics: v.number(),
  contrary: v.number(),
});

const subject = v.object({
  code: v.string(),
  slug: v.string(),
  votes: v.number(),
  lovePct: v.number(),
});

const verdict = v.object({
  from: v.string(),
  about: v.string(),
  votes: v.number(),
  lovePct: v.number(),
  topics: v.number(),
});

const pair = v.object({
  a: v.string(),
  b: v.string(),
  agreement: v.number(),
  shared: v.number(),
  sameSide: v.number(),
});

const category = v.object({
  slug: v.string(),
  votes: v.number(),
  lovePct: v.number(),
  topics: v.number(),
});

/**
 * The grid: every voting country against every country voted about.
 *
 * Cells go down to two votes rather than the board's six, because a grid is
 * read as a whole and a blank cell says "no opinion" where a faint one says
 * "not much of one yet". The client fades anything under the board's floor
 * so a thin cell is never mistaken for a verdict.
 */
const grid = v.object({
  /** The columns: who gets voted about, busiest first. */
  about: v.array(v.string()),
  cells: v.array(verdict),
});

/** A topic the page can point at: what it asks, and how busy it is. Never how
    it went — that is the thing a vote is exchanged for. */
const loudest = v.object({
  slug: v.string(),
  question: v.string(),
  votes: v.number(),
  /** The country it is about, when it is about one. */
  about: v.union(v.null(), v.string()),
});

export const board = query({
  args: {},
  returns: v.object({
    totals: v.object({
      countries: v.number(),
      votes: v.number(),
      love: v.number(),
      hate: v.number(),
      lovePct: v.number(),
      topics: v.number(),
      /** Topics that know which country they are about. */
      aboutSomewhere: v.number(),
    }),
    countries: v.array(countryLean),
    /** Every verdict, for the same reason as `pairs` below. */
    verdicts: v.array(verdict),
    /** Every pair, not a trimmed board: the map colours the whole world by
        agreement with one country, so it needs all of that country's pairs. */
    pairs: v.array(pair),
    grid,
    categories: v.array(category),
    subjects: v.array(subject),
    loudest: v.array(loudest),
    /** True when a read hit its ceiling, so the page can say so. */
    capped: v.boolean(),
  }),
  handler: async (ctx) => {
    const topicDocs = await ctx.db.query("topics").order("desc").take(TOPICS);
    const statRows = await ctx.db.query("countryTopicStats").take(STATS);

    const categories = new Map<string, string>();
    for (const c of await ctx.db.query("categories").take(60)) {
      categories.set(c._id, c.slug);
    }

    const topics = new Map<string, TopicRow>();
    for (const t of topicDocs) {
      if (t.status !== "active") continue;
      topics.set(t._id, {
        _id: t._id,
        slug: t.slug,
        question: t.question,
        scopeCountry: t.scopeCountry,
        categorySlug: categories.get(t.categoryId) ?? "other",
      });
    }

    // Rows for topics that are gone or archived are dropped: a board built on
    // questions nobody can open is a board of dead ends.
    const rows: StatRow[] = statRows
      .filter((r) => topics.has(r.topicId))
      .map((r) => ({
        topicId: r.topicId,
        countryCode: r.countryCode,
        freeLove: r.freeLove,
        freeHate: r.freeHate,
        paidLove: r.paidLove,
        paidHate: r.paidHate,
      }));

    const countries = byCountry(rows);
    const love = countries.reduce((n, c) => n + c.love, 0);
    const hate = countries.reduce((n, c) => n + c.hate, 0);
    const votes = love + hate;

    /* The busiest questions, by volume only. Which way they went is the one
       thing this page will not say. */
    const perTopic = new Map<string, number>();
    for (const r of rows) {
      const n = r.freeLove + r.freeHate + r.paidLove + r.paidHate;
      if (n > 0) perTopic.set(r.topicId, (perTopic.get(r.topicId) ?? 0) + n);
    }
    const loudestRows = [...perTopic]
      .sort((a, b) => b[1] - a[1])
      .slice(0, 12)
      .map(([id, n]) => {
        const t = topics.get(id)!;
        return { slug: t.slug, question: t.question, votes: n, about: t.scopeCountry ?? null };
      });

    /* The grid's columns are the places most voted about, capped so the thing
       stays a grid rather than a wall — and the cells are every opinion held
       about one of them, thin ones included. */
    const every = verdicts(rows, topics, 2);
    const volume = new Map<string, number>();
    for (const c of every) volume.set(c.about, (volume.get(c.about) ?? 0) + c.votes);
    const about = [...volume].sort((a, b) => b[1] - a[1]).slice(0, 14).map(([code]) => code);
    const columns = new Set(about);

    return {
      grid: { about, cells: every.filter((c) => columns.has(c.about)) },
      totals: {
        countries: countries.length,
        votes,
        love,
        hate,
        lovePct: votes === 0 ? 50 : Math.round((love / votes) * 100),
        topics: perTopic.size,
        aboutSomewhere: [...topics.values()].filter((t) => t.scopeCountry).length,
      },
      countries: countries.slice(0, 60),
      /* The whole board, not the top of it. This used to be the 60 rows with
         the lowest lean, which quietly made three different things wrong: a
         country page showed only the verdicts harsh enough to make that cut,
         the "warmest" reading was the least-harsh row of a list that held
         nothing but harsh ones, and asking the AI who hates a place it had
         no extreme row about was answered with "nobody has answered enough
         questions about it yet" — while the votes sat right there. A board
         trimmed by the very field it is then filtered on cannot be trusted
         for anything but the one view it was trimmed for.

         It is bounded without a slice: one row per (voter, subject) pair that
         clears the floor, and both sides of that are countries. */
      verdicts: verdicts(rows, topics),
      pairs: pairs(rows),
      categories: byCategory(rows, topics),
      subjects: subjects(rows, topics),
      loudest: loudestRows,
      capped: statRows.length >= STATS || topicDocs.length >= TOPICS,
    };
  },
});
