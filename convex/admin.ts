import { v } from "convex/values";

import { internalMutation, query } from "./_generated/server";
import type { MutationCtx, QueryCtx } from "./_generated/server";
import type { Doc, Id } from "./_generated/dataModel";
import {
  ROLES,
  hasPermission,
  isStaff,
  permissionsFor,
  type Permission,
} from "./lib/rbac";
import { currentUser } from "./users";

/**
 * The staff console's backend.
 *
 * Two rules hold everywhere in this file:
 *
 * 1. **Every guard checks a capability, never a role name.** `requirePermission`
 *    is the only way in, so adding a tier can never silently lose it access it
 *    should have inherited.
 * 2. **The gate is on the server, not the screen.** The client hides what a role
 *    cannot reach because showing dead links is bad manners — but hiding is not
 *    a control, and each function re-checks for itself.
 */

/** Anyone above a plain reader. Opens the shell; opens no page. */
export async function requireStaff(ctx: QueryCtx): Promise<Doc<"users">> {
  const me = await currentUser(ctx);
  if (!me) throw new Error("Sign in to do that.");
  if (me.isBanned) throw new Error("This account is suspended.");
  if (!isStaff(me.role)) throw new Error("Staff only.");
  return me;
}

/** The page gate. The only sanctioned way to enter a privileged handler. */
export async function requirePermission(
  ctx: QueryCtx,
  permission: Permission,
): Promise<Doc<"users">> {
  const me = await requireStaff(ctx);
  if (!hasPermission(me.role, permission)) {
    throw new Error(`Your role cannot ${permission.replace(":", " ")}.`);
  }
  return me;
}

/**
 * Record a privileged write.
 *
 * Rule 8: this runs **inside the same mutation** as the thing it describes, so
 * there is no code path that changes something privileged without leaving a
 * row. Append-only — nothing in this codebase updates or deletes one.
 */
export async function audit(
  ctx: MutationCtx,
  actorId: Id<"users">,
  action: string,
  targetType: string,
  targetId?: string,
  metadata?: unknown,
): Promise<void> {
  await ctx.db.insert("auditLog", {
    actorId,
    action,
    targetType,
    targetId,
    metadata,
  });
}

/**
 * Who the console thinks you are.
 *
 * Returns `null` rather than throwing for a signed-out or non-staff reader, so
 * the client can render a door instead of an error — the one place a refusal is
 * a normal answer rather than a fault.
 */
export const me = query({
  args: {},
  returns: v.union(
    v.null(),
    v.object({
      userId: v.id("users"),
      displayName: v.string(),
      email: v.string(),
      role: v.string(),
      permissions: v.array(v.string()),
    }),
  ),
  handler: async (ctx) => {
    const user = await currentUser(ctx);
    if (!user || user.isBanned || !isStaff(user.role)) return null;
    return {
      userId: user._id,
      displayName: user.displayName,
      email: user.email,
      role: user.role,
      permissions: permissionsFor(user.role) as string[],
    };
  },
});

/** How many rows a bounded count will look at before it says "at least". */
const SCAN = 1000;

/**
 * The dashboard payload.
 *
 * Every count here is **bounded**. A console that takes a table scan to render
 * is a console that stops rendering exactly when the numbers get interesting,
 * so each figure is capped and the page says so rather than pretending the cap
 * is the total.
 */
export const dashboard = query({
  args: {},
  returns: v.object({
    topics: v.object({
      active: v.number(),
      draft: v.number(),
      archived: v.number(),
      capped: v.boolean(),
    }),
    votes: v.object({ free: v.number(), paid: v.number() }),
    stakedCents: v.number(),
    comments: v.number(),
    users: v.object({ total: v.number(), last7d: v.number(), banned: v.number() }),
    countries: v.number(),
    featured: v.union(
      v.null(),
      v.object({
        _id: v.id("topics"),
        slug: v.string(),
        question: v.string(),
        categorySlug: v.string(),
        imageUrl: v.union(v.null(), v.string()),
      }),
    ),
    lastIngest: v.union(
      v.null(),
      v.object({
        seq: v.union(v.null(), v.number()),
        query: v.string(),
        found: v.number(),
        minted: v.number(),
        rejected: v.number(),
        duplicate: v.number(),
        error: v.union(v.null(), v.string()),
        finishedAt: v.union(v.null(), v.number()),
      }),
    ),
  }),
  handler: async (ctx) => {
    await requirePermission(ctx, "dashboard:view");

    const topicRows = await ctx.db.query("topics").take(SCAN);
    const topics = { active: 0, draft: 0, archived: 0, capped: topicRows.length >= SCAN };
    for (const t of topicRows) topics[t.status] += 1;

    const stats = await ctx.db.query("topicStats").take(SCAN);
    const votes = { free: 0, paid: 0 };
    let stakedCents = 0;
    let comments = 0;
    for (const s of stats) {
      votes.free += s.freeLove + s.freeHate;
      votes.paid += s.paidLove + s.paidHate;
      stakedCents += s.stakedCents;
      comments += s.comments;
    }

    const since = Date.now() - 7 * 24 * 60 * 60 * 1000;
    const userRows = await ctx.db.query("users").take(SCAN);
    const users = {
      total: userRows.length,
      last7d: userRows.filter((u) => u._creationTime >= since).length,
      banned: userRows.filter((u) => u.isBanned).length,
    };

    const seen = new Set<string>();
    for (const row of await ctx.db.query("countryTopicStats").take(SCAN)) {
      seen.add(row.countryCode);
    }

    const featuredRow = topicRows.find((t) => t.isFeatured && t.status === "active") ?? null;
    const category = featuredRow ? await ctx.db.get(featuredRow.categoryId) : null;

    const run = await ctx.db
      .query("ingestRuns")
      .withIndex("by_finished")
      .order("desc")
      .first();

    return {
      topics,
      votes,
      stakedCents,
      comments,
      users,
      countries: seen.size,
      featured: featuredRow
        ? {
            _id: featuredRow._id,
            slug: featuredRow.slug,
            question: featuredRow.question,
            categorySlug: category?.slug ?? "uncategorised",
            imageUrl: featuredRow.externalImageUrl ?? null,
          }
        : null,
      lastIngest: run
        ? {
            seq: run.seq ?? null,
            query: run.query,
            found: run.found,
            minted: run.minted,
            rejected: run.rejected,
            duplicate: run.duplicate ?? 0,
            error: run.error ?? null,
            finishedAt: run.finishedAt ?? null,
          }
        : null,
    };
  },
});

/**
 * Bootstrap a role from the CLI.
 *
 * **Internal on purpose.** `users:set_role` is an admin capability, which leaves
 * the obvious chicken-and-egg: the first admin cannot be granted by an admin.
 * This is the escape hatch, and it is deliberately only reachable by whoever
 * holds the deployment keys — `npx convex run admin:grantRole`.
 *
 * The audit row names the target as its own actor and the action as a
 * bootstrap, because that is the truth: the change did not come from another
 * account inside the product. Recording it as anything else would be a lie in
 * an append-only log, which is worse than the gap.
 */
export const grantRole = internalMutation({
  args: { email: v.string(), role: v.string() },
  returns: v.object({ email: v.string(), was: v.string(), now: v.string() }),
  handler: async (ctx, args) => {
    const role = args.role as (typeof ROLES)[number];
    if (!ROLES.includes(role)) {
      throw new Error(`Unknown role "${args.role}". One of: ${ROLES.join(", ")}.`);
    }
    const user = await ctx.db
      .query("users")
      .withIndex("by_email", (q) => q.eq("email", args.email))
      .unique();
    if (!user) throw new Error(`No account for ${args.email}.`);

    const was = user.role;
    if (was === role) return { email: user.email, was, now: role };

    await ctx.db.patch(user._id, { role });
    await audit(ctx, user._id, "role.bootstrap", "user", user._id, { was, now: role });
    return { email: user.email, was, now: role };
  },
});
