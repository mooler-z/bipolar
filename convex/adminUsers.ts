import { v } from "convex/values";

import { mutation, query } from "./_generated/server";
import type { Doc, Id } from "./_generated/dataModel";
import { ROLE_RANK, ROLES, type Role } from "./lib/rbac";
import { audit, requirePermission } from "./admin";

/**
 * The people console.
 *
 * Reading is a moderator's job; changing a role is an admin's. That split is
 * already in `rbac.ts` and this file only enforces it — `users:read` to look,
 * `users:ban` to suspend, `users:set_role` to promote.
 *
 * Two rules on top of the capability check, because a permission cannot see
 * who it is being pointed at:
 *
 * 1. **Never yourself.** An admin who can demote or suspend their own account
 *    is one misclick from locking everybody out of the console, and the
 *    recovery for that is a CLI call nobody wants to be making at speed.
 * 2. **Never upward, never sideways.** You cannot act on somebody who ranks at
 *    or above you. Without it, any moderator could suspend every admin, which
 *    makes the hierarchy decorative.
 *
 * Rule 8 holds throughout: every write here lands an `auditLog` row in the
 * same mutation, naming who did it, to whom, and what it was before.
 */

/** A bounded scan. This console is for finding somebody, not for exporting. */
const SCAN = 800;

const row = v.object({
  _id: v.id("users"),
  displayName: v.string(),
  email: v.string(),
  avatarUrl: v.union(v.null(), v.string()),
  role: v.string(),
  isBanned: v.boolean(),
  countryCode: v.union(v.null(), v.string()),
  walletBalanceCents: v.number(),
  quillBalance: v.number(),
  topicsBacked: v.number(),
  joinedAt: v.number(),
  /** Whether this account can be acted on by the reader looking at it. */
  actionable: v.boolean(),
});

/**
 * Who may act on whom.
 *
 * Yourself is never actionable, and neither is anybody at or above your own
 * rank. Returned to the client as a flag so the buttons match the server
 * rather than offering something that will be refused — the refusal is still
 * the real control.
 */
function actionableBy(me: Doc<"users">, target: Doc<"users">): boolean {
  if (me._id === target._id) return false;
  return ROLE_RANK[me.role as Role] > ROLE_RANK[target.role as Role];
}

export const list = query({
  args: {
    search: v.optional(v.string()),
    role: v.optional(v.string()),
    /** "banned" or "active". Absent means everybody. */
    standing: v.optional(v.string()),
    limit: v.optional(v.number()),
  },
  returns: v.object({ rows: v.array(row), total: v.number(), scanned: v.number() }),
  handler: async (ctx, args) => {
    const me = await requirePermission(ctx, "users:read");

    const all = await ctx.db.query("users").order("desc").take(SCAN);
    const needle = (args.search ?? "").trim().toLowerCase();

    const matched = all.filter((u) => {
      if (args.role && u.role !== args.role) return false;
      if (args.standing === "banned" && !u.isBanned) return false;
      if (args.standing === "active" && u.isBanned) return false;
      if (!needle) return true;
      return (
        u.displayName.toLowerCase().includes(needle) ||
        u.email.toLowerCase().includes(needle)
      );
    });

    const rows = matched.slice(0, Math.min(args.limit ?? 60, 200)).map((u) => ({
      _id: u._id,
      displayName: u.displayName,
      email: u.email,
      avatarUrl: u.avatarUrl ?? null,
      role: u.role,
      isBanned: u.isBanned,
      countryCode: u.countryCode ?? null,
      walletBalanceCents: u.walletBalanceCents,
      quillBalance: u.quillBalance,
      topicsBacked: u.topicsBacked,
      joinedAt: u._creationTime,
      actionable: actionableBy(me, u),
    }));

    return { rows, total: matched.length, scanned: all.length };
  },
});

/** One account, with what it has actually done. */
export const detail = query({
  args: { userId: v.id("users") },
  returns: v.union(
    v.null(),
    v.object({
      user: row,
      votes: v.number(),
      love: v.number(),
      paid: v.number(),
      comments: v.number(),
      calls: v.object({
        graded: v.number(),
        right: v.number(),
        streak: v.number(),
      }),
      telegram: v.union(v.null(), v.string()),
      /** Their own most recent privileged acts, when they have any. */
      acted: v.number(),
    }),
  ),
  handler: async (ctx, args) => {
    const me = await requirePermission(ctx, "users:read");
    const user = await ctx.db.get("users", args.userId);
    if (!user) return null;

    // Bounded reads: a console page, not a report.
    const votes = await ctx.db
      .query("votes")
      .withIndex("by_user", (q) => q.eq("userId", user._id))
      .take(500);
    const comments = await ctx.db
      .query("comments")
      .withIndex("by_user", (q) => q.eq("userId", user._id))
      .take(500);
    const caller = await ctx.db
      .query("callerStats")
      .withIndex("by_user", (q) => q.eq("userId", user._id))
      .unique();
    const tg = await ctx.db
      .query("telegramAccounts")
      .withIndex("by_user", (q) => q.eq("userId", user._id))
      .unique();
    const acted = await ctx.db
      .query("auditLog")
      .withIndex("by_actor", (q) => q.eq("actorId", user._id))
      .take(200);

    return {
      user: {
        _id: user._id,
        displayName: user.displayName,
        email: user.email,
        avatarUrl: user.avatarUrl ?? null,
        role: user.role,
        isBanned: user.isBanned,
        countryCode: user.countryCode ?? null,
        walletBalanceCents: user.walletBalanceCents,
        quillBalance: user.quillBalance,
        topicsBacked: user.topicsBacked,
        joinedAt: user._creationTime,
        actionable: actionableBy(me, user),
      },
      votes: votes.length,
      love: votes.filter((r) => r.choice === "love").length,
      paid: votes.filter((r) => r.voteType === "paid").length,
      comments: comments.length,
      calls: {
        graded: caller?.graded ?? 0,
        right: caller?.right ?? 0,
        streak: caller?.streak ?? 0,
      },
      telegram: tg ? (tg.username ?? tg.telegramUserId) : null,
      acted: acted.length,
    };
  },
});

/** The two guards a capability check cannot make on its own. */
async function target(
  ctx: Parameters<typeof requirePermission>[0],
  me: Doc<"users">,
  userId: Id<"users">,
): Promise<Doc<"users">> {
  const them = await ctx.db.get("users", userId);
  if (!them) throw new Error("No such account.");
  if (me._id === them._id) throw new Error("You cannot do that to your own account.");
  if (ROLE_RANK[me.role as Role] <= ROLE_RANK[them.role as Role]) {
    throw new Error("That account ranks at or above yours.");
  }
  return them;
}

export const setBanned = mutation({
  args: { userId: v.id("users"), banned: v.boolean(), reason: v.optional(v.string()) },
  returns: v.null(),
  handler: async (ctx, args) => {
    const me = await requirePermission(ctx, "users:ban");
    const them = await target(ctx, me, args.userId);
    if (them.isBanned === args.banned) return null;

    await ctx.db.patch("users", them._id, { isBanned: args.banned });
    /* Rule 8, in the same mutation. A suspension that leaves no trace is worse
       than one that cannot happen — it is the act most worth being able to ask
       "who did this, and why" about. */
    await audit(ctx, me._id, args.banned ? "user.banned" : "user.reinstated", "users", them._id, {
      email: them.email,
      reason: args.reason,
    });
    return null;
  },
});

export const setRole = mutation({
  args: { userId: v.id("users"), role: v.string() },
  returns: v.null(),
  handler: async (ctx, args) => {
    const me = await requirePermission(ctx, "users:set_role");
    if (!(ROLES as readonly string[]).includes(args.role)) {
      throw new Error("No such role.");
    }
    const them = await target(ctx, me, args.userId);
    if (them.role === args.role) return null;

    /* Never hand out more than you hold. Without this an admin could mint a
       peer, which is a different decision from promoting somebody and should
       not be reachable by the same button. */
    if (ROLE_RANK[args.role as Role] >= ROLE_RANK[me.role as Role]) {
      throw new Error("You cannot grant a role at or above your own.");
    }

    await ctx.db.patch("users", them._id, { role: args.role as Role });
    await audit(ctx, me._id, "user.role_set", "users", them._id, {
      email: them.email,
      was: them.role,
      now: args.role,
    });
    return null;
  },
});
