import { v } from "convex/values";

import {
  internalMutation,
  mutation,
  query,
  type MutationCtx,
} from "./_generated/server";
import type { Doc, Id } from "./_generated/dataModel";
import { currentUser, requireUser } from "./users";

/**
 * What happened while you were not looking.
 *
 * The daily mail reaches people who are somewhere else; this reaches the ones
 * who came back. Four things are worth being told: somebody answered you,
 * somebody named you, somebody agreed with you, and the room found something
 * worth arguing about.
 *
 * Three rules hold for all of them.
 *
 * **Written in the same mutation as the thing it announces.** A notice cannot
 * exist for a reply that was not posted, and a reply cannot be posted without
 * its notice — the same arrangement Rule 8 uses for the audit log.
 *
 * **Never about your own act.** Being told what you just did is noise, and it
 * is the fastest way to teach somebody that the bell is worth ignoring.
 *
 * **Nothing is ever deleted.** `readAt` is the only field that changes. A
 * notice is a record of a moment, and a moment does not stop having happened
 * because it was read.
 */

/** Say something happened, unless it happened to the person who did it. */
export async function push(
  ctx: MutationCtx,
  to: Id<"users">,
  by: Id<"users"> | null,
  kind: "reply" | "like" | "mention" | "hot",
  about: { topicId?: Id<"topics">; commentId?: Id<"comments">; excerpt?: string },
): Promise<void> {
  if (by && by === to) return;
  await ctx.db.insert("notifications", {
    userId: to,
    kind,
    actorId: by ?? undefined,
    topicId: about.topicId,
    commentId: about.commentId,
    excerpt: about.excerpt?.slice(0, 90),
    readAt: undefined,
  });
}

const row = v.object({
  _id: v.id("notifications"),
  at: v.number(),
  kind: v.string(),
  /** Who did it, as a name. Null for the daily hot topic. */
  actor: v.union(v.null(), v.string()),
  excerpt: v.union(v.null(), v.string()),
  /** Where it goes when pressed. */
  slug: v.union(v.null(), v.string()),
  question: v.union(v.null(), v.string()),
  read: v.boolean(),
});

/** The bell's own number. Cheap, because the badge is on every screen. */
export const unread = query({
  args: {},
  returns: v.number(),
  handler: async (ctx) => {
    const me = await currentUser(ctx);
    if (!me) return 0;
    const rows = await ctx.db
      .query("notifications")
      .withIndex("by_user_read", (q) => q.eq("userId", me._id).eq("readAt", undefined))
      .take(50);
    return rows.length;
  },
});

export const list = query({
  args: { limit: v.optional(v.number()) },
  returns: v.array(row),
  handler: async (ctx, args) => {
    const me = await currentUser(ctx);
    if (!me) return [];

    const rows = await ctx.db
      .query("notifications")
      .withIndex("by_user", (q) => q.eq("userId", me._id))
      .order("desc")
      .take(Math.min(args.limit ?? 30, 60));

    const names = new Map<string, string>();
    const topics = new Map<string, Doc<"topics"> | null>();
    const out = [];
    for (const n of rows) {
      if (n.actorId && !names.has(n.actorId)) {
        const who = await ctx.db.get("users", n.actorId);
        names.set(n.actorId, who?.displayName ?? "Someone");
      }
      if (n.topicId && !topics.has(n.topicId)) {
        topics.set(n.topicId, await ctx.db.get("topics", n.topicId));
      }
      const topic = n.topicId ? topics.get(n.topicId) : null;
      out.push({
        _id: n._id,
        at: n._creationTime,
        kind: n.kind,
        actor: n.actorId ? (names.get(n.actorId) ?? null) : null,
        excerpt: n.excerpt ?? null,
        slug: topic?.slug ?? null,
        question: topic?.question ?? null,
        read: n.readAt !== undefined,
      });
    }
    return out;
  },
});

/** Read. One, or everything — opening the panel is reading it. */
export const markRead = mutation({
  args: { notificationId: v.optional(v.id("notifications")) },
  returns: v.null(),
  handler: async (ctx, args) => {
    const user = await requireUser(ctx);
    const now = Date.now();

    if (args.notificationId) {
      const one = await ctx.db.get("notifications", args.notificationId);
      if (one && one.userId === user._id && one.readAt === undefined) {
        await ctx.db.patch("notifications", one._id, { readAt: now });
      }
      return null;
    }

    const unread = await ctx.db
      .query("notifications")
      .withIndex("by_user_read", (q) => q.eq("userId", user._id).eq("readAt", undefined))
      .take(60);
    for (const n of unread) {
      await ctx.db.patch("notifications", n._id, { readAt: now });
    }
    return null;
  },
});

/**
 * The hot topic, in the app.
 *
 * The mail goes to whoever asked for mail; this goes to everyone who signed
 * up, because coming back and finding nothing is how a habit dies. One notice
 * a day, and the same dedupe key the mail uses, so a cron that fires twice
 * announces once.
 */
export const announceHot = internalMutation({
  args: { topicId: v.id("topics"), question: v.string(), day: v.string() },
  returns: v.object({ told: v.number() }),
  handler: async (ctx, args) => {
    /* The day's key, in the settings store rather than the mail log: this is
       not a send, and a row in the mail log that never went anywhere would be
       a lie about what was mailed. */
    const key = `announced:hot:${args.day}`;
    const already = await ctx.db
      .query("settings")
      .withIndex("by_key", (q) => q.eq("key", key))
      .unique();
    if (already) return { told: 0 };
    await ctx.db.insert("settings", { key, value: args.topicId });

    let told = 0;
    for (const user of await ctx.db.query("users").take(1_000)) {
      if (user.isBanned || user.authId === "system:discovery") continue;
      await push(ctx, user._id, null, "hot", {
        topicId: args.topicId,
        excerpt: args.question,
      });
      told += 1;
    }
    return { told };
  },
});
