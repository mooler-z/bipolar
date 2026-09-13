/// <reference types="vite/client" />
import { register as registerRateLimiter } from "@convex-dev/rate-limiter/test";
import { convexTest } from "convex-test";
import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";

import { PEEK_CENTS } from "./config";
import { api } from "./_generated/api";
import type { Id } from "./_generated/dataModel";
import schema from "./schema";

/**
 * The stats gate, asserted where it matters: in the payload.
 *
 * A field hidden with CSS has already been delivered. So these tests check for
 * the **absence** of the two-layer aggregate in what the server returns, not
 * for whether a component chose to render it — and they check that the country
 * lean, which is public, does not carry the four counters that would let a
 * reader add the gated number back up.
 */

const modules = import.meta.glob("./**/*.ts");

beforeEach(() => vi.useFakeTimers());
afterEach(() => vi.useRealTimers());

function harness() {
  const t = convexTest(schema, modules);
  registerRateLimiter(t);
  return t;
}

async function seed(t: ReturnType<typeof harness>) {
  return await t.run(async (ctx) => {
    const author = await ctx.db.insert("users", {
      authId: "system:test",
      email: "",
      displayName: "Discovery",
      walletBalanceCents: 0,
      quillBalance: 0,
      role: "creator",
      isBanned: false,
      profilePublic: false,
      topicsBacked: 0,
      digestOptIn: false,
    });
    const categoryId = await ctx.db.insert("categories", {
      slug: "food",
      name: "Food",
    });
    const topicId = await ctx.db.insert("topics", {
      slug: "pineapple",
      question: "Pineapple on pizza?",
      categoryId,
      status: "active",
      isSensitive: false,
      isLocked: false,
      isFeatured: false,
      createdBy: author,
    });
    await ctx.db.insert("topicStats", {
      topicId,
      freeLove: 7,
      freeHate: 3,
      paidLove: 1,
      paidHate: 4,
      stakedCents: 250,
      skips: 0,
      comments: 0,
    });
    await ctx.db.insert("countryTopicStats", {
      topicId,
      countryCode: "ET",
      freeLove: 5,
      freeHate: 1,
      paidLove: 1,
      paidHate: 2,
    });
    return topicId;
  });
}

async function signedIn(t: ReturnType<typeof harness>, subject: string, cents = 500) {
  const as = t.withIdentity({ subject, email: `${subject}@example.test` });
  const userId: Id<"users"> = await as.mutation(api.users.ensure, {});
  await t.finishAllScheduledFunctions(vi.runAllTimers);
  await t.run(async (ctx) => {
    await ctx.db.patch("users", userId, {
      walletBalanceCents: cents,
      countryCode: "ET",
    });
  });
  return { as, userId };
}

describe("a reader who has not paid the price of admission", () => {
  test("gets no aggregate at all, signed out", async () => {
    const t = harness();
    await seed(t);

    const page = await t.query(api.topics.bySlug, { slug: "pineapple" });
    expect(page).not.toBeNull();
    expect(page!.topic.stats).toBeNull();
    expect(page!.viewer.unlocked).toBe(false);
  });

  test("gets no aggregate signed in either", async () => {
    const t = harness();
    await seed(t);
    const { as } = await signedIn(t, "lurker");

    const page = await as.query(api.topics.bySlug, { slug: "pineapple" });
    expect(page!.topic.stats).toBeNull();
  });

  test("gets no aggregate in the browse list", async () => {
    const t = harness();
    await seed(t);

    const cards = await t.query(api.topics.list, {});
    expect(cards).toHaveLength(1);
    expect(cards[0].stats).toBeNull();
  });

  test("cannot add the gated number back up from the country lean", async () => {
    const t = harness();
    await seed(t);

    const page = await t.query(api.topics.bySlug, { slug: "pineapple" });
    const [country] = page!.countries;

    // The lean is a share and a sample size. The four counters — which sum to
    // exactly the gated aggregate — never leave the server.
    expect(Object.keys(country).sort()).toEqual([
      "countryCode",
      "lovePct",
      "sample",
    ]);
    expect(country.lovePct).toBe(67);
    expect(JSON.stringify(page)).not.toContain("freeLove");
  });
});

describe("voting opens it", () => {
  test("a free vote returns the aggregate and keeps it open", async () => {
    const t = harness();
    const topicId = await seed(t);
    const { as } = await signedIn(t, "voter");

    const cast = await as.mutation(api.votes.cast, {
      topicId,
      choice: "love",
      voteType: "free",
    });
    expect(cast.stats.freeLove).toBe(8);

    const page = await as.query(api.topics.bySlug, { slug: "pineapple" });
    expect(page!.topic.stats).not.toBeNull();
    expect(page!.viewer.unlocked).toBe(true);
    expect(page!.viewer.votedFree).toBe("love");
    expect(page!.viewer.votedPaid).toBeNull();
  });
});

describe("the peek", () => {
  test("costs one spark, opens the aggregate, and is not a vote", async () => {
    const t = harness();
    const topicId = await seed(t);
    const { as, userId } = await signedIn(t, "peeker");

    const peek = await as.mutation(api.votes.peek, { topicId });
    expect(peek.stats.paidHate).toBe(4);
    expect(peek.walletBalanceCents).toBe(500 - PEEK_CENTS);

    const state = await t.run(async (ctx) => ({
      votes: await ctx.db.query("votes").collect(),
      peeks: await ctx.db.query("topicPeeks").collect(),
      ledger: (await ctx.db.query("creditTransactions").collect()).filter(
        (r) => r.type === "peek",
      ),
    }));
    expect(state.votes).toHaveLength(0);
    expect(state.peeks).toHaveLength(1);
    expect(state.ledger[0].amountCents).toBe(-PEEK_CENTS);

    const page = await as.query(api.topics.bySlug, { slug: "pineapple" });
    expect(page!.viewer.peeked).toBe(true);
    expect(page!.topic.stats).not.toBeNull();

    // Peeking twice charges once. A second charge for something already
    // visible is a bug that looks exactly like a scam.
    const again = await as.mutation(api.votes.peek, { topicId });
    expect(again.walletBalanceCents).toBe(500 - PEEK_CENTS);
    const after = await t.run(async (ctx) => await ctx.db.get("users", userId));
    expect(after?.walletBalanceCents).toBe(500 - PEEK_CENTS);
  });

  test("voting afterwards does not refund it", async () => {
    const t = harness();
    const topicId = await seed(t);
    const { as, userId } = await signedIn(t, "both");

    await as.mutation(api.votes.peek, { topicId });
    await as.mutation(api.votes.cast, {
      topicId,
      choice: "hate",
      voteType: "free",
    });

    const after = await t.run(async (ctx) => await ctx.db.get("users", userId));
    // The peek and the vote are independent acts, as they are in the product.
    expect(after?.walletBalanceCents).toBe(500 - PEEK_CENTS);
  });

  test("a wallet under one spark cannot peek", async () => {
    const t = harness();
    const topicId = await seed(t);
    const { as } = await signedIn(t, "broke", PEEK_CENTS - 1);

    await expect(as.mutation(api.votes.peek, { topicId })).rejects.toThrow(
      /credit/i,
    );
    const page = await as.query(api.topics.bySlug, { slug: "pineapple" });
    expect(page!.topic.stats).toBeNull();
  });
});

describe("the live rail is not a side door to the gate", () => {
  test("a vote's side is withheld from a reader who has not earned it", async () => {
    const t = harness();
    const topicId = await seed(t);
    const { as: voterA } = await signedIn(t, "rail-voter");
    await voterA.mutation(api.votes.cast, {
      topicId,
      choice: "love",
      voteType: "free",
    });

    // A stranger sees that a vote happened, and where from. Not which way.
    const anon = await t.query(api.leaderboards.activity, {});
    expect(anon).toHaveLength(1);
    expect(anon[0].choice).toBeNull();
    expect(anon[0].countryCode).toBe("ET");
    expect(anon[0].question).toBe("Pineapple on pizza?");
    // Watching this feed must never let anyone tally the room.
    expect(JSON.stringify(anon)).not.toContain("love");

    // A signed-in reader who has not voted here is still a stranger to it.
    const { as: lurker } = await signedIn(t, "rail-lurker");
    expect((await lurker.query(api.leaderboards.activity, {}))[0].choice).toBeNull();

    // The voter has earned this topic, so their own feed shows the side.
    expect((await voterA.query(api.leaderboards.activity, {}))[0].choice).toBe("love");
  });
});

