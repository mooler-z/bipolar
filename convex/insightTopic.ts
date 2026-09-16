import { v } from "convex/values";

import { internalQuery } from "./_generated/server";
import type { Plan } from "./lib/insight";
import { strength, tone, word, type Block, type TopicBoard } from "./insightBlocks";

/**
 * One question, and what each country made of it.
 *
 * The board in `world.ts` is summed across many questions, which is what makes
 * it safe to publish in full. This is the other kind, and it draws the line
 * the topic page has always drawn: **leans, never counts.** A country's lean
 * on one question is public — it is what the atlas under every result shows —
 * and the counts behind it are what a vote or a peek buys. So nothing here
 * emits a number of votes, and the trust in a row is said as a word.
 *
 * The lookup is a search rather than a slug, because the reader typed a name
 * and the model passed the name on. "trump" has to find "Donald Trump?" and
 * "the switch" has to find "Nintendo Switch?".
 *
 * **A near miss is worse than a miss.** The search returns its best guesses in
 * order, and walking down that list for one with votes on it will happily
 * answer a different question: "pineapple on pizza" came back as "Marmite on
 * toast?", which shares one small word and nothing else. So a candidate has to
 * share a real word with what was asked before it is allowed to stand in, and
 * where nothing does the honest answer is that nobody has voted on it.
 */

/** Words worth matching on: `on`, `the` and `a` match everything. */
function meaningful(text: string): string[] {
  return text
    .toLowerCase()
    .split(/[^\p{L}\p{N}]+/u)
    .filter((w) => w.length >= 4);
}

/**
 * Is this result still about the thing that was asked?
 *
 * One real word in common is the whole bar, and it is enough: the search has
 * already decided these are the closest questions it has, and this only has to
 * catch the case where the closest is not close at all. Exported because it is
 * the rule worth holding still — the search itself is Convex's.
 */
export function relevant(needle: string, question: string): boolean {
  const wanted = meaningful(needle);
  if (wanted.length === 0) return true;
  const words = new Set(meaningful(question));
  return wanted.some((w) => words.has(w));
}

const row = v.object({
  code: v.string(),
  lovePct: v.number(),
  sample: v.string(),
});

export const board = internalQuery({
  args: { name: v.string() },
  returns: v.union(
    v.null(),
    v.object({
      slug: v.string(),
      question: v.string(),
      about: v.union(v.null(), v.string()),
      imageUrl: v.union(v.null(), v.string()),
      rows: v.array(row),
    }),
  ),
  handler: async (ctx, args) => {
    const needle = args.name.trim().slice(0, 60);
    if (needle.length < 2) return null;

    const found = await ctx.db
      .query("topics")
      .withSearchIndex("search_question", (q) =>
        q.search("question", needle).eq("status", "active"),
      )
      .take(8);
    if (found.length === 0) return null;

    /* The best match that anybody has actually voted on, and that is still
       about the thing that was asked. A question with no votes has nothing to
       say however well it matches the words; a question with votes and none of
       the words is a different question entirely. */
    for (const topic of found) {
      if (!relevant(needle, topic.question)) continue;

      const stats = await ctx.db
        .query("countryTopicStats")
        .withIndex("by_topic", (q) => q.eq("topicId", topic._id))
        .take(60);

      const rows = stats
        .map((r) => {
          const love = r.freeLove + r.paidLove;
          const total = love + r.freeHate + r.paidHate;
          return {
            code: r.countryCode,
            lovePct: total === 0 ? 50 : Math.round((love / total) * 100),
            sample: total < 10 ? "few" : total < 100 ? "some" : "many",
            total,
          };
        })
        .filter((r) => r.total > 0 && r.code !== "ZZ")
        .sort((a, b) => a.lovePct - b.lovePct || b.total - a.total)
        .map(({ total: _total, ...rest }) => rest);

      if (rows.length > 0) {
        /* Storage first, then whatever discovery found — the same order the
           topic card uses, so the picture in an answer is the picture on the
           question it is about. */
        const imageUrl =
          topic.imageId !== undefined
            ? await ctx.storage.getUrl(topic.imageId)
            : (topic.externalImageUrl ?? null);
        return {
          slug: topic.slug,
          question: topic.question,
          about: topic.scopeCountry ?? null,
          imageUrl,
          rows,
        };
      }
    }
    return null;
  },
});

/**
 * The blocks for one question: who is hardest on it, the whole ranking, and
 * the world coloured by it.
 *
 * Ordered by the question that was asked. "Who hates X" leads with the country
 * that hates it most; "who loves X" leads with the other end. The ranking
 * itself is always harshest-first, because that is the order the map's colours
 * run in and two orders on one screen is a reader checking which is which.
 */
export function buildTopic(plan: Plan, board: TopicBoard): Block[] {
  const out: Block[] = [];

  /* The thing, before the verdict on it. The note rides on the picture rather
     than above it as a line of its own: two sentences and a headline stacked
     before the first chart is a preamble, and this panel is meant to answer. */
  out.push({
    kind: "portrait",
    title: board.question,
    imageUrl: board.imageUrl,
    flag: board.about,
    note: plan.note,
  });

  const harshest = board.rows[0]!;
  const warmest = board.rows[board.rows.length - 1]!;
  const lead = plan.direction === "love" ? warmest : harshest;

  out.push({
    kind: "headline",
    label: plan.direction === "love" ? "Thinks most of it" : "Thinks least of it",
    value: `${strength(lead.lovePct)}%`,
    word: `${lead.code} ${word(lead.lovePct)} it`,
    tone: tone(lead.lovePct),
    flag: lead.code,
  });

  out.push({
    kind: "ranking",
    title: board.question,
    rows: board.rows
      .slice(0, 14)
      .map((r) => ({ code: r.code, pct: r.lovePct, sample: r.sample })),
  });

  out.push({
    kind: "map",
    title: `The world on ${board.question.replace(/\?$/, "")}`,
    focus: board.about,
    cells: board.rows.map((r) => ({ code: r.code, pct: r.lovePct })),
  });

  /* Both ends, when there are two ends worth naming. One country is not a
     disagreement, and two rows reading the same way is not one either. */
  if (board.rows.length > 2 && harshest.lovePct !== warmest.lovePct) {
    out.push({
      kind: "versus",
      a: { code: warmest.code, pct: warmest.lovePct },
      b: { code: harshest.code, pct: harshest.lovePct },
      agreement: null,
      shared: 0,
    });
  }

  if (board.rows.length < 4) {
    out.push({
      kind: "note",
      text: `Only ${board.rows.length === 1 ? "one country has" : `${board.rows.length} countries have`} voted on this one. Treat it as early rather than settled.`,
    });
  }
  return out;
}
