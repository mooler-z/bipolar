import { v } from "convex/values";

import { internal } from "./_generated/api";
import { action, internalAction, internalQuery } from "./_generated/server";
import { sessionDue } from "./lib/tunables";
import {
  outcome,
  runSession,
  windowOfQueries,
  type Outcome,
  type Settings,
} from "./ingestSession";
import { requireUser } from "./users";

/**
 * The two ways a crawling session starts: the clock, and an administrator who
 * wants topics now. The session itself is in `ingestSession.ts`.
 *
 * **The cadence is a setting, not a schedule.** A cron interval is fixed when
 * the code is deployed, so the cron ticks hourly and this decides whether a
 * session is actually due from `discovery.runsPerDay` — which means changing
 * how often the feed refills is a number on a page rather than a deploy.
 */

/** The settings a session spends, resolved from the table. */
async function settingsFor(
  ctx: Parameters<typeof runSession>[0],
  want?: number,
  queries?: number,
): Promise<{ settings: Settings; runsPerDay: number; queries: number }> {
  const cfg: Record<string, number> = await ctx.runQuery(
    internal.tunables.resolved,
    {},
  );
  return {
    runsPerDay: cfg["discovery.runsPerDay"]!,
    queries: queries ?? cfg["discovery.queriesPerRun"]!,
    settings: {
      want: Math.min(want ?? cfg["discovery.topicsPerRun"]!, 40),
      queries: queries ?? cfg["discovery.queriesPerRun"]!,
      resultsPerQuery: cfg["discovery.resultsPerQuery"]!,
      minPolarizing: cfg["discovery.minPolarizing"]!,
      // Stored as a percentage, because a settings page with 0.6 in a box is a
      // settings page somebody types 60 into.
      sameness: cfg["discovery.sameness"]! / 100,
    },
  };
}

export const discover = internalAction({
  args: {
    queryOverride: v.optional(v.string()),
    want: v.optional(v.number()),
    queries: v.optional(v.number()),
    /** Run whether or not the clock says it is due. */
    force: v.optional(v.boolean()),
    /** A run the console already opened. Implies `force`: being pressed is the reason. */
    runId: v.optional(v.id("ingestRuns")),
  },
  returns: outcome,
  handler: async (ctx, args): Promise<Outcome> => {
    const { settings, runsPerDay, queries } = await settingsFor(
      ctx,
      args.want,
      args.queries,
    );

    const last: number | null = await ctx.runQuery(
      internal.ingestRuns.lastStartedAt,
      {},
    );
    if (!args.force && !args.runId && !sessionDue(last, runsPerDay, Date.now())) {
      return {
        query: "not due yet",
        found: 0,
        minted: 0,
        rejected: 0,
        duplicate: 0,
        skipped: true,
      };
    }

    return await runSession(
      ctx,
      args.queryOverride ? [args.queryOverride] : windowOfQueries(queries),
      settings,
      args.runId,
    );
  },
});

/**
 * The same pipeline, on demand, for an administrator who wants topics now —
 * seeding a fresh deployment, or filling a category before a demo. It never
 * asks whether a session is due: being asked for is the reason.
 */
export const runNow = action({
  args: { query: v.optional(v.string()), want: v.optional(v.number()) },
  returns: outcome,
  handler: async (ctx, args): Promise<Outcome> => {
    const role: string | null = await ctx.runQuery(internal.ingest.callerRole, {});
    if (role !== "admin") throw new Error("Administrators only.");

    const { settings, queries } = await settingsFor(ctx, args.want);
    return await runSession(
      ctx,
      args.query ? [args.query] : windowOfQueries(queries),
      settings,
    );
  },
});

/** Who is asking. Its own function because an action cannot read the database. */
export const callerRole = internalQuery({
  args: {},
  returns: v.union(v.null(), v.string()),
  handler: async (ctx) => {
    try {
      return (await requireUser(ctx)).role;
    } catch {
      return null;
    }
  },
});
