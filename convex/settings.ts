import { v } from "convex/values";

import { tunedIn } from "./tunables";
import { mutation, query } from "./_generated/server";
import type { MutationCtx, QueryCtx } from "./_generated/server";
import { audit, requirePermission } from "./admin";

/**
 * What discovery does with what it finds.
 *
 * Two modes, and the difference is who decides what the public sees:
 *
 * - **`auto`** — a drafted topic that clears the polarizing floor goes straight
 *   into the feed. The crawler publishes to your site.
 * - **`review`** — everything lands as a draft and waits for a moderator. The
 *   crawler proposes to you.
 *
 * `auto` is the default because it is what this build already did, and changing
 * behaviour silently is worse than leaving a choice unmade. But `review` is the
 * honest setting for anything public: nothing else in the pipeline reads the
 * question before a stranger does.
 */
export type DiscoveryMode = "auto" | "review";

const KEY = "discovery.mode";

export async function discoveryMode(
  ctx: QueryCtx | MutationCtx,
): Promise<DiscoveryMode> {
  const row = await ctx.db
    .query("settings")
    .withIndex("by_key", (q) => q.eq("key", KEY))
    .unique();
  return row?.value === "review" ? "review" : "auto";
}

export const discovery = query({
  args: {},
  returns: v.object({
    mode: v.string(),
    everyHours: v.number(),
    runsPerDay: v.number(),
    topicsPerRun: v.number(),
    pending: v.number(),
  }),
  handler: async (ctx) => {
    await requirePermission(ctx, "topics:update");
    const drafts = await ctx.db
      .query("topics")
      .withIndex("by_status", (q) => q.eq("status", "draft"))
      .take(200);
    const runsPerDay = await tunedIn(ctx, "discovery.runsPerDay");
    return {
      mode: await discoveryMode(ctx),
      // Derived, never typed twice: a cadence and a rate that disagree is how
      // a console ends up lying about the thing it exists to show.
      everyHours: Math.round((24 / runsPerDay) * 10) / 10,
      runsPerDay,
      topicsPerRun: await tunedIn(ctx, "discovery.topicsPerRun"),
      pending: drafts.length,
    };
  },
});

export const setDiscoveryMode = mutation({
  args: { mode: v.union(v.literal("auto"), v.literal("review")) },
  returns: v.object({ mode: v.string() }),
  handler: async (ctx, args) => {
    const user = await requirePermission(ctx, "settings:manage");
    const was = await discoveryMode(ctx);
    if (was === args.mode) return { mode: was };

    const row = await ctx.db
      .query("settings")
      .withIndex("by_key", (q) => q.eq("key", KEY))
      .unique();
    if (row) await ctx.db.patch(row._id, { value: args.mode });
    else await ctx.db.insert("settings", { key: KEY, value: args.mode });

    await audit(ctx, user._id, "settings.discovery", "settings", KEY, {
      was,
      now: args.mode,
    });
    return { mode: args.mode };
  },
});
