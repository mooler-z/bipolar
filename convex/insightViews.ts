import type { Plan } from "./lib/insight";
import { strength, tone, word, type Block, type Board } from "./insightBlocks";
import { buildExtremes } from "./insightExtremes";

/**
 * Turning a chosen lens into blocks of real numbers.
 *
 * This is the half the model does not touch. It reads the public board, picks
 * the rows the lens asked for, and emits blocks the client knows how to draw —
 * so every figure on screen came out of the database rather than out of a
 * language model. The blocks themselves, and the board's shape, live in
 * `insightBlocks.ts`.
 */

/** The least a subject needs behind it before its percentage means anything. */
const SUBJECT_FLOOR = 25;

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
      /* The headline has to survive the answer running against the question.
         Asked who loves China most, the honest reply here is a country that
         still dislikes it — and "Thinks most of it / ET dislikes it / 71%"
         reads as three statements disagreeing with each other, because the
         71% is the strength of the *hate*. So when the board answers against
         the question, the label says so and a note spells it out. */
      const top = rows[0]!;
      const asked = plan.direction === "hate" ? "hate" : "love";
      const against = asked === "love" ? top.lovePct < 50 : top.lovePct >= 50;
      out.push({
        kind: "headline",
        label: against
          ? asked === "love"
            ? "Warmest — and still against"
            : "Coolest — and still for"
          : asked === "hate"
            ? "Thinks least of it"
            : "Thinks most of it",
        value: `${strength(top.lovePct)}%`,
        word: `${top.from} ${word(top.lovePct)} it`,
        tone: tone(top.lovePct),
        flag: top.from,
      });
      if (against) {
        out.push({
          kind: "note",
          text:
            asked === "love"
              ? `Nobody on this board is fond of ${about}. ${top.from} is the warmest of the ${rows.length} that have said enough, and it still leans against.`
              : `Nobody on this board is against ${about}. ${top.from} is the coolest of the ${rows.length} that have said enough, and it still leans for.`,
        });
      }
      /* How thin the board is, said out loud. Two countries is an answer worth
         reading and not one worth quoting, and the reader cannot tell which
         they are looking at from a bar chart. */
      if (rows.length < 4) {
        out.push({
          kind: "note",
          text: `Only ${rows.length === 1 ? "one country has" : `${rows.length} countries have`} answered enough questions about ${about} to count. Treat this as early rather than settled.`,
        });
      }
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
      /* A subject nobody has answered is not a subject the room dislikes. This
         board was topping out at "travel, 100%" off a handful of votes and
         printing it in the same type as a category with a thousand behind it,
         which is the chart lying about its own confidence. */
      const enough = rows.filter((r) => r.votes >= SUBJECT_FLOOR);
      const sorted = [...enough].sort((a, b) => a.pct - b.pct);
      if (sorted.length === 0) {
        out.push({
          kind: "note",
          text: `No subject has ${SUBJECT_FLOOR} votes behind it yet, which is the least it takes to say anything about one.`,
        });
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

    default:
      /* Countries, not subjects — see `insightExtremes.ts`. The note is
         already on the front of that list, so it is not repeated here. */
      return [...out.filter((b) => b.kind !== "note"), ...buildExtremes(plan, board)];
  }

  return out;
}
