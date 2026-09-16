import { v } from "convex/values";

import { internalQuery } from "./_generated/server";
import type { Plan } from "./lib/insight";
import { strength, tone, word, type Block } from "./insightBlocks";

/**
 * The league table of the questions themselves.
 *
 * "Who is the most hated person in the world" is the most obvious thing anybody
 * types at a product like this, and until now nothing could answer it: every
 * lens ranked *countries*, so the question came back as a board about Russia
 * and Brazil that never named a person. A ranking of the subjects was missing
 * entirely.
 *
 * **Built from the country boards, not from the topic's own counts.** A
 * country's lean on one question is public — `stats.ts` says so, and it is
 * what the atlas under every result and the public topic page already ship.
 * The stored per-topic aggregate is the thing a vote or a peek buys, and it is
 * not read here. So a row's figure is the mean of the country leans that are
 * already published, over countries, and it is never a count of votes.
 *
 * Thresholds are the whole quality of this board. One country at 100% is not
 * the most hated anything; it is one room with six people in it.
 *
 * `tag` is what makes "the most hated *person*" mean people. Ranking the whole
 * catalogue for that question crowned "Buying fame?", which is a fine answer
 * to a question nobody asked — the kind of a question is a fact about the
 * data, and it lives on the row now. See `backfill.markKinds`.
 */

const MIN_COUNTRIES = 3;
const MIN_VOTES = 12;

const row = v.object({
  slug: v.string(),
  question: v.string(),
  imageUrl: v.union(v.null(), v.string()),
  about: v.union(v.null(), v.string()),
  /** Mean of the published country leans. 0 is unanimous hate, 100 love. */
  lovePct: v.number(),
  countries: v.number(),
});

export const ranked = internalQuery({
  args: {
    /** A category slug to narrow to, or nothing for the whole catalogue. */
    category: v.optional(v.union(v.null(), v.string())),
    /** A kind of thing — `person`, `product` — stamped by `backfill.markKinds`. */
    tag: v.optional(v.union(v.null(), v.string())),
    direction: v.union(v.literal("love"), v.literal("hate")),
    limit: v.optional(v.number()),
  },
  returns: v.array(row),
  handler: async (ctx, args) => {
    const want = Math.min(args.limit ?? 10, 20);

    const stats = await ctx.db.query("countryTopicStats").take(4000);
    const acc = new Map<string, { sum: number; countries: number; votes: number }>();
    for (const r of stats) {
      if (r.countryCode === "ZZ") continue;
      const love = r.freeLove + r.paidLove;
      const total = love + r.freeHate + r.paidHate;
      if (total === 0) continue;
      const at = acc.get(r.topicId) ?? { sum: 0, countries: 0, votes: 0 };
      at.sum += (love / total) * 100;
      at.countries += 1;
      at.votes += total;
      acc.set(r.topicId, at);
    }

    const shortlist = [...acc]
      .filter(([, a]) => a.countries >= MIN_COUNTRIES && a.votes >= MIN_VOTES)
      .map(([topicId, a]) => ({
        topicId,
        lovePct: Math.round(a.sum / a.countries),
        countries: a.countries,
      }))
      .sort((x, y) =>
        args.direction === "love" ? y.lovePct - x.lovePct : x.lovePct - y.lovePct,
      );

    const wantedCategory = args.category ?? null;
    const wantedTag = args.tag ?? null;
    const categories = new Map<string, string>();
    const out = [];
    for (const item of shortlist) {
      if (out.length >= want) break;
      const topic = await ctx.db.get("topics", item.topicId as never);
      if (!topic || topic.status !== "active") continue;

      /* The kind first, because it is the cheap one and it is the one that
         decides whether the answer is about the thing that was asked. */
      if (wantedTag && !(topic.tagSlugs ?? []).includes(wantedTag)) continue;

      if (wantedCategory) {
        if (!categories.has(topic.categoryId)) {
          const c = await ctx.db.get("categories", topic.categoryId);
          categories.set(topic.categoryId, c?.slug ?? "other");
        }
        if (categories.get(topic.categoryId) !== wantedCategory) continue;
      }

      out.push({
        slug: topic.slug,
        question: topic.question,
        imageUrl:
          topic.imageId !== undefined
            ? await ctx.storage.getUrl(topic.imageId)
            : (topic.externalImageUrl ?? null),
        about: topic.scopeCountry ?? null,
        lovePct: item.lovePct,
        countries: item.countries,
      });
    }
    return out;
  },
});

export type RankedTopic = typeof row.type;

/**
 * The blocks: the one at the top, with its face, and then the rest of them.
 *
 * The leader gets the portrait because a league table whose winner is a line
 * of text in a bar chart has buried its own answer.
 */
export function buildRanked(plan: Plan, rows: RankedTopic[]): Block[] {
  const out: Block[] = [];
  const top = rows[0];
  if (!top) {
    out.push({
      kind: "note",
      text: "Nothing here has been answered in enough countries yet to rank.",
    });
    return out;
  }

  out.push({
    kind: "portrait",
    title: top.question,
    imageUrl: top.imageUrl,
    flag: top.about,
    note: plan.note,
  });

  out.push({
    kind: "headline",
    label: plan.direction === "love" ? "Best liked" : "Worst thought of",
    value: `${strength(top.lovePct)}%`,
    word: `the world ${word(top.lovePct)} it`,
    tone: tone(top.lovePct),
    flag: top.about,
  });

  out.push({
    kind: "bars",
    title: plan.direction === "love" ? "Best liked, in order" : "Worst thought of, in order",
    rows: rows.map((r) => ({ label: r.question.replace(/\?$/, ""), pct: r.lovePct })),
  });

  out.push({
    kind: "note",
    text: `Averaged over the countries that answered each one, ${MIN_COUNTRIES} at the very least. A question one room has answered is not a verdict.`,
  });
  return out;
}
