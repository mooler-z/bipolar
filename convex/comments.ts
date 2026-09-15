import { v } from "convex/values";

import { mutation } from "./_generated/server";
import type { Id } from "./_generated/dataModel";
import { roster } from "./commentThread";
import { note } from "./interactions";
import { mentioned } from "./lib/mentions";
import { push } from "./notifications";
import { limiter } from "./limits";
import { requireUser } from "./users";

/**
 * Comments — the argument under the question.
 *
 * Live for nothing extra: a Convex query is a subscription, so every reader
 * watching a topic sees a new comment the instant it commits. There is no
 * socket to open, no poll to schedule and no cache to invalidate. That is most
 * of why the backend moved here.
 *
 * Four rules shape everything below.
 *
 * **A comment costs a quill**, and so does a reply. One quill, one line,
 * decremented in the same mutation as the insert — so a line cannot exist that
 * nobody paid for, and a quill cannot vanish without a line to show for it.
 *
 * **A like is free**, because the point of it is that everybody can afford to
 * agree. It is one row per person per comment, read before every write, so a
 * second tap takes the like back rather than adding another.
 *
 * **One level of replies.** A reply to a reply is filed under the same parent.
 * A thread that nests without limit is a thread nobody can read on a phone,
 * and the argument here is between two sides, not forty.
 *
 * **A mention names somebody already in the thread.** `@` plus a display name,
 * matched against the people who have commented here rather than parsed out of
 * the text — so a name with a space in it works, and nobody can be reached who
 * did not choose to be in this argument.
 *
 * **Removal is a soft delete.** Rule 8: the row survives, because the spend it
 * records has to. A removed comment still counts toward the topic's total —
 * the count is of what was said here, and a removal does not unsay it.
 *
 * Comments are **not gated**. A reader who has not voted may read them, and
 * that is deliberate: they are opinions, not the tally, and the argument is
 * most of what makes somebody want to answer.
 */

/**
 * Short on purpose. Six hundred characters is an essay, and an essay under a
 * one-tap question is somebody talking past the room; two hundred is a point.
 */
export const MAX_LENGTH = 200;

export const post = mutation({
  args: {
    topicId: v.id("topics"),
    body: v.string(),
    /** Answering a line rather than the question. */
    parentId: v.optional(v.id("comments")),
  },
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

    /* A reply answers a line on this topic that still has words in it. Reply
       to a reply and you are filed under its parent — the thread stays one
       level deep however deep the argument gets. */
    let parentId: Id<"comments"> | undefined;
    if (args.parentId) {
      const parent = await ctx.db.get("comments", args.parentId);
      if (!parent) throw new Error("That line is gone.");
      if (parent.topicId !== args.topicId) {
        throw new Error("That line belongs to another topic.");
      }
      if (parent.deletedAt !== undefined) throw new Error("That line was removed.");
      parentId = parent.parentId ?? parent._id;
    }

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
      parentId,
      likes: 0,
    });
    await note(ctx, user._id, topic, parentId ? "reply" : "comment");

    /* Somebody answered you. Written here so a notice cannot exist for a
       reply that was not posted, and never sent to the person replying. */
    const told = new Set<string>();
    if (parentId) {
      const answered = await ctx.db.get("comments", parentId);
      if (answered) {
        told.add(answered.userId);
        await push(ctx, answered.userId, user._id, "reply", {
          topicId: args.topicId,
          commentId,
          excerpt: body,
        });
      }
    }

    /* Somebody named you. Only against the roster — the people already in this
       thread — and only for names not already told about this same line, so
       replying to Sam and naming Sam rings Sam's bell once, not twice. */
    if (body.includes("@")) {
      for (const person of mentioned(body, await roster(ctx, args.topicId))) {
        if (told.has(person.id)) continue;
        told.add(person.id);
        await push(ctx, person.id as Id<"users">, user._id, "mention", {
          topicId: args.topicId,
          commentId,
          excerpt: body,
        });
      }
    }

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
 * Agree with a line, or take the agreement back.
 *
 * Free, because the point of it is that everybody can afford to agree — and
 * one row per person per comment, read before the write, so the count cannot
 * be inflated by tapping. The count and the row move together, so a like can
 * never exist without somebody's name on it.
 *
 * It teaches the ranker too: liking somebody's argument about a topic is a
 * cheap act, so it moves the weights less than anything that was paid for,
 * but it is still a reader saying *this, on this subject*.
 */
export const like = mutation({
  args: { commentId: v.id("comments") },
  returns: v.object({ liked: v.boolean(), likes: v.number() }),
  handler: async (ctx, args) => {
    const user = await requireUser(ctx);
    await limiter.limit(ctx, "like", { key: user._id, throws: true });

    const comment = await ctx.db.get("comments", args.commentId);
    if (!comment) throw new Error("That line is gone.");
    if (comment.deletedAt !== undefined) throw new Error("That line was removed.");

    const existing = await ctx.db
      .query("commentLikes")
      .withIndex("by_user_comment", (q) =>
        q.eq("userId", user._id).eq("commentId", args.commentId),
      )
      .unique();

    const likes = comment.likes ?? 0;
    const topic = await ctx.db.get("topics", comment.topicId);

    if (existing) {
      await ctx.db.delete("commentLikes", existing._id);
      const now = Math.max(0, likes - 1);
      await ctx.db.patch("comments", args.commentId, { likes: now });
      // Taking it back teaches too. A weight that can rise but never fall is
      // a weight that ends up saying nothing.
      if (topic) await note(ctx, user._id, topic, "unlike");
      return { liked: false, likes: now };
    }

    await ctx.db.insert("commentLikes", {
      userId: user._id,
      commentId: args.commentId,
      topicId: comment.topicId,
    });
    const now = likes + 1;
    await ctx.db.patch("comments", args.commentId, { likes: now });
    if (topic) await note(ctx, user._id, topic, "like");
    await push(ctx, comment.userId, user._id, "like", {
      topicId: comment.topicId,
      commentId: args.commentId,
      excerpt: comment.body,
    });

    return { liked: true, likes: now };
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
