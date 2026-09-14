import { v } from "convex/values";

import { query } from "./_generated/server";
import type { Id } from "./_generated/dataModel";
import { requirePermission } from "./admin";

/**
 * The record: every privileged write, newest first.
 *
 * Rule 8 makes this table append-only and makes every privileged mutation write
 * into it in the same transaction as the thing it describes. That guarantee is
 * worth nothing if nobody can read it, so the console's claim — *every action
 * here is recorded* — is a screen rather than a promise.
 *
 * **Admin only.** `audit:read` is the one capability no moderator inherits: the
 * record is what a moderator is accountable to, and an account that can read it
 * is an account that knows exactly what its own trail looks like.
 *
 * Bounded like everything else in this console. Rows come from the creation
 * index in descending order, so this is a page off the end of the table rather
 * than a scan of it, and the actor lookup is one read per distinct actor.
 */
export const recent = query({
  args: { limit: v.optional(v.number()) },
  returns: v.array(
    v.object({
      _id: v.id("auditLog"),
      at: v.number(),
      action: v.string(),
      targetType: v.string(),
      targetId: v.union(v.null(), v.string()),
      /** Who did it. The name as it stands now, not as it was then. */
      actor: v.string(),
      actorRole: v.string(),
      /**
       * What it was done to, in words. A topic id is a fact; the question it
       * asks is what somebody scanning the record is actually looking for.
       */
      target: v.union(v.null(), v.object({ label: v.string(), slug: v.string() })),
      metadata: v.optional(v.any()),
    }),
  ),
  handler: async (ctx, args) => {
    await requirePermission(ctx, "audit:read");

    const rows = await ctx.db
      .query("auditLog")
      .order("desc")
      .take(Math.min(args.limit ?? 60, 200));

    const actors = new Map<string, { name: string; role: string }>();
    for (const row of rows) {
      if (actors.has(row.actorId)) continue;
      const user = await ctx.db.get("users", row.actorId);
      actors.set(row.actorId, {
        // An account can be deleted; the row it wrote cannot. Say so plainly
        // rather than rendering an empty name where a person should be.
        name: user?.displayName ?? "a deleted account",
        role: user?.role ?? "user",
      });
    }

    /* One read per distinct topic touched, not one per line: a batch decision
       on a wave of fifteen writes fifteen lines about fifteen topics, and a
       moderator archiving the same topic twice writes two about one. */
    const targets = new Map<string, { label: string; slug: string } | null>();
    for (const row of rows) {
      if (row.targetType !== "topic" && row.targetType !== "topics") continue;
      if (!row.targetId || targets.has(row.targetId)) continue;
      const topic = await ctx.db.get("topics", row.targetId as Id<"topics">);
      targets.set(
        row.targetId,
        topic ? { label: topic.question, slug: topic.slug } : null,
      );
    }

    return rows.map((row) => {
      const actor = actors.get(row.actorId)!;
      return {
        target: row.targetId ? (targets.get(row.targetId) ?? null) : null,
        _id: row._id,
        at: row._creationTime,
        action: row.action,
        targetType: row.targetType,
        targetId: row.targetId ?? null,
        actor: actor.name,
        actorRole: actor.role,
        metadata: row.metadata,
      };
    });
  },
});
