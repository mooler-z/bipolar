import { v } from "convex/values";

import { DISCOVERY, DISCOVERY_QUERIES, keys } from "./config";
import { internal } from "./_generated/api";
import type { ActionCtx } from "./_generated/server";
import type { Id } from "./_generated/dataModel";
import type { Infer } from "convex/values";
import { alreadyAsked, keyOf } from "./lib/dedupe";
import * as firecrawl from "./lib/firecrawl";
import * as openai from "./lib/openai";

/**
 * One crawling session, end to end.
 *
 * Split from `ingest.ts` so that file can stay the two ways in — the cron and
 * the admin button — while this stays the loop they both run. Everything it is
 * allowed to spend arrives as `Settings`, resolved from the settings table by
 * the caller, because an action cannot read the database and because the
 * numbers are an operator's to change.
 */

/** What a session did, so an operator reading logs sees it in one line. */
export const outcome = v.object({
  query: v.string(),
  found: v.number(),
  minted: v.number(),
  rejected: v.number(),
  /** Dropped because the feed already carries that argument. */
  duplicate: v.number(),
  skipped: v.boolean(),
});

export type Outcome = Infer<typeof outcome>;

/** What one session is allowed to spend, and what it will accept. */
export type Settings = {
  want: number;
  queries: number;
  resultsPerQuery: number;
  minPolarizing: number;
  /** 0-1. Word overlap above which two questions are the same question. */
  sameness: number;
};

/**
 * Which searches this session runs.
 *
 * A rotating window over the list in `config.ts`, moved by the clock, so
 * consecutive sessions sweep different ground instead of re-reading the same
 * front page four hours later.
 */
export function windowOfQueries(count: number): string[] {
  const many = Math.min(count, DISCOVERY_QUERIES.length);
  const start = Math.floor(Date.now() / 3_600_000) % DISCOVERY_QUERIES.length;
  return Array.from(
    { length: many },
    (_, i) => DISCOVERY_QUERIES[(start + i) % DISCOVERY_QUERIES.length]!,
  );
}

export async function runSession(
  ctx: ActionCtx,
  queries: string[],
  settings: Settings,
  /** A run already opened by the button, so the console can watch from the start. */
  opened?: Id<"ingestRuns">,
): Promise<Outcome> {
  const want = settings.want;
  const label =
    queries.length > 1 ? `${queries[0]} +${queries.length - 1} more` : queries[0]!;
  const started = Date.now();

  const runId: Id<"ingestRuns"> =
    opened ?? (await ctx.runMutation(internal.ingestRuns.startRun, { query: label }));

  /* The story, one line at a time, and the totals as they move. Both are what
     makes a session something the console can watch rather than read about
     afterwards. Neither is allowed to take the session down: a line that
     fails to write is a line lost, not a run lost. */
  const say = async (
    kind: "search" | "read" | "draft" | "minted" | "duplicate" | "rejected" | "failed" | "picture" | "done" | "error",
    text: string,
    topicId?: Id<"topics">,
  ) => {
    try {
      await ctx.runMutation(internal.ingestRuns.note, { runId, kind, text, topicId });
    } catch {
      /* see above */
    }
  };

  // No keys, no run. A deployment without them still serves every topic it
  // already has; it simply stops learning about new arguments.
  if (!keys.firecrawl() || !keys.openai()) {
    await say("error", "Skipped: no Firecrawl or OpenAI key on this deployment.");
    await ctx.runMutation(internal.ingestRuns.finishRun, {
      runId, found: 0, minted: 0, rejected: 0, duplicate: 0,
      error: "No API keys", finishedAt: Date.now(),
    });
    return { query: label, found: 0, minted: 0, rejected: 0, duplicate: 0, skipped: true };
  }

  /* Everything the feed already asks, canonicalised, read once. Anything minted
     below is pushed onto it, so two findings about one story inside a single
     session cannot both get through. */
  const known: string[] = await ctx.runQuery(internal.ingestStore.recentKeys, {
    limit: DISCOVERY.memory,
  });

  let found = 0;
  let minted = 0;
  let rejected = 0;
  let duplicate = 0;
  let error: string | undefined;
  /** Out of clock. Keep what we have rather than be killed mid-write. */
  const spent = () => Date.now() - started > DISCOVERY.budgetMs;
  const tick = async (query?: string) => {
    try {
      await ctx.runMutation(internal.ingestRuns.progress, {
        runId, query, found, minted, rejected, duplicate,
      });
    } catch {
      /* a lost tick is not a lost run */
    }
  };

  try {
    await tick(opened ? label : undefined);

    for (const queryText of queries) {
      if (minted >= want || spent()) break;

      await say("search", `Searching: "${queryText}"`);
      const findings = await firecrawl.search(queryText, settings.resultsPerQuery);
      found += findings.length;

      const fresh: string[] = await ctx.runQuery(internal.ingestStore.unseen, {
        urls: findings.map((f) => f.url),
      });
      const freshSet = new Set(fresh);
      await say(
        "search",
        `${findings.length} results, ${fresh.length} not seen before.`,
      );
      await tick();

      for (const finding of findings) {
        if (minted >= want || spent()) break;
        if (!freshSet.has(finding.url)) continue;

        // A headline and a sentence is usually enough to write a question from.
        // When it is not, read the page — one extra call, only when it pays.
        let material = `${finding.title}\n${finding.snippet ?? ""}`.trim();
        if (material.length < 120) {
          await say("read", `Reading the page: ${finding.title}`);
          const page = await firecrawl.read(finding.url);
          if (page) material = `${finding.title}\n${page}`;
        }

        await say("draft", `Asking the model about: ${finding.title}`);
        const draft = await openai.draftTopic(material);
        if (!draft) {
          await say("failed", `Nothing usable came back for: ${finding.title}`);
          await ctx.runMutation(internal.ingestStore.markSeen, {
            url: finding.url,
            outcome: "failed",
          });
          continue;
        }

        // The model's own read on whether a room would actually split. A story
        // everybody agrees about is news, not a topic.
        if (draft.polarizing < settings.minPolarizing) {
          rejected += 1;
          await say("rejected", `Too dull (${draft.polarizing}/100): ${draft.question}`);
          await ctx.runMutation(internal.ingestStore.markSeen, {
            url: finding.url,
            outcome: "rejected",
            score: draft.polarizing,
          });
          await tick();
          continue;
        }

        const key = keyOf(draft.question);
        if (alreadyAsked(key, known, settings.sameness)) {
          duplicate += 1;
          await say("duplicate", `Already asked: ${draft.question}`);
          await ctx.runMutation(internal.ingestStore.markSeen, {
            url: finding.url,
            outcome: "duplicate",
            score: draft.polarizing,
          });
          await tick();
          continue;
        }

        const topicId: Id<"topics"> | null = await ctx.runMutation(
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
            wikipediaTitle: draft.wikipediaTitle ?? undefined,
            runId,
          },
        );

        // The mint refuses a question already asked, which is the same check
        // one transaction later. Losing that race is a duplicate, not a fault.
        if (!topicId) {
          duplicate += 1;
          await say("duplicate", `Already asked (minted meanwhile): ${draft.question}`);
          await ctx.runMutation(internal.ingestStore.markSeen, {
            url: finding.url,
            outcome: "duplicate",
            score: draft.polarizing,
          });
          await tick();
          continue;
        }

        known.unshift(key);
        minted += 1;
        await say(
          "minted",
          `Minted (${draft.polarizing}/100): ${draft.question}${draft.wikipediaTitle ? ` · picture from "${draft.wikipediaTitle}"` : ""}`,
          topicId,
        );
        await ctx.runMutation(internal.ingestStore.markSeen, {
          url: finding.url,
          outcome: "minted",
          score: draft.polarizing,
          topicId,
        });
        await tick();
      }
    }

    /* The picture, in the same session that wrote the question.
       The model named an article while it had the story in front of it; this
       turns those names into images. Minting without it leaves a wave of new
       questions sitting pictureless in a feed built on faces until somebody
       remembers to run a backfill by hand. */
    if (minted > 0) {
      await say("picture", `Fetching pictures for ${minted} new ${minted === 1 ? "question" : "questions"}…`);
      const got = await ctx.runAction(internal.images.resolve, { limit: minted + 10 });
      await say(
        "picture",
        `${got.withImage} ${got.withImage === 1 ? "picture" : "pictures"} found, ${got.withoutImage} ${got.withoutImage === 1 ? "article" : "articles"} had none.`,
      );
    }

    const secs = Math.round((Date.now() - started) / 1000);
    await say(
      "done",
      `Done in ${Math.floor(secs / 60)}m ${secs % 60}s: ${minted} minted, ${duplicate} already asked, ${rejected} too dull, ${found} results looked at.`,
    );
  } catch (e) {
    error = e instanceof Error ? e.message : String(e);
    await say("error", `Stopped: ${error}`);
  }

  await ctx.runMutation(internal.ingestRuns.finishRun, {
    runId,
    found,
    minted,
    rejected,
    duplicate,
    error,
    finishedAt: Date.now(),
  });

  return { query: label, found, minted, rejected, duplicate, skipped: false };
}

