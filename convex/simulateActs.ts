import type { MutationCtx } from "./_generated/server";
import type { Doc, Id } from "./_generated/dataModel";
import { note } from "./interactions";
import { pick, roll } from "./lib/seedOpinions";
import { castVote } from "./voteWrite";

/**
 * The three things a demo account can do.
 *
 * Split from `simulate.ts` because that file is about the switch and the
 * heartbeat, and this is about the acts themselves. Each one goes through
 * exactly the path a real person's does — the vote through `castVote`, the
 * comment through the same insert the composer uses, the like through the
 * same one-row-per-person check — so the counters stay honest and nothing
 * here is reachable by a route a real act is not.
 */

/**
 * What the room does in one beat.
 *
 * Weighted toward voting. At five acts a second a quarter-share of comments
 * would be four thousand an hour, which stops being a live room and becomes
 * a wall of text nobody scrolls; likes and votes are what a busy room is
 * mostly made of anyway.
 */
export async function perform(
  ctx: MutationCtx,
  acts: number,
): Promise<{ votes: number; comments: number; likes: number; refused: string[] }> {
  const voices = (await ctx.db.query("users").take(600)).filter((u) =>
    u.authId.startsWith("seed:"),
  );
  /* A wide pool. The demo accounts have already answered the newest few
     hundred questions, so a narrow window produced a beat of nothing but
     comments — every vote it tried was a repeat, which the rule refuses. */
  const topics = await ctx.db
    .query("topics")
    .withIndex("by_status", (q) => q.eq("status", "active"))
    .order("desc")
    .take(600);
  if (voices.length === 0 || topics.length === 0) {
    return { votes: 0, comments: 0, likes: 0, refused: ["no demo accounts or no topics"] };
  }

  /* Seeded from the clock in milliseconds, not the minute. The minute was
     reproducible and useless: two beats inside one minute did exactly the
     same things, which is both wrong and impossible to test. */
  const now = Date.now();
  let votes = 0;
  let comments = 0;
  let likes = 0;
  const refused: string[] = [];

  for (let i = 0; i < acts; i++) {
    const seed = `${now}:${i}`;
    const who = voices[pick(seed, "who", voices.length)]!;
    const topic = topics[pick(seed, "topic", topics.length)]!;
    const what = roll(seed, "what") % 100;

    if (what < 70) {
      votes += (await tryVote(ctx, who, topics, seed, refused)) ? 1 : 0;
    } else if (what < 82) {
      comments += (await trySay(ctx, who, topic, seed)) ? 1 : 0;
    } else {
      likes += (await tryLike(ctx, who, topic, seed)) ? 1 : 0;
    }
  }

  return { votes, comments, likes, refused: [...new Set(refused)].slice(0, 4) };
}

/** Something for a demo account to say. Short, and about the argument rather
    than about the person — a generated line that reads as an insult is a
    generated line somebody screenshots. */
const LINES = [
  "Hard disagree, and I have thought about it.",
  "This one is not close.",
  "Everyone in this thread is wrong.",
  "I keep changing my mind on this.",
  "Ask me again in a year.",
  "The split on this says more than the answer does.",
  "Context matters here and nobody is providing any.",
  "Strongly held, weakly justified. Mine included.",
  "This is the only sensible take.",
  "I was on the other side of this last month.",
  "The numbers are not the whole story.",
  "Genuinely surprised by where this landed.",
];

const REPLIES = [
  "That is not what the numbers say.",
  "Fair, but only half of it.",
  "This, exactly.",
  "You are describing a different question.",
  "Agreed, reluctantly.",
  "No — and here is the bit you are skipping.",
];

/**
 * A vote, through the transaction every other vote goes through.
 *
 * It tries a few questions rather than one. These accounts have answered most
 * of the feed already, and one pick almost always lands on a repeat — which
 * the rule refuses, correctly, leaving a tick with no votes in it at all.
 * Checking the index first is cheaper than catching the throw.
 */
async function tryVote(
  ctx: MutationCtx,
  who: Doc<"users">,
  topics: Doc<"topics">[],
  seed: string,
  refused: string[],
): Promise<boolean> {
  for (let attempt = 0; attempt < 6; attempt++) {
    const topic = topics[pick(seed, `topic${attempt}`, topics.length)]!;
    const already = await ctx.db
      .query("votes")
      .withIndex("by_user_topic_type", (q) =>
        q.eq("userId", who._id).eq("topicId", topic._id).eq("voteType", "free"),
      )
      .unique();
    if (already) {
      refused.push("already voted");
      continue;
    }
    try {
      await castVote(
        ctx,
        who,
        {
          topicId: topic._id,
          choice: roll(who.authId, topic._id) < 50 ? "love" : "hate",
          voteType: "free",
        },
        "web",
      );
      return true;
    } catch (err) {
      // Locked or closed. The rule doing its job, not a failure of the tick —
      // but the reason is worth carrying out, or a tick that does nothing is
      // indistinguishable from a tick that is switched off.
      refused.push((err as Error).message);
      return false;
    }
  }
  return false;
}

/** A line, or an answer to one. A reply is the more interesting act, so it is
    preferred wherever there is something to reply to. */
async function trySay(
  ctx: MutationCtx,
  who: Doc<"users">,
  topic: Doc<"topics">,
  seed: string,
): Promise<boolean> {
  const existing = await ctx.db
    .query("comments")
    .withIndex("by_topic", (q) => q.eq("topicId", topic._id))
    .order("desc")
    .take(20);
  const answerable = existing.filter(
    (c) => c.deletedAt === undefined && c.parentId === undefined && c.userId !== who._id,
  );

  const replying = answerable.length > 0 && roll(seed, "reply") % 100 < 60;
  const parent = replying ? answerable[pick(seed, "which", answerable.length)]! : null;
  const body = replying
    ? REPLIES[pick(seed, "line", REPLIES.length)]!
    : LINES[pick(seed, "line", LINES.length)]!;

  const commentId = await ctx.db.insert("comments", {
    topicId: topic._id,
    userId: who._id,
    body,
    parentId: parent?._id,
    likes: 0,
  });
  await note(ctx, who._id, topic, parent ? "reply" : "comment");

  const stats = await ctx.db
    .query("topicStats")
    .withIndex("by_topic", (q) => q.eq("topicId", topic._id))
    .unique();
  if (stats) {
    await ctx.db.patch("topicStats", stats._id, { comments: stats.comments + 1 });
  }
  void commentId;
  return true;
}

/** Agreement with somebody else's line. One row per person per comment, read
    before the write, exactly as the real one is. */
async function tryLike(
  ctx: MutationCtx,
  who: Doc<"users">,
  topic: Doc<"topics">,
  seed: string,
): Promise<boolean> {
  const said = (
    await ctx.db
      .query("comments")
      .withIndex("by_topic", (q) => q.eq("topicId", topic._id))
      .order("desc")
      .take(20)
  ).filter((c) => c.deletedAt === undefined && c.userId !== who._id);
  if (said.length === 0) return false;

  const target = said[pick(seed, "like", said.length)]!;
  const already = await ctx.db
    .query("commentLikes")
    .withIndex("by_user_comment", (q) =>
      q.eq("userId", who._id).eq("commentId", target._id),
    )
    .unique();
  if (already) return false;

  await ctx.db.insert("commentLikes", {
    userId: who._id,
    commentId: target._id as Id<"comments">,
    topicId: topic._id,
  });
  await ctx.db.patch("comments", target._id, { likes: (target.likes ?? 0) + 1 });
  await note(ctx, who._id, topic, "like");
  return true;
}

