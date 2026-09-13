import { v } from "convex/values";

import { mutation, query } from "./_generated/server";
import { limiter } from "./limits";
import { currentUser, requireUser } from "./users";

/**
 * Comments — the argument under the question.
 *
 * Live for nothing extra: a Convex query is a subscription, so every reader
 * watching a topic sees a new comment the instant it commits. There is no
 * socket to open, no poll to schedule and no cache to invalidate. That is most
 * of why the backend moved here.
 *
 * Two rules shape everything below.
 *
 * **A comment costs a quill.** One quill, one comment, decremented in the same
 * mutation as the insert — so a comment cannot exist that nobody paid for, and
 * a quill cannot vanish without a comment to show for it.
 *
 * **Removal is a soft delete.** Rule 8: the row survives, because the spend it
 * records has to. A removed comment still counts toward the topic's total —
 * the count is of what was said here, and a removal does not unsay it.
 *
 * Comments are **not gated**. A reader who has not voted may read them, and
 * that is deliberate: they are opinions, not the tally, and the argument is
 * most of what makes somebody want to answer.
 */

const MAX_LENGTH = 600;

export const list = query({
  args: { slug: v.string(), limit: v.optional(v.number()) },
  returns: v.array(
    v.object({
      _id: v.id("comments"),
      at: v.number(),
      author: v.string(),
      /** Null when removed. The row stays; the words do not. */
      body: v.union(v.null(), v.string()),
      mine: v.boolean(),
      canRemove: v.boolean(),
    }),
  ),
  handler: async (ctx, args) => {
    const topic = await ctx.db
      .query("topics")
      .withIndex("by_slug", (q) => q.eq("slug", args.slug))
      .unique();
    if (!topic) return [];

    const me = await currentUser(ctx);
    const rows = await ctx.db
      .query("comments")
      .withIndex("by_topic", (q) => q.eq("topicId", topic._id))
      .order("desc")
      .take(Math.min(args.limit ?? 50, 100));

    const out = [];
    for (const row of rows) {
      const author = await ctx.db.get("users", row.userId);
      const mine = me !== null && me._id === row.userId;
      out.push({
        _id: row._id,
        at: row._creationTime,
        author: author?.displayName ?? "Someone",
        body: row.deletedAt === undefined ? row.body : null,
        mine,
        canRemove:
          row.deletedAt === undefined &&
          (mine || me?.role === "moderator" || me?.role === "admin"),
      });
    }
    return out;
  },
});

export const post = mutation({
  args: { topicId: v.id("topics"), body: v.string() },
  returns: v.id("comments"),
  handler: async (ctx, args) => {
    const user = await requireUser(ctx);
    const body = args.body.trim();
    if (body.length === 0) throw new Error("Say something.");
    if (body.length > MAX_LENGTH) {
      throw new Error(`Comments are ${MAX_LENGTH} characters or fewer.`);
    }

    // A quill is spent either way; this is about flooding a topic, not cost.
    await limiter.limit(ctx, "comment", { key: user._id, throws: true });

    const topic = await ctx.db.get("topics", args.topicId);
    if (!topic) throw new Error("No such topic.");
    if (topic.status !== "active") throw new Error("This topic is closed.");
    if (topic.isLocked) throw new Error("This topic is frozen.");

    // The money check before any write, exactly as the vote does it.
    if (user.quillBalance < 1) {
      throw new Error("Out of quills. One quill buys one comment.");
    }
    await ctx.db.patch("users", user._id, {
      quillBalance: user.quillBalance - 1,
    });

    const commentId = await ctx.db.insert("comments", {
      topicId: args.topicId,
      userId: user._id,
      body,
    });

    // The running total, in the same transaction as the row it counts.
    const stats = await ctx.db
      .query("topicStats")
      .withIndex("by_topic", (q) => q.eq("topicId", args.topicId))
      .unique();
    if (stats) {
      await ctx.db.patch("topicStats", stats._id, {
        comments: stats.comments + 1,
      });
    }

    return commentId;
  },
});

/**
 * Remove a comment. Soft, always — the row is the record of a quill spent.
 *
 * An author tidying up after themselves is ordinary. A moderator removing
 * somebody else's words is privileged, and lands an `auditLog` row in the same
 * mutation, per Rule 8.
 */
export const remove = mutation({
  args: { commentId: v.id("comments") },
  returns: v.null(),
  handler: async (ctx, args) => {
    const user = await requireUser(ctx);
    const comment = await ctx.db.get("comments", args.commentId);
    if (!comment) throw new Error("No such comment.");
    if (comment.deletedAt !== undefined) return null;

    const mine = comment.userId === user._id;
    const moderator = user.role === "moderator" || user.role === "admin";
    if (!mine && !moderator) throw new Error("Not yours to remove.");

    await ctx.db.patch("comments", args.commentId, { deletedAt: Date.now() });

    if (!mine) {
      await ctx.db.insert("auditLog", {
        actorId: user._id,
        action: "comment.removed",
        targetType: "comments",
        targetId: args.commentId,
        metadata: { topicId: comment.topicId, authorId: comment.userId },
      });
    }
    // The quill is not refunded and the count does not move. Both are the
    // point: the spend happened, and the row is what proves it.
    return null;
  },
});
