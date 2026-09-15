import { v } from "convex/values";

import { mutation, type MutationCtx } from "./_generated/server";
import type { Doc, Id } from "./_generated/dataModel";
import { keysOf, step, type Act } from "./lib/affinity";
import { requireUser } from "./users";

/**
 * Everything a reader does to a topic, written down, and what it teaches.
 *
 * The recommender is only as good as what it can see, and until this existed
 * it could see votes and skips. Pulling a topic out of the room by hand,
 * writing about it, paying to see it, taking a vote back — each says
 * something a tap does not, and none of it was written down.
 *
 * `note` rides inside the mutation that performs the act, so the very next
 * feed reflects it, and it is written so that it can never be the reason the
 * act fails: indexed reads, a handful of small writes, nothing thrown.
 */
export async function note(
  ctx: MutationCtx,
  userId: Id<"users">,
  topic: Doc<"topics">,
  kind: Act,
  choice?: "love" | "hate",
): Promise<void> {
  await ctx.db.insert("interactions", {
    userId,
    topicId: topic._id,
    kind,
    choice,
    categoryId: topic.categoryId,
    tagSlugs: topic.tagSlugs ?? [],
    scopeCountry: topic.scopeCountry,
  });

  // What the act taught: one weight per thing the topic is made of. The
  // strength is the act's — a pull moves more than a tap, a skip moves the
  // other way, an undo takes most of a vote back.
  for (const key of keysOf(topic)) {
    const row = await ctx.db
      .query("userAffinity")
      .withIndex("by_user_key", (q) => q.eq("userId", userId).eq("key", key))
      .unique();
    if (row) {
      await ctx.db.patch("userAffinity", row._id, {
        weight: step(row.weight, kind),
        n: row.n + 1,
      });
    } else {
      await ctx.db.insert("userAffinity", {
        userId,
        key,
        weight: step(undefined, kind),
        n: 1,
      });
    }
  }
}

/**
 * A topic chosen from a rail. The strongest thing a reader can say about a
 * subject short of paying for it: they went and got it. The console calls
 * this when a pulled card lands, not on the press, so a pull that resolved to
 * nothing teaches nothing.
 */
export const pull = mutation({
  args: { topicId: v.id("topics") },
  returns: v.null(),
  handler: async (ctx, args) => {
    const user = await requireUser(ctx);
    const topic = await ctx.db.get("topics", args.topicId);
    if (!topic) return null;
    await note(ctx, user._id, topic, "pull");
    return null;
  },
});
