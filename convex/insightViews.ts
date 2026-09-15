import { v } from "convex/values";

import type { Plan } from "./lib/insight";

/**
 * Turning a chosen lens into blocks of real numbers.
 *
 * This is the half the model does not touch. It reads the public board, picks
 * the rows the lens asked for, and emits blocks the client knows how to draw —
 * so every figure on screen came out of the database rather than out of a
 * language model.
 *
 * Seven kinds of block, because one answer is rarely one shape: "who hates
 * China" wants a ranking *and* a map, and a country profile wants a dial, a
 * ranking and a head-to-head. The client renders whatever it is handed and
 * nothing here knows what any of them look like.
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
      v.object({ code: v.string(), pct: v.number(), votes: v.number() }),
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
  v.object({ kind: v.literal("note"), text: v.string() }),
);

export type Block = typeof block.type;

type Board = {
  totals: { countries: number; votes: number; lovePct: number; topics: number };
  countries: { code: string; lovePct: number; votes: number; topics: number; contrary: number }[];
  verdicts: { from: string; about: string; lovePct: number; votes: number; topics: number }[];
  pairs: { a: string; b: string; agreement: number; shared: number }[];
  categories: { slug: string; lovePct: number; votes: number; topics: number }[];
  subjects: { code: string; slug: string; lovePct: number; votes: number }[];
};

/** The word for a lean, duplicated from the client's scale on purpose — the
    server says what it means rather than shipping a number to be interpreted. */
function word(pct: number): string {
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

const tone = (pct: number) => (pct >= 56 ? "love" : pct <= 44 ? "hate" : "neutral");
const strength = (pct: number) => (pct >= 50 ? pct : 100 - pct);

export function build(plan: Plan, board: Board): Block[] {
  const out: Block[] = [];
  if (plan.note) out.push({ kind: "note", text: plan.note });

  switch (plan.lens) {
    case "verdict_ranking": {
      const about = plan.subject;
      const rows = board.verdicts
        .filter((v) => v.about === about)
        .sort((a, b) => (plan.direction === "hate" ? a.lovePct - b.lovePct : b.lovePct - a.lovePct));
      if (!about || rows.length === 0) {
        out.push({
          kind: "note",
          text: about
            ? `Nobody has answered enough questions about ${about} yet for a verdict.`
            : "That country is not in the data yet.",
        });
        break;
      }
      const top = rows[0]!;
      out.push({
        kind: "headline",
        label: plan.direction === "hate" ? "Thinks least of it" : "Thinks most of it",
        value: `${strength(top.lovePct)}%`,
        word: `${top.from} ${word(top.lovePct)} it`,
        tone: tone(top.lovePct),
        flag: top.from,
      });
      out.push({
        kind: "ranking",
        title: `Every country on ${about}`,
        rows: rows.slice(0, 12).map((r) => ({ code: r.from, pct: r.lovePct, votes: r.votes })),
      });
      out.push({
        kind: "map",
        title: `The world on ${about}`,
        focus: about,
        cells: rows.map((r) => ({ code: r.from, pct: r.lovePct })),
      });
      break;
    }

    case "nation_profile": {
      const me = board.countries.find((c) => c.code === plan.subject);
      if (!me) {
        out.push({ kind: "note", text: `${plan.subject ?? "That country"} has not voted yet.` });
        break;
      }
      out.push({
        kind: "donut",
        title: `${me.code} on everything it has been shown`,
        lovePct: me.lovePct,
        votes: me.votes,
        flag: me.code,
      });
      out.push({
        kind: "headline",
        label: "Goes against the world",
        value: `${me.contrary}%`,
        word: `over ${me.topics} questions`,
        tone: "neutral",
        flag: me.code,
      });

      const mine = board.pairs
        .filter((p) => p.a === me.code || p.b === me.code)
        .map((p) => ({ other: p.a === me.code ? p.b : p.a, ...p }))
        .sort((x, y) => y.agreement - x.agreement);
      if (mine.length > 0) {
        const friend = mine[0]!;
        const enemy = mine[mine.length - 1]!;
        out.push({
          kind: "versus",
          a: { code: friend.other, pct: friend.agreement },
          b: { code: enemy.other, pct: enemy.agreement },
          agreement: null,
          shared: friend.shared,
        });
      }

      const verdicts = board.verdicts
        .filter((v) => v.from === me.code)
        .sort((a, b) => a.lovePct - b.lovePct);
      if (verdicts.length > 0) {
        out.push({
          kind: "ranking",
          title: `What ${me.code} makes of everyone else`,
          rows: verdicts.slice(0, 10).map((r) => ({ code: r.about, pct: r.lovePct, votes: r.votes })),
        });
      }

      const subjects = board.subjects
        .filter((s) => s.code === me.code)
        .sort((a, b) => b.lovePct - a.lovePct);
      if (subjects.length > 0) {
        out.push({
          kind: "bars",
          title: `${me.code} by subject`,
          rows: subjects.slice(0, 10).map((s) => ({ label: s.slug, pct: s.lovePct, votes: s.votes })),
        });
      }
      break;
    }

    case "pair_agreement": {
      const a = board.countries.find((c) => c.code === plan.subject);
      const b = board.countries.find((c) => c.code === plan.other);
      if (!a || !b) {
        out.push({ kind: "note", text: "One of those countries has not voted yet." });
        break;
      }
      const pair = board.pairs.find(
        (p) => (p.a === a.code && p.b === b.code) || (p.a === b.code && p.b === a.code),
      );
      out.push({
        kind: "versus",
        a: { code: a.code, pct: a.lovePct },
        b: { code: b.code, pct: b.lovePct },
        agreement: pair?.agreement ?? null,
        shared: pair?.shared ?? 0,
      });
      const mine = new Map(board.subjects.filter((s) => s.code === a.code).map((s) => [s.slug, s]));
      const shared = board.subjects
        .filter((s) => s.code === b.code && mine.has(s.slug))
        .map((s) => ({ slug: s.slug, gap: Math.abs(mine.get(s.slug)!.lovePct - s.lovePct) }))
        .sort((x, y) => y.gap - x.gap);
      if (shared.length > 0) {
        out.push({
          kind: "bars",
          title: "What they fight about",
          rows: shared.slice(0, 8).map((s) => ({ label: s.slug, pct: 100 - s.gap, votes: s.gap })),
        });
      }
      break;
    }

    case "subject_leans": {
      const code = plan.subject && /^[A-Z]{2}$/.test(plan.subject) ? plan.subject : null;
      const rows = code
        ? board.subjects
            .filter((s) => s.code === code)
            .map((s) => ({ label: s.slug, pct: s.lovePct, votes: s.votes }))
        : board.categories.map((c) => ({ label: c.slug, pct: c.lovePct, votes: c.votes }));
      const sorted = [...rows].sort((a, b) => a.pct - b.pct);
      if (sorted.length === 0) {
        out.push({ kind: "note", text: "No subject has enough votes yet." });
        break;
      }
      const worst = sorted[0]!;
      out.push({
        kind: "headline",
        label: "Least liked subject",
        value: `${strength(worst.pct)}%`,
        word: `the room ${word(worst.pct)} ${worst.label}`,
        tone: tone(worst.pct),
        flag: code,
      });
      out.push({
        kind: "bars",
        title: code ? `${code} by subject` : "Every subject, worst first",
        rows: sorted.slice(0, 14),
      });
      break;
    }

    case "world_map": {
      const about = plan.subject;
      const cells = about
        ? board.verdicts.filter((v) => v.about === about).map((v) => ({ code: v.from, pct: v.lovePct }))
        : board.countries.map((c) => ({ code: c.code, pct: c.lovePct }));
      out.push({
        kind: "map",
        title: about ? `The world on ${about}` : "Every country's own mood",
        focus: about,
        cells,
      });
      out.push({
        kind: "ranking",
        title: about ? `Every country on ${about}` : "Every country that has voted",
        rows: [...cells]
          .sort((a, b) => a.pct - b.pct)
          .slice(0, 12)
          .map((c) => ({
            code: c.code,
            pct: c.pct,
            votes: board.countries.find((x) => x.code === c.code)?.votes ?? 0,
          })),
      });
      break;
    }

    default: {
      const ranked = board.countries.filter((c) => c.votes >= 6);
      const by = <T,>(rows: T[], f: (x: T) => number) =>
        rows.length === 0 ? null : rows.reduce((x, y) => (f(y) > f(x) ? y : x));
      const loving = by(ranked, (c) => c.lovePct);
      const hating = by(ranked, (c) => 100 - c.lovePct);
      const contrary = by(ranked, (c) => c.contrary);
      if (loving) {
        out.push({
          kind: "headline",
          label: "Most loving",
          value: `${loving.lovePct}%`,
          word: `${loving.code} ${word(loving.lovePct)} what it sees`,
          tone: "love",
          flag: loving.code,
        });
      }
      if (hating) {
        out.push({
          kind: "headline",
          label: "Most hating",
          value: `${100 - hating.lovePct}%`,
          word: `${hating.code} ${word(hating.lovePct)} it`,
          tone: "hate",
          flag: hating.code,
        });
      }
      if (contrary && contrary.contrary > 0) {
        out.push({
          kind: "headline",
          label: "Most contrarian",
          value: `${contrary.contrary}%`,
          word: `${contrary.code} goes its own way`,
          tone: "neutral",
          flag: contrary.code,
        });
      }
      const feud = [...board.pairs].sort((a, b) => a.agreement - b.agreement)[0];
      if (feud) {
        out.push({
          kind: "versus",
          a: { code: feud.a, pct: board.countries.find((c) => c.code === feud.a)?.lovePct ?? 50 },
          b: { code: feud.b, pct: board.countries.find((c) => c.code === feud.b)?.lovePct ?? 50 },
          agreement: feud.agreement,
          shared: feud.shared,
        });
      }
      out.push({
        kind: "bars",
        title: "Every subject, worst first",
        rows: [...board.categories]
          .sort((a, b) => a.lovePct - b.lovePct)
          .slice(0, 10)
          .map((c) => ({ label: c.slug, pct: c.lovePct, votes: c.votes })),
      });
      break;
    }
  }

  return out;
}
