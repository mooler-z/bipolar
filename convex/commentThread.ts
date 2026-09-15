import { v } from "convex/values";

import { query, type QueryCtx } from "./_generated/server";
import type { Doc, Id } from "./_generated/dataModel";
import type { Named } from "./lib/mentions";
import { currentUser } from "./users";

/**
 * Reading the argument.
 *
 * Its own file because the ordering is the hard part and it has nothing to do
 * with the writes: parents oldest first, each followed by its own replies,
 * decided **here** rather than in the browser. A client cannot work that out
 * from one page of a flat list without knowing where the page ends, and a
 * reply whose parent fell off the end would render as an orphan.
 */

export const list = query({
  args: { slug: v.string(), limit: v.optional(v.number()) },
  returns: v.array(
    v.object({
      _id: v.id("comments"),
      at: v.number(),
      author: v.string(),
      /** Null when removed. The row stays; the words do not. */
      body: v.union(v.null(), v.string()),
      /** The line this answers, when it answers one. */
      parentId: v.union(v.null(), v.id("comments")),
      /** 0 for a line, 1 for a reply. The order is already the thread order. */
      depth: v.number(),
      likes: v.number(),
      /** Whether the reader looking has liked it. */
      liked: v.boolean(),
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
      .take(Math.min(args.limit ?? 60, 150));

    /* Thread order, decided here rather than in the browser: parents oldest
       first, each one followed by its own replies. A client cannot work this
       out from a flat list without knowing the page boundary, and a reply
       whose parent fell off the page would be an orphan on screen. */
    const byId = new Map(rows.map((r) => [r._id as string, r]));
    const parents = rows
      .filter((r) => !r.parentId || !byId.has(r.parentId))
      .sort((a, b) => a._creationTime - b._creationTime);
    const repliesOf = new Map<string, Doc<"comments">[]>();
    for (const r of rows) {
      if (!r.parentId || !byId.has(r.parentId)) continue;
      const kin = repliesOf.get(r.parentId) ?? [];
      kin.push(r);
      repliesOf.set(r.parentId, kin);
    }

    const ordered: { row: Doc<"comments">; depth: number }[] = [];
    for (const parent of parents) {
      ordered.push({ row: parent, depth: 0 });
      for (const reply of (repliesOf.get(parent._id) ?? []).sort(
        (a, b) => a._creationTime - b._creationTime,
      )) {
        ordered.push({ row: reply, depth: 1 });
      }
    }

    const names = new Map<string, string>();
    const out = [];
    for (const { row, depth } of ordered) {
      if (!names.has(row.userId)) {
        const author = await ctx.db.get("users", row.userId);
        names.set(row.userId, author?.displayName ?? "Someone");
      }
      const mine = me !== null && me._id === row.userId;
      const liked = me
        ? (await ctx.db
            .query("commentLikes")
            .withIndex("by_user_comment", (q) =>
              q.eq("userId", me._id).eq("commentId", row._id),
            )
            .unique()) !== null
        : false;
      out.push({
        _id: row._id,
        at: row._creationTime,
        author: names.get(row.userId)!,
        body: row.deletedAt === undefined ? row.body : null,
        parentId: row.parentId ?? null,
        depth,
        likes: row.likes ?? 0,
        liked,
        mine,
        canRemove:
          row.deletedAt === undefined &&
          (mine || me?.role === "moderator" || me?.role === "admin"),
      });
    }
    return out;
  },
});

/**
 * Who this thread lets you name.
 *
 * Everybody who has said something here, and nobody else. A mention that could
 * reach any account in the database is a notification anybody can send to
 * anybody, which is a spam tool with a friendly icon — so the roster is the
 * room, and the room is small.
 *
 * Voters are deliberately absent. A vote in the live rail carries a country
 * and a side and no name, and that is the promise the product makes about
 * voting; a mention picker that revealed who voted would quietly break it.
 * Commenters put their name on the line themselves.
 */
export async function roster(
  ctx: QueryCtx,
  topicId: Id<"topics">,
): Promise<Named[]> {
  const rows = await ctx.db
    .query("comments")
    .withIndex("by_topic", (q) => q.eq("topicId", topicId))
    .order("desc")
    .take(150);

  const out: Named[] = [];
  const seen = new Set<string>();
  for (const row of rows) {
    if (seen.has(row.userId)) continue;
    seen.add(row.userId);
    const who = await ctx.db.get("users", row.userId);
    if (who?.displayName) out.push({ id: row.userId, name: who.displayName });
  }
  return out;
}

export const people = query({
  args: { slug: v.string() },
  returns: v.array(v.object({ id: v.id("users"), name: v.string() })),
  handler: async (ctx, args) => {
    const topic = await ctx.db
      .query("topics")
      .withIndex("by_slug", (q) => q.eq("slug", args.slug))
      .unique();
    if (!topic) return [];

    const me = await currentUser(ctx);
    const all = await roster(ctx, topic._id);
    // Naming yourself sends nothing, so offering it is offering a dead option.
    return all
      .filter((p) => p.id !== me?._id)
      .map((p) => ({ id: p.id as Id<"users">, name: p.name }));
  },
});
