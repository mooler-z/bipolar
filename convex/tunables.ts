import { v } from "convex/values";

import {
  TUNABLES,
  clampTo,
  fallbacks,
  tunableOf,
} from "./lib/tunables";
import {
  internalQuery,
  mutation,
  query,
  type MutationCtx,
  type QueryCtx,
} from "./_generated/server";
import { audit, requirePermission } from "./admin";

/**
 * Settings that can be changed without a deploy.
 *
 * Stored in the `settings` table under the tunable's own key, read back through
 * the code value whenever nothing has been stored. Nothing is written until
 * somebody changes something, so a fresh deployment has an empty table and runs
 * exactly as the repository says it should.
 *
 * Every write is an admin write and lands an audit row in the same transaction,
 * naming the setting, what it was and what it became. A console where the
 * crawler's budget can be changed silently is a console where nobody can answer
 * "why did it mint four hundred topics on Tuesday".
 */

/** One setting, resolved. Reads the stored value, falls back to the code one. */
export async function tunedIn(
  ctx: QueryCtx | MutationCtx,
  key: string,
): Promise<number> {
  const tunable = tunableOf(key);
  if (!tunable) throw new Error(`No such setting: ${key}`);

  const row = await ctx.db
    .query("settings")
    .withIndex("by_key", (q) => q.eq("key", key))
    .unique();
  return typeof row?.value === "number"
    ? clampTo(tunable, row.value)
    : tunable.fallback;
}

/** Everything, resolved, in one read. What a crawling session asks for. */
async function tunedAll(
  ctx: QueryCtx | MutationCtx,
): Promise<Record<string, number>> {
  const out = fallbacks();
  for (const row of await ctx.db.query("settings").take(200)) {
    const tunable = tunableOf(row.key);
    if (tunable && typeof row.value === "number") {
      out[row.key] = clampTo(tunable, row.value);
    }
  }
  return out;
}

/** The whole set, for an action that cannot reach the database itself. */
export const resolved = internalQuery({
  args: {},
  returns: v.record(v.string(), v.number()),
  handler: async (ctx) => await tunedAll(ctx),
});

/** The settings page: the catalogue, each with what it is currently set to. */
export const list = query({
  args: {},
  returns: v.array(
    v.object({
      key: v.string(),
      label: v.string(),
      help: v.string(),
      group: v.string(),
      unit: v.union(v.null(), v.string()),
      min: v.number(),
      max: v.number(),
      fallback: v.number(),
      value: v.number(),
      /** Still whatever the repository says. */
      isDefault: v.boolean(),
    }),
  ),
  handler: async (ctx) => {
    await requirePermission(ctx, "settings:manage");
    const values = await tunedAll(ctx);
    const stored = new Set(
      (await ctx.db.query("settings").take(200)).map((r) => r.key),
    );
    return TUNABLES.map((t) => ({
      key: t.key,
      label: t.label,
      help: t.help,
      group: t.group,
      unit: t.unit ?? null,
      min: t.min,
      max: t.max,
      fallback: t.fallback,
      value: values[t.key] ?? t.fallback,
      isDefault: !stored.has(t.key),
    }));
  },
});

export const set = mutation({
  args: { key: v.string(), value: v.number() },
  returns: v.object({ value: v.number() }),
  handler: async (ctx, args) => {
    const user = await requirePermission(ctx, "settings:manage");
    const tunable = tunableOf(args.key);
    // An unknown key would be a silent no-op that the page shows as saved.
    if (!tunable) throw new Error(`No such setting: ${args.key}`);

    const was = await tunedIn(ctx, args.key);
    // Clamped rather than refused: a field that snaps to its bounds is easier
    // to use than one that throws, and the bound is the real rule either way.
    const value = clampTo(tunable, args.value);

    const row = await ctx.db
      .query("settings")
      .withIndex("by_key", (q) => q.eq("key", args.key))
      .unique();
    if (row) await ctx.db.patch(row._id, { value });
    else await ctx.db.insert("settings", { key: args.key, value });

    await audit(ctx, user._id, "settings.change", "settings", args.key, {
      was,
      now: value,
    });
    return { value };
  },
});

/** Back to what the repository says, by forgetting rather than by writing. */
export const reset = mutation({
  args: { key: v.string() },
  returns: v.object({ value: v.number() }),
  handler: async (ctx, args) => {
    const user = await requirePermission(ctx, "settings:manage");
    const tunable = tunableOf(args.key);
    if (!tunable) throw new Error(`No such setting: ${args.key}`);

    const row = await ctx.db
      .query("settings")
      .withIndex("by_key", (q) => q.eq("key", args.key))
      .unique();
    if (!row) return { value: tunable.fallback };

    const was = typeof row.value === "number" ? row.value : tunable.fallback;
    await ctx.db.delete(row._id);
    await audit(ctx, user._id, "settings.reset", "settings", args.key, {
      was,
      now: tunable.fallback,
    });
    return { value: tunable.fallback };
  },
});
