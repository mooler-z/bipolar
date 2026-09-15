/// <reference types="vite/client" />
import { convexTest } from "convex-test";
import { describe, expect, test } from "vitest";

import { internal } from "./_generated/api";
import type { Id } from "./_generated/dataModel";
import { keyOf } from "./lib/dedupe";
import schema from "./schema";

/**
 * The unattended half: topics arriving on their own, and mail going out on its
 * own. Both run with nobody watching, so both are only as good as what stops
 * them repeating themselves — the same story minted twice, the same person
 * mailed twice — and that is what this file holds to.
 */

const modules = import.meta.glob("./**/*.ts");

const draft = {
  question: "Pineapple on pizza?",
  description: "A restaurant chain put it back on the menu this week.",
  category: "food",
  tags: ["pizza", "food"],
  polarizing: 88,
  sensitive: false,
  sourceUrl: "https://example.test/pineapple",
  sourceTitle: "Chain brings back the pineapple pizza",
  sourceSnippet: "Customers are not taking it quietly.",
};

describe("discovery never mints the same story twice", () => {
  test("a URL already considered is not offered again", async () => {
    const t = convexTest(schema, modules);

    expect(
      await t.query(internal.ingestStore.unseen, {
        urls: ["https://a.test/1", "https://a.test/2"],
      }),
    ).toEqual(["https://a.test/1", "https://a.test/2"]);

    await t.mutation(internal.ingestStore.markSeen, {
      url: "https://a.test/1",
      outcome: "minted",
      score: 90,
    });

    expect(
      await t.query(internal.ingestStore.unseen, {
        urls: ["https://a.test/1", "https://a.test/2"],
      }),
    ).toEqual(["https://a.test/2"]);
  });

  test("a story rejected for being uncontroversial is remembered too", async () => {
    const t = convexTest(schema, modules);
    await t.mutation(internal.ingestStore.markSeen, {
      url: "https://a.test/dull",
      outcome: "rejected",
      score: 12,
    });
    // Otherwise the next run pays the model to reject it all over again.
    expect(
      await t.query(internal.ingestStore.unseen, {
        urls: ["https://a.test/dull"],
      }),
    ).toEqual([]);
  });
});

describe("minting a topic writes all of it", () => {
  test("the topic, its counters, its source and its audit row", async () => {
    const t = convexTest(schema, modules);
    const topicId = (await t.mutation(
      internal.ingestStore.mint,
      draft,
    )) as Id<"topics">;

    const state = await t.run(async (ctx) => ({
      topic: await ctx.db.get("topics", topicId),
      stats: await ctx.db.query("topicStats").collect(),
      sources: await ctx.db.query("topicSources").collect(),
      audit: await ctx.db.query("auditLog").collect(),
      tags: await ctx.db.query("tags").collect(),
      category: await ctx.db.query("categories").collect(),
    }));

    expect(state.topic?.slug).toBe("pineapple-on-pizza");
    expect(state.topic?.status).toBe("active");
    expect(state.topic?.sourceUrl).toBe(draft.sourceUrl);
    // A topic without its counters would send its first vote down a path that
    // has to invent them.
    expect(state.stats[0]).toMatchObject({
      freeLove: 0,
      freeHate: 0,
      paidLove: 0,
      paidHate: 0,
      stakedCents: 0,
      comments: 0,
    });
    expect(state.sources[0].url).toBe(draft.sourceUrl);
    expect(state.category[0].slug).toBe("food");
    expect(state.tags.map((x) => x.slug).sort()).toEqual(["food", "pizza"]);
    // Rule 8: the privileged write and the record of it, same transaction.
    expect(state.audit[0]).toMatchObject({
      action: "topic.minted",
      targetType: "topics",
      targetId: topicId,
    });
  });

  test("a question already asked is refused, however it is worded", async () => {
    const t = convexTest(schema, modules);
    expect(await t.mutation(internal.ingestStore.mint, draft)).not.toBeNull();

    /* This used to mint a second topic and give it four characters of entropy
       on the end of its slug, which is how one story written up by twenty
       outlets became twenty questions. The mint refuses instead, inside the
       transaction, so two sessions racing cannot both get through. */
    expect(
      await t.mutation(internal.ingestStore.mint, {
        ...draft,
        sourceUrl: "https://example.test/pineapple-again",
      }),
    ).toBeNull();

    // Reworded, reordered, repunctuated — still the same argument.
    expect(
      await t.mutation(internal.ingestStore.mint, {
        ...draft,
        question: "Is pineapple on a pizza?",
        sourceUrl: "https://example.test/pineapple-third",
      }),
    ).toBeNull();

    const topics = await t.run(async (ctx) => await ctx.db.query("topics").collect());
    expect(topics).toHaveLength(1);
    expect(topics[0]!.slug).toBe("pineapple-on-pizza");
  });

  test("a genuinely different question still gets through", async () => {
    const t = convexTest(schema, modules);
    await t.mutation(internal.ingestStore.mint, draft);
    expect(
      await t.mutation(internal.ingestStore.mint, {
        ...draft,
        question: "Anchovies on pizza?",
        sourceUrl: "https://example.test/anchovies",
      }),
    ).not.toBeNull();

    const topics = await t.run(async (ctx) => await ctx.db.query("topics").collect());
    expect(topics).toHaveLength(2);
  });

  test("discovery posts under one account, not a new one each time", async () => {
    const t = convexTest(schema, modules);
    await t.mutation(internal.ingestStore.mint, draft);
    await t.mutation(internal.ingestStore.mint, {
      ...draft,
      question: "Anchovies on pizza?",
    });

    const authors = await t.run(async (ctx) =>
      (await ctx.db.query("users").collect()).map((u) => u.authId),
    );
    expect(authors).toEqual(["system:discovery"]);
  });
});

describe("nobody is mailed the same thing twice", () => {
  test("a second claim under the same key is refused", async () => {
    const t = convexTest(schema, modules);
    const userId = await t.run(async (ctx) =>
      await ctx.db.insert("users", {
        authId: "auth|1",
        email: "reader@example.test",
        displayName: "Reader",
        walletBalanceCents: 0,
        quillBalance: 0,
        role: "user",
        isBanned: false,
        profilePublic: false,
        topicsBacked: 0,
        digestOptIn: true,
      }),
    );

    const args = {
      userId,
      kind: "digest" as const,
      dedupeKey: `digest:${userId}:2026-09-13`,
      to: "reader@example.test",
      subject: "Today on bipolar",
    };

    expect(await t.mutation(internal.notify.claim, args)).not.toBeNull();
    // The cron firing twice on one day, or an action retried: same key, and
    // the second attempt sends nothing.
    expect(await t.mutation(internal.notify.claim, args)).toBeNull();

    const rows = await t.run(async (ctx) =>
      await ctx.db.query("mailLog").collect(),
    );
    expect(rows).toHaveLength(1);
  });

  test("a different day is a different notice", async () => {
    const t = convexTest(schema, modules);
    const userId = await t.run(async (ctx) =>
      await ctx.db.insert("users", {
        authId: "auth|2",
        email: "reader2@example.test",
        displayName: "Reader",
        walletBalanceCents: 0,
        quillBalance: 0,
        role: "user",
        isBanned: false,
        profilePublic: false,
        topicsBacked: 0,
        digestOptIn: true,
      }),
    );
    const base = {
      userId,
      kind: "digest" as const,
      to: "reader2@example.test",
      subject: "Today on bipolar",
    };

    expect(
      await t.mutation(internal.notify.claim, {
        ...base,
        dedupeKey: `digest:${userId}:2026-09-13`,
      }),
    ).not.toBeNull();
    expect(
      await t.mutation(internal.notify.claim, {
        ...base,
        dedupeKey: `digest:${userId}:2026-09-14`,
      }),
    ).not.toBeNull();
  });
});

describe("a crawling session is a thing with a number on it", () => {
  test("sessions count up, and what they mint carries the number", async () => {
    const t = convexTest(schema, modules);

    const first = await t.mutation(internal.ingestRuns.startRun, {
      query: "first sweep",
    });
    const second = await t.mutation(internal.ingestRuns.startRun, {
      query: "second sweep",
    });

    const seqs = await t.run(async (ctx) => ({
      first: (await ctx.db.get("ingestRuns", first))?.seq,
      second: (await ctx.db.get("ingestRuns", second))?.seq,
    }));
    // A document id is unique and unsayable. "Everything from 2" is a sentence.
    expect(seqs.first).toBe(1);
    expect(seqs.second).toBe(2);

    const topicId = await t.mutation(internal.ingestStore.mint, {
      ...draft,
      runId: second,
    });
    const topic = await t.run(async (ctx) => ctx.db.get("topics", topicId!));
    expect(topic?.ingestRunId).toBe(second);
  });

  test("the questions already asked are offered to the next session", async () => {
    const t = convexTest(schema, modules);
    await t.mutation(internal.ingestStore.mint, draft);

    // Including rows written before the key existed: the key is computed for
    // them on the way out, so a seeded topic still blocks its own duplicate.
    await t.run(async (ctx) => {
      const author = (await ctx.db.query("users").first())!;
      await ctx.db.insert("topics", {
        slug: "older-row",
        question: "Nuclear power in Germany?",
        categoryId: (await ctx.db.query("categories").first())!._id,
        status: "active",
        isSensitive: false,
        isLocked: false,
        isFeatured: false,
        createdBy: author._id,
      });
    });

    const known = await t.query(internal.ingestStore.recentKeys, {});
    expect(known).toContain(keyOf("Pineapple on pizza?"));
    expect(known).toContain(keyOf("Nuclear power in Germany?"));
  });
});
