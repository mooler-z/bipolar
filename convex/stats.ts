import { v } from "convex/values";

import { query, type MutationCtx, type QueryCtx } from "./_generated/server";
import type { Doc, Id } from "./_generated/dataModel";
import { currentUser } from "./users";

/**
 * The stats gate, in one place so it cannot be enforced differently twice.
 *
 * A topic's two-layer aggregate is hidden until the reader has voted on it or
 * paid to peek. The rule is enforced in the **payload** — `null` leaves the
 * server — because a number sent and then hidden with CSS has already been
 * delivered to anyone willing to open a network tab.
 *
 * What is never gated: the per-country breakdown and everything on the
 * leaderboards. That data is the shareable half, and hiding it would break the
 * mechanic the whole product spreads by.
 */

export type Aggregate = {
  freeLove: number;
  freeHate: number;
  paidLove: number;
  paidHate: number;
  stakedCents: number;
};

/** Has this reader earned the aggregate — by voting, or by paying to peek? */
export async function hasAccess(
  ctx: QueryCtx,
  userId: Id<"users"> | null,
  topicId: Id<"topics">,
): Promise<boolean> {
  if (!userId) return false;

  const voted = await ctx.db
    .query("votes")
    .withIndex("by_user_topic_type", (q) =>
      q.eq("userId", userId).eq("topicId", topicId),
    )
    .first();
  if (voted) return true;

  const peeked = await ctx.db
    .query("topicPeeks")
    .withIndex("by_user_topic", (q) =>
      q.eq("userId", userId).eq("topicId", topicId),
    )
    .first();
  return peeked !== null;
}

/** The stored running totals. Never a scan — reads are frequent, writes are not. */
export async function aggregateFor(
  ctx: QueryCtx,
  topicId: Id<"topics">,
): Promise<Aggregate> {
  const row = await ctx.db
    .query("topicStats")
    .withIndex("by_topic", (q) => q.eq("topicId", topicId))
    .unique();
  return {
    freeLove: row?.freeLove ?? 0,
    freeHate: row?.freeHate ?? 0,
    paidLove: row?.paidLove ?? 0,
    paidHate: row?.paidHate ?? 0,
    stakedCents: row?.stakedCents ?? 0,
  };
}

/** The aggregate if the reader has earned it, `null` if not. */
export async function gatedAggregate(
  ctx: QueryCtx,
  topicId: Id<"topics">,
): Promise<Aggregate | null> {
  const user = await currentUser(ctx);
  if (!(await hasAccess(ctx, user?._id ?? null, topicId))) return null;
  return await aggregateFor(ctx, topicId);
}

/** Always public: who voted where. Bounded, because a topic can reach anywhere. */
export async function countryBreakdown(
  ctx: QueryCtx,
  topicId: Id<"topics">,
  limit = 40,
): Promise<Doc<"countryTopicStats">[]> {
  return await ctx.db
    .query("countryTopicStats")
    .withIndex("by_topic", (q) => q.eq("topicId", topicId))
    .take(limit);
}

export const aggregateValidator = v.object({
  freeLove: v.number(),
  freeHate: v.number(),
  paidLove: v.number(),
  paidHate: v.number(),
  stakedCents: v.number(),
});

/**
 * Move the running totals for one vote. Called only from inside the vote
 * transaction, so a counter and the row it counts can never be written apart.
 */
export async function bumpCounters(
  ctx: MutationCtx,
  topicId: Id<"topics">,
  countryCode: string,
  voteType: "free" | "paid",
  choice: "love" | "hate",
  stakedCents: number,
): Promise<void> {
  const field = `${voteType}${choice === "love" ? "Love" : "Hate"}` as
    | "freeLove"
    | "freeHate"
    | "paidLove"
    | "paidHate";

  const totals = await ctx.db
    .query("topicStats")
    .withIndex("by_topic", (q) => q.eq("topicId", topicId))
    .unique();
  if (totals) {
    await ctx.db.patch("topicStats", totals._id, {
      [field]: totals[field] + 1,
      stakedCents: totals.stakedCents + stakedCents,
    });
  } else {
    await ctx.db.insert("topicStats", {
      topicId,
      freeLove: 0,
      freeHate: 0,
      paidLove: 0,
      paidHate: 0,
      skips: 0,
      comments: 0,
      stakedCents,
      [field]: 1,
    });
  }

  const perCountry = await ctx.db
    .query("countryTopicStats")
    .withIndex("by_topic_country", (q) =>
      q.eq("topicId", topicId).eq("countryCode", countryCode),
    )
    .unique();
  if (perCountry) {
    await ctx.db.patch("countryTopicStats", perCountry._id, {
      [field]: perCountry[field] + 1,
    });
  } else {
    await ctx.db.insert("countryTopicStats", {
      topicId,
      countryCode,
      freeLove: 0,
      freeHate: 0,
      paidLove: 0,
      paidHate: 0,
      [field]: 1,
    });
  }
}

/** The strip at the top of the app. Always public, never gated. */
export const global = query({
  args: {},
  returns: v.object({
    topics: v.number(),
    votes: v.number(),
    stakedCents: v.number(),
    countries: v.number(),
  }),
  handler: async (ctx) => {
    // Bounded on purpose: the strip is a headline, not an accounting report.
    const rows = await ctx.db.query("topicStats").take(500);
    const countries = new Set<string>();
    for (const row of await ctx.db.query("countryTopicStats").take(1000)) {
      countries.add(row.countryCode);
    }
    return {
      topics: rows.length,
      votes: rows.reduce(
        (n, r) => n + r.freeLove + r.freeHate + r.paidLove + r.paidHate,
        0,
      ),
      stakedCents: rows.reduce((n, r) => n + r.stakedCents, 0),
      countries: countries.size,
    };
  },
});
