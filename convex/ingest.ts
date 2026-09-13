import { v } from "convex/values";

import {
  DISCOVERY_QUERIES,
  MIN_POLARIZING_SCORE,
  TOPICS_PER_RUN,
  keys,
} from "./config";
import { internal } from "./_generated/api";
import {
  action,
  internalAction,
  internalQuery,
  type ActionCtx,
} from "./_generated/server";
import type { Id } from "./_generated/dataModel";
import type { Infer } from "convex/values";
import * as firecrawl from "./lib/firecrawl";
import * as openai from "./lib/openai";
import { requireUser } from "./users";

/**
 * Where topics come from.
 *
 * Nobody writes them. Every few hours this runs: Firecrawl goes and finds what
 * the web is arguing about this week, OpenAI turns one of those stories into a
 * question a stranger can answer with LOVE or HATE, and the pair that survive
 * the filters become rows people can vote on. Remove Firecrawl and the feed
 * stops refilling; remove OpenAI and what is left is headlines, which nobody
 * can vote on.
 *
 * The loop is deliberately conservative. Every URL is remembered whether or not
 * it became a topic, so the same story cannot be minted twice; every draft the
 * model scores as something people actually agree about is dropped; and one bad
 * run costs at most `TOPICS_PER_RUN` model calls.
 */

/** What a run did, so an operator reading logs sees it in one line. */
const outcome = v.object({
  query: v.string(),
  found: v.number(),
  minted: v.number(),
  rejected: v.number(),
  skipped: v.boolean(),
});

type Outcome = Infer<typeof outcome>;

async function runDiscovery(
  ctx: ActionCtx,
  queryText: string,
  want = TOPICS_PER_RUN,
): Promise<Outcome> {
  const empty = {
    query: queryText,
    found: 0,
    minted: 0,
    rejected: 0,
    skipped: true,
  };
  // No keys, no run. A deployment without them still serves every topic it
  // already has; it simply stops learning about new arguments.
  if (!keys.firecrawl() || !keys.openai()) return empty;

  const runId: Id<"ingestRuns"> = await ctx.runMutation(
    internal.ingestStore.startRun,
    { query: queryText },
  );

  let found = 0;
  let minted = 0;
  let rejected = 0;
  let error: string | undefined;

  try {
    const findings = await firecrawl.search(queryText, Math.max(8, want * 3));
    found = findings.length;

    const fresh: string[] = await ctx.runQuery(internal.ingestStore.unseen, {
      urls: findings.map((f) => f.url),
    });
    const freshSet = new Set(fresh);

    for (const finding of findings) {
      if (minted >= want) break;
      if (!freshSet.has(finding.url)) continue;

      // A headline and a sentence is usually enough to write a question from.
      // When it is not, read the page — one extra call, only when it pays.
      let material = `${finding.title}\n${finding.snippet ?? ""}`.trim();
      if (material.length < 120) {
        const page = await firecrawl.read(finding.url);
        if (page) material = `${finding.title}\n${page}`;
      }

      const draft = await openai.draftTopic(material);
      if (!draft) {
        await ctx.runMutation(internal.ingestStore.markSeen, {
          url: finding.url,
          outcome: "failed",
        });
        continue;
      }

      // The model's own read on whether a room would actually split. A story
      // everybody agrees about is news, not a topic.
      if (draft.polarizing < MIN_POLARIZING_SCORE) {
        rejected += 1;
        await ctx.runMutation(internal.ingestStore.markSeen, {
          url: finding.url,
          outcome: "rejected",
          score: draft.polarizing,
        });
        continue;
      }

      const topicId: Id<"topics"> = await ctx.runMutation(
        internal.ingestStore.mint,
        {
          question: draft.question,
          description: draft.description,
          category: draft.category,
          tags: draft.tags,
          polarizing: draft.polarizing,
          sensitive: draft.sensitive,
          sourceUrl: finding.url,
          sourceTitle: finding.title,
          sourceSnippet: finding.snippet,
          scopeCountry: draft.country ?? undefined,
        },
      );
      minted += 1;
      await ctx.runMutation(internal.ingestStore.markSeen, {
        url: finding.url,
        outcome: "minted",
        score: draft.polarizing,
        topicId,
      });
    }
  } catch (e) {
    error = e instanceof Error ? e.message : String(e);
  }

  await ctx.runMutation(internal.ingestStore.finishRun, {
    runId,
    found,
    minted,
    rejected,
    error,
    finishedAt: Date.now(),
  });

  return { query: queryText, found, minted, rejected, skipped: false };
}

/**
 * The scheduled run. One query per firing, rotating through the list in
 * `config.ts` by the clock, so a day's runs sweep different ground instead of
 * re-reading the same front page.
 */
export const discover = internalAction({
  args: {
    queryOverride: v.optional(v.string()),
    want: v.optional(v.number()),
  },
  returns: outcome,
  handler: async (ctx, args) => {
    const slot = Math.floor(Date.now() / 3_600_000) % DISCOVERY_QUERIES.length;
    return await runDiscovery(
      ctx,
      args.queryOverride ?? DISCOVERY_QUERIES[slot],
      Math.min(args.want ?? TOPICS_PER_RUN, 12),
    );
  },
});

/**
 * The same pipeline, on demand, for an administrator who wants topics now —
 * seeding a fresh deployment, or filling a category before a demo.
 */
export const runNow = action({
  args: { query: v.optional(v.string()) },
  returns: outcome,
  handler: async (ctx, args): Promise<Outcome> => {
    const role: string | null = await ctx.runQuery(
      internal.ingest.callerRole,
      {},
    );
    if (role !== "admin") throw new Error("Administrators only.");
    return await runDiscovery(ctx, args.query ?? DISCOVERY_QUERIES[0]);
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
