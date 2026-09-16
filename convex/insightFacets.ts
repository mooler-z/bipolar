import { v } from "convex/values";

import { internalQuery } from "./_generated/server";
import type { Plan } from "./lib/insight";
import { strength, tone, word, type Block } from "./insightBlocks";
import { FACET_NAMES, type Facets } from "./lib/facets";

/**
 * The cut across the catalogue: one facet, every value of it, ranked.
 *
 * This is the reading the boards could not do. "Who is most hated" is a
 * question about one name; "are women in politics judged more harshly than
 * men", "do founders travel better than heads of state", "is a luxury thing
 * forgiven what a cheap one is not" are questions about a *kind* of subject,
 * and answering them needs the catalogue to know what its questions are about.
 * Since `seedFacets.markFacets` it does.
 *
 * Built from the country boards for the same reason as `insightTopics.ts`: a
 * country's lean on one question is public and the stored per-topic aggregate
 * is what a vote or a peek buys, so this reads only the first and publishes a
 * mean of means. The count it does publish is a count of *questions* in a
 * group, which is the one number a reader needs to know whether to believe it.
 */

const MIN_COUNTRIES = 3;
const MIN_TOPICS = 3;

const group = v.object({
  value: v.string(),
  lovePct: v.number(),
  topics: v.number(),
});

export const split = internalQuery({
  args: {
    facet: v.string(),
    direction: v.union(v.literal("love"), v.literal("hate")),
  },
  returns: v.array(group),
  handler: async (ctx, args) => {
    const facet = args.facet as (typeof FACET_NAMES)[number];
    if (!FACET_NAMES.includes(facet)) return [];

    const stats = await ctx.db.query("countryTopicStats").take(4000);
    const perTopic = new Map<string, { sum: number; countries: number }>();
    for (const r of stats) {
      if (r.countryCode === "ZZ") continue;
      const love = r.freeLove + r.paidLove;
      const total = love + r.freeHate + r.paidHate;
      if (total === 0) continue;
      const at = perTopic.get(r.topicId) ?? { sum: 0, countries: 0 };
      at.sum += (love / total) * 100;
      at.countries += 1;
      perTopic.set(r.topicId, at);
    }

    const groups = new Map<string, { sum: number; topics: number }>();
    for (const [topicId, a] of perTopic) {
      if (a.countries < MIN_COUNTRIES) continue;
      const topic = await ctx.db.get("topics", topicId as never);
      if (!topic || topic.status !== "active") continue;
      const value = (topic.facets as Facets | undefined)?.[facet];
      if (value === undefined || value === null || value === "") continue;

      const key = String(value);
      const at = groups.get(key) ?? { sum: 0, topics: 0 };
      at.sum += a.sum / a.countries;
      at.topics += 1;
      groups.set(key, at);
    }

    return [...groups]
      .filter(([, g]) => g.topics >= MIN_TOPICS)
      .map(([value, g]) => ({
        value,
        lovePct: Math.round(g.sum / g.topics),
        topics: g.topics,
      }))
      .sort((x, y) =>
        args.direction === "love" ? y.lovePct - x.lovePct : x.lovePct - y.lovePct,
      )
      .slice(0, 14);
  },
});

export type FacetGroup = typeof group.type;

/** How a facet's name reads in a sentence. */
const SPOKEN: Record<string, string> = {
  kind: "kind of question", region: "region", nationality: "country",
  era: "era", year: "year", origin: "where it came from", gender: "gender", bornYear: "year of birth",
  ageBand: "age", role: "what they do", living: "living or not",
  lean: "politics", office: "office held", prominentSince: "years in public",
  priceBand: "price", brand: "brand", maker: "where it is made",
  form: "what it is", platform: "ecosystem", axis: "what the argument is about",
  scale: "how far it reaches", audience: "who it is for",
};

export function buildFacets(plan: Plan, rows: FacetGroup[]): Block[] {
  const out: Block[] = [];
  const spoken = SPOKEN[plan.subject ?? ""] ?? "that";

  if (rows.length < 2) {
    out.push({
      kind: "note",
      text: `Not enough has been answered to compare by ${spoken} yet — a group needs ${MIN_TOPICS} questions before it is a group.`,
    });
    return out;
  }

  if (plan.note) out.push({ kind: "note", text: plan.note });

  const lead = rows[0]!;
  out.push({
    kind: "headline",
    label: plan.direction === "love" ? "Best thought of" : "Worst thought of",
    value: `${strength(lead.lovePct)}%`,
    word: `the world ${word(lead.lovePct)} ${lead.value}`,
    tone: tone(lead.lovePct),
    flag: null,
  });

  out.push({
    kind: "bars",
    title: `By ${spoken}`,
    rows: rows.map((r) => ({ label: r.value, pct: r.lovePct, votes: r.topics })),
  });

  out.push({
    kind: "note",
    text: `Each bar is the mean across the questions in that group — the figure beside it is how many. Averages of averages, so read the gaps rather than the digits.`,
  });
  return out;
}
