import { v } from "convex/values";

import { query, type MutationCtx, type QueryCtx } from "./_generated/server";
import type { Doc, Id } from "./_generated/dataModel";
import { currentUser } from "./users";

/**
 * Calling the room.
 *
 * Answering a question resolves it completely and instantly, which is why a
 * result bar holds nobody: there is nothing left to find out. So a vote now
 * carries a second, harder answer — *which way did everyone else go?* — and the
 * reveal grades it.
 *
 * Three rules make the grade worth having:
 *
 * **The room excludes you.** A call is graded against the crowd as it stood
 * before this vote joined it. Otherwise a voter on a quiet topic tips the very
 * majority they are being marked against, and on a dead-empty one would be
 * right by construction.
 *
 * **Small rooms are not graded at all.** Under `MIN_ROOM` there is no crowd to
 * read, only noise, and a record built on noise is worth nothing to its owner.
 *
 * **The verdict is snapshotted.** Later votes change the topic; they never
 * change your result. A call is as final as the vote it rides on.
 */

/** Free votes needed before a topic has a readable crowd. */
export const MIN_ROOM = 5;

export const verdictValidator = v.union(
  v.null(),
  v.object({
    called: v.string(),
    crowdWent: v.string(),
    correct: v.boolean(),
    /** Percentage the crowd landed on, its own side. */
    crowdPct: v.number(),
    streak: v.number(),
    bestStreak: v.number(),
  }),
);

type Counters = Pick<Doc<"topicStats">, "freeLove" | "freeHate">;

/** Is this room big enough to be read? */
export function readable(before: Counters): boolean {
  return before.freeLove + before.freeHate >= MIN_ROOM;
}

/**
 * Grade a call and fold it into the caller's record.
 *
 * Called from inside the vote transaction, never on its own: the call and the
 * vote have to commit together or a reader could take the vote, look at the
 * result it unlocks, and then call a room they have already seen.
 */
export async function record(
  ctx: MutationCtx,
  userId: Id<"users">,
  topicId: Id<"topics">,
  call: "love" | "hate",
  myChoice: "love" | "hate",
  before: Counters,
): Promise<typeof verdictValidator.type> {
  // One call per topic per person. A free vote and a paid vote on the same
  // topic are two votes but one reading of the room.
  const already = await ctx.db
    .query("calls")
    .withIndex("by_user_topic", (q) =>
      q.eq("userId", userId).eq("topicId", topicId),
    )
    .unique();
  if (already) return null;

  const sampleSize = before.freeLove + before.freeHate;
  const stats = await statsRow(ctx, userId);

  if (sampleSize < MIN_ROOM) {
    // Nothing to read, so nothing is recorded. A streak is not broken by a
    // room that was never gradeable — that would punish being early.
    return null;
  }

  const crowdWasLove = before.freeLove >= before.freeHate;
  const correct = (crowdWasLove ? "love" : "hate") === call;
  const streak = correct ? stats.streak + 1 : 0;

  await ctx.db.insert("calls", {
    userId,
    topicId,
    crowdSide: call,
    crowdWasLove,
    correct,
    sampleSize,
  });

  await ctx.db.patch("callerStats", stats._id, {
    made: stats.made + 1,
    right: stats.right + (correct ? 1 : 0),
    streak,
    bestStreak: Math.max(stats.bestStreak, streak),
    graded: stats.graded + 1,
    withCrowd:
      stats.withCrowd + ((crowdWasLove ? "love" : "hate") === myChoice ? 1 : 0),
  });

  const winner = crowdWasLove ? before.freeLove : before.freeHate;
  return {
    called: call,
    crowdWent: crowdWasLove ? "love" : "hate",
    correct,
    crowdPct: Math.round((winner / sampleSize) * 100),
    streak,
    bestStreak: Math.max(stats.bestStreak, streak),
  };
}

/** A voter's record, created on first need. */
async function statsRow(
  ctx: MutationCtx,
  userId: Id<"users">,
): Promise<Doc<"callerStats">> {
  const found = await ctx.db
    .query("callerStats")
    .withIndex("by_user", (q) => q.eq("userId", userId))
    .unique();
  if (found) return found;

  const id = await ctx.db.insert("callerStats", {
    userId,
    made: 0,
    right: 0,
    streak: 0,
    bestStreak: 0,
    graded: 0,
    withCrowd: 0,
  });
  return (await ctx.db.get("callerStats", id))!;
}

async function readRow(
  ctx: QueryCtx,
  userId: Id<"users">,
): Promise<Doc<"callerStats"> | null> {
  return await ctx.db
    .query("callerStats")
    .withIndex("by_user", (q) => q.eq("userId", userId))
    .unique();
}

/** The caller's own record. What the streak and accuracy on screen read from. */
export const me = query({
  args: {},
  returns: v.union(
    v.null(),
    v.object({
      made: v.number(),
      right: v.number(),
      accuracy: v.number(),
      streak: v.number(),
      bestStreak: v.number(),
      /** How often this person breaks from the room, as a percentage. */
      contrarian: v.number(),
      graded: v.number(),
    }),
  ),
  handler: async (ctx) => {
    const user = await currentUser(ctx);
    if (!user) return null;
    const row = await readRow(ctx, user._id);
    if (!row) {
      return {
        made: 0,
        right: 0,
        accuracy: 0,
        streak: 0,
        bestStreak: 0,
        contrarian: 0,
        graded: 0,
      };
    }
    return {
      made: row.made,
      right: row.right,
      accuracy: row.made === 0 ? 0 : Math.round((row.right / row.made) * 100),
      streak: row.streak,
      bestStreak: row.bestStreak,
      contrarian:
        row.graded === 0
          ? 0
          : Math.round(((row.graded - row.withCrowd) / row.graded) * 100),
      graded: row.graded,
    };
  },
});

/**
 * The board that is not a spend ranking.
 *
 * Ranked on how well people read the room, with a floor under it: an account
 * that called three rooms and got all three is not a better reader than one
 * that called eighty and got sixty, and a leaderboard that says otherwise
 * teaches everybody to stop after a lucky start.
 */
export const readers = query({
  args: { limit: v.optional(v.number()) },
  returns: v.array(
    v.object({
      displayName: v.string(),
      countryCode: v.union(v.null(), v.string()),
      accuracy: v.number(),
      made: v.number(),
      streak: v.number(),
    }),
  ),
  handler: async (ctx, args) => {
    const want = Math.min(args.limit ?? 5, 20);
    const rows = await ctx.db.query("callerStats").take(500);

    const ranked = rows
      .filter((r) => r.made >= 10)
      .sort((a, b) => b.right / b.made - a.right / a.made)
      .slice(0, want);

    const out = [];
    for (const row of ranked) {
      const user = await ctx.db.get("users", row.userId);
      if (!user || user.isBanned) continue;
      out.push({
        displayName: user.displayName,
        countryCode: user.countryCode ?? null,
        accuracy: Math.round((row.right / row.made) * 100),
        made: row.made,
        streak: row.streak,
      });
    }
    return out;
  },
});

/**
 * Open loops: your calls where the room has not settled.
 *
 * The Zeigarnik effect is the one mechanic this product had no version of.
 * Everything here resolved the instant it was answered — vote, graded, done —
 * which is exactly the shape that leaves nothing pending when the tab closes.
 *
 * These are the topics a reader has already earned where the crowd is still
 * within a few points of even. Nothing is invented: the tension is real, the
 * numbers are the live ones, and if the room settles the row simply leaves.
 * An honest open loop rather than a manufactured one.
 */
export const stillMoving = query({
  args: { limit: v.optional(v.number()) },
  returns: v.array(
    v.object({
      slug: v.string(),
      question: v.string(),
      lovePct: v.number(),
      total: v.number(),
      /** Which way this reader called it, when they did. */
      called: v.union(v.null(), v.string()),
      /** True while the reader's call is currently the losing side. */
      losing: v.boolean(),
    }),
  ),
  handler: async (ctx, args) => {
    const user = await currentUser(ctx);
    if (!user) return [];

    const rows = await ctx.db
      .query("calls")
      .withIndex("by_user", (q) => q.eq("userId", user._id))
      .order("desc")
      .take(40);

    const out = [];
    for (const call of rows) {
      const stats = await ctx.db
        .query("topicStats")
        .withIndex("by_topic", (q) => q.eq("topicId", call.topicId))
        .unique();
      if (!stats) continue;

      const love = stats.freeLove;
      const total = love + stats.freeHate;
      if (total < MIN_ROOM) continue;

      const lovePct = Math.round((love / total) * 100);
      // Only the close ones. A settled topic is not an open loop, it is a
      // result, and dressing it up as suspense would be the manufactured kind.
      if (Math.abs(lovePct - 50) > 12) continue;

      const topic = await ctx.db.get("topics", call.topicId);
      if (!topic || topic.status !== "active") continue;

      const leading = lovePct >= 50 ? "love" : "hate";
      out.push({
        slug: topic.slug,
        question: topic.question,
        lovePct,
        total,
        called: call.crowdSide,
        losing: call.crowdSide !== leading,
      });
      if (out.length >= Math.min(args.limit ?? 4, 10)) break;
    }
    return out;
  },
});

