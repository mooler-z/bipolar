import { v } from "convex/values";

import { query } from "./_generated/server";
import { hasAccess } from "./stats";
import { currentUser } from "./users";

/**
 * The boards, and the live rail. All of it public, none of it gated.
 *
 * This is the shareable half of the product, and it has to stay public or the
 * thing stops spreading. What it must never do is become a side door to the
 * two-layer aggregate — see the activity feed below, which is the only place
 * that was a real risk.
 */

/** Hottest topics, by money staked. The board that makes the product legible. */
export const hottest = query({
  args: { limit: v.optional(v.number()) },
  returns: v.array(
    v.object({
      slug: v.string(),
      question: v.string(),
      stakedCents: v.number(),
      votes: v.number(),
    }),
  ),
  handler: async (ctx, args) => {
    const want = Math.min(args.limit ?? 5, 20);
    // Bounded read, then ranked in memory: a board is a headline, not a report.
    const rows = await ctx.db.query("topicStats").take(300);
    const ranked = rows
      .filter((r) => r.stakedCents > 0)
      .sort((a, b) => b.stakedCents - a.stakedCents)
      .slice(0, want);

    const out = [];
    for (const row of ranked) {
      const topic = await ctx.db.get("topics", row.topicId);
      if (!topic || topic.status !== "active") continue;
      out.push({
        slug: topic.slug,
        question: topic.question,
        stakedCents: row.stakedCents,
        votes: row.freeLove + row.freeHate + row.paidLove + row.paidHate,
      });
    }
    return out;
  },
});

/**
 * Top backers, by the number of topics backed rather than by spend.
 *
 * That choice is the product's, not an implementation detail: ranking on total
 * spend would make the board a list of whoever has the most money, and the
 * whole point of one paid vote per person is that money buys no extra say.
 */
export const backers = query({
  args: { limit: v.optional(v.number()) },
  returns: v.array(
    v.object({
      displayName: v.string(),
      topicsBacked: v.number(),
      countryCode: v.union(v.null(), v.string()),
    }),
  ),
  handler: async (ctx, args) => {
    const rows = await ctx.db
      .query("users")
      .withIndex("by_backed")
      .order("desc")
      .take(Math.min(args.limit ?? 5, 20) + 5);

    return rows
      .filter((u) => u.topicsBacked > 0 && !u.isBanned && u.authId !== "system:discovery")
      .slice(0, Math.min(args.limit ?? 5, 20))
      .map((u) => ({
        displayName: u.displayName,
        topicsBacked: u.topicsBacked,
        countryCode: u.countryCode ?? null,
      }));
  },
});

/**
 * The live rail: everything happening, as it happens.
 *
 * Votes and comments interleaved, because a rail of votes alone is a rail of
 * dots — the comments are what make it read as a room with people in it.
 *
 * **A vote's side is withheld unless the reader has earned that topic.** The
 * original showed it; ported straight across that would hand over the gated
 * aggregate one row at a time, for free, to somebody who had paid nothing.
 * What is withheld is said so plainly rather than shown as a blank, because a
 * grey dot that means "you have not voted here" looks exactly like a bug.
 *
 * **Comments are never withheld.** They are opinions, not the tally, and
 * reading the argument is most of what makes somebody want to answer.
 *
 * Voters are never named. Commenters are, because they chose to speak.
 */
export const activity = query({
  args: { limit: v.optional(v.number()) },
  returns: v.array(
    v.object({
      kind: v.union(v.literal("vote"), v.literal("comment")),
      id: v.string(),
      at: v.number(),
      question: v.string(),
      slug: v.string(),
      /** Votes only. */
      countryCode: v.union(v.null(), v.string()),
      paid: v.boolean(),
      /** Null when this reader has not earned that topic's result. */
      choice: v.union(v.null(), v.string()),
      /** Comments only. */
      body: v.union(v.null(), v.string()),
      author: v.union(v.null(), v.string()),
    }),
  ),
  handler: async (ctx, args) => {
    const want = Math.min(args.limit ?? 14, 40);
    const me = await currentUser(ctx);

    // Read a little of each and merge, rather than reading one and hoping it
    // covers the window.
    const votes = await ctx.db.query("votes").order("desc").take(want);
    const comments = await ctx.db.query("comments").order("desc").take(want);

    const rows: {
      kind: "vote" | "comment";
      id: string;
      at: number;
      question: string;
      slug: string;
      countryCode: string | null;
      paid: boolean;
      choice: string | null;
      body: string | null;
      author: string | null;
    }[] = [];

    for (const vote of votes) {
      const topic = await ctx.db.get("topics", vote.topicId);
      if (!topic || topic.status !== "active") continue;
      rows.push({
        kind: "vote",
        id: vote._id,
        at: vote._creationTime,
        question: topic.question,
        slug: topic.slug,
        countryCode: vote.countryCode,
        paid: vote.voteType === "paid",
        choice: (await hasAccess(ctx, me?._id ?? null, vote.topicId))
          ? vote.choice
          : null,
        body: null,
        author: null,
      });
    }

    for (const comment of comments) {
      if (comment.deletedAt !== undefined) continue;
      const topic = await ctx.db.get("topics", comment.topicId);
      if (!topic || topic.status !== "active") continue;
      const author = await ctx.db.get("users", comment.userId);
      rows.push({
        kind: "comment",
        id: comment._id,
        at: comment._creationTime,
        question: topic.question,
        slug: topic.slug,
        countryCode: author?.countryCode ?? null,
        paid: false,
        choice: null,
        body: comment.body.slice(0, 140),
        author: author?.displayName ?? "Someone",
      });
    }

    return rows.sort((a, b) => b.at - a.at).slice(0, want);
  },
});
