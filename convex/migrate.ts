import { v } from "convex/values";

import { internalMutation } from "./_generated/server";

/**
 * One-off backfills.
 *
 * A field added to a table that already holds rows cannot simply become
 * required — the deploy is refused, and rightly so. The sequence is: land it
 * optional, fill every row, then make it required. This is the middle step,
 * and it is written to be safe to run twice.
 */

/**
 * `users.topicsBacked` — the running total behind the top-backers board.
 *
 * Counted from the votes themselves rather than set to zero, so the board is
 * true from the first read rather than true from the next paid vote onwards.
 */
export const backfillTopicsBacked = internalMutation({
  args: {},
  returns: v.object({ filled: v.number(), alreadyHad: v.number() }),
  handler: async (ctx) => {
    let filled = 0;
    let alreadyHad = 0;

    for (const user of await ctx.db.query("users").take(2_000)) {
      if (user.topicsBacked !== undefined) {
        alreadyHad += 1;
        continue;
      }
      const paid = (
        await ctx.db
          .query("votes")
          .withIndex("by_user", (q) => q.eq("userId", user._id))
          .take(1_000)
      ).filter((row) => row.voteType === "paid");

      await ctx.db.patch("users", user._id, { topicsBacked: paid.length });
      filled += 1;
    }
    return { filled, alreadyHad };
  },
});

/**
 * `topicStats.comments` — the running total behind the comment count.
 *
 * Counted from the rows rather than zeroed, and soft-deleted comments are
 * counted too: the count is of what was said here, and a removal does not
 * unsay it or refund the quill.
 */
export const backfillCommentCount = internalMutation({
  args: {},
  returns: v.object({ filled: v.number(), alreadyHad: v.number() }),
  handler: async (ctx) => {
    let filled = 0;
    let alreadyHad = 0;

    for (const stats of await ctx.db.query("topicStats").take(2_000)) {
      if (stats.comments !== undefined) {
        alreadyHad += 1;
        continue;
      }
      const rows = await ctx.db
        .query("comments")
        .withIndex("by_topic", (q) => q.eq("topicId", stats.topicId))
        .take(1_000);

      await ctx.db.patch("topicStats", stats._id, { comments: rows.length });
      filled += 1;
    }
    return { filled, alreadyHad };
  },
});

