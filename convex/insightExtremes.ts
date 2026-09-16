import type { Plan } from "./lib/insight";
import { word, type Block, type Board } from "./insightBlocks";

/**
 * The superlatives: the fallback, and the answer to "surprise me".
 *
 * Apart from `insightViews.ts` because that file had grown past what a file
 * here is allowed, and because this is the one lens that is about no subject
 * in particular — every other case there is a reading of something the reader
 * named, and this is the reading for when they named nothing.
 *
 * It is about **countries**. A superlative about a person or a thing belongs
 * to `insightTopics.ts`; sending one here is what made "the most hated person
 * in the world" come back as a board about Russia and Brazil.
 */
export function buildExtremes(plan: Plan, board: Board): Block[] {
  const out: Block[] = [];
  if (plan.note) out.push({ kind: "note", text: plan.note });

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

  return out;
}
