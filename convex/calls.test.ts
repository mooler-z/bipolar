/// <reference types="vite/client" />
import { register as registerRateLimiter } from "@convex-dev/rate-limiter/test";
import { convexTest } from "convex-test";
import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";

import { MIN_ROOM } from "./calls";
import { api } from "./_generated/api";
import type { Id } from "./_generated/dataModel";
import schema from "./schema";

/**
 * The loop the product turns on, and the three rules that make its score
 * worth having: the room excludes you, small rooms do not count, and a
 * verdict never changes after the fact.
 */

const modules = import.meta.glob("./**/*.ts");

beforeEach(() => vi.useFakeTimers());
afterEach(() => vi.useRealTimers());

function harness() {
  const t = convexTest(schema, modules);
  registerRateLimiter(t);
  return t;
}

/** A topic whose crowd already leans the given way by the given margin. */
async function room(
  t: ReturnType<typeof harness>,
  { love, hate, slug = "pineapple" }: { love: number; hate: number; slug?: string },
) {
  return await t.run(async (ctx) => {
    const author = await ctx.db.insert("users", {
      authId: `system:${slug}`,
      email: "",
      displayName: "House",
      walletBalanceCents: 0,
      quillBalance: 0,
      role: "creator",
      isBanned: false,
      profilePublic: false,
      topicsBacked: 0,
      digestOptIn: false,
    });
    const categoryId = await ctx.db.insert("categories", {
      slug: `c-${slug}`,
      name: "Food",
    });
    const topicId = await ctx.db.insert("topics", {
      slug,
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
      freeLove: love,
      freeHate: hate,
      paidLove: 0,
      paidHate: 0,
      stakedCents: 0,
      skips: 0,
      comments: 0,
    });
    return topicId;
  });
}

async function player(t: ReturnType<typeof harness>, subject: string) {
  const as = t.withIdentity({ subject, email: `${subject}@example.test` });
  const userId: Id<"users"> = await as.mutation(api.users.ensure, {});
  await t.finishAllScheduledFunctions(vi.runAllTimers);
  await t.run(async (ctx) => {
    await ctx.db.patch("users", userId, { countryCode: "ET" });
  });
  return { as, userId };
}

describe("calling the room", () => {
  test("reading it right sets a streak and an accuracy", async () => {
    const t = harness();
    const topicId = await room(t, { love: 8, hate: 2 });
    const { as } = await player(t, "reader");

    const out = await as.mutation(api.votes.cast, {
      topicId,
      choice: "hate",
      voteType: "free",
      call: "love",
    });

    expect(out.verdict).toMatchObject({
      called: "love",
      crowdWent: "love",
      correct: true,
      crowdPct: 80,
      streak: 1,
    });
    expect(await as.query(api.calls.me, {})).toMatchObject({
      made: 1,
      right: 1,
      accuracy: 100,
      streak: 1,
      bestStreak: 1,
      // Voted hate against a love room: broke from the crowd once out of once.
      contrarian: 100,
    });
  });

  test("reading it wrong resets the streak but keeps the best", async () => {
    const t = harness();
    const first = await room(t, { love: 9, hate: 1, slug: "one" });
    const second = await room(t, { love: 1, hate: 9, slug: "two" });
    const { as } = await player(t, "streaker");

    await as.mutation(api.votes.cast, {
      topicId: first,
      choice: "love",
      voteType: "free",
      call: "love",
    });
    const miss = await as.mutation(api.votes.cast, {
      topicId: second,
      choice: "love",
      voteType: "free",
      call: "love",
    });

    expect(miss.verdict).toMatchObject({ correct: false, streak: 0 });
    expect(await as.query(api.calls.me, {})).toMatchObject({
      made: 2,
      right: 1,
      accuracy: 50,
      streak: 0,
      bestStreak: 1,
    });
  });
});

describe("the room does not include the caller", () => {
  test("a vote cannot tip the majority it is graded against", async () => {
    const t = harness();
    // Dead even before the vote, and love wins ties. Voting hate must not
    // flip the grading room to hate.
    const topicId = await room(t, { love: 3, hate: 3 });
    const { as } = await player(t, "tipper");

    const out = await as.mutation(api.votes.cast, {
      topicId,
      choice: "hate",
      voteType: "free",
      call: "love",
    });
    expect(out.verdict).toMatchObject({ crowdWent: "love", correct: true });
    // And the counters did move — the vote was still cast.
    expect(out.stats.freeHate).toBe(4);
  });
});

describe("a room too small to read is not graded at all", () => {
  test("no verdict, no record, and no streak is broken", async () => {
    const t = harness();
    const big = await room(t, { love: 6, hate: 0, slug: "big" });
    const tiny = await room(t, { love: 1, hate: 0, slug: "tiny" });
    const { as } = await player(t, "early");

    await as.mutation(api.votes.cast, {
      topicId: big,
      choice: "love",
      voteType: "free",
      call: "love",
    });

    const out = await as.mutation(api.votes.cast, {
      topicId: tiny,
      choice: "love",
      // A call that would be wrong if it were graded.
      call: "hate",
      voteType: "free",
    });
    expect(out.verdict).toBeNull();

    // Being early must not cost a streak, and must not pad a record.
    expect(await as.query(api.calls.me, {})).toMatchObject({
      made: 1,
      right: 1,
      streak: 1,
    });
    expect(
      await t.run(async (ctx) => await ctx.db.query("calls").collect()),
    ).toHaveLength(1);
  });

  test("the floor is where the constant says it is", async () => {
    const t = harness();
    const topicId = await room(t, { love: MIN_ROOM - 1, hate: 0 });
    const { as } = await player(t, "under");
    const out = await as.mutation(api.votes.cast, {
      topicId,
      choice: "love",
      voteType: "free",
      call: "love",
    });
    expect(out.verdict).toBeNull();
  });
});

describe("a verdict is as final as the vote it rides on", () => {
  test("one call per topic, however many times you vote on it", async () => {
    const t = harness();
    const topicId = await room(t, { love: 8, hate: 2 });
    const { as, userId } = await player(t, "doubler");
    await t.run(async (ctx) => {
      await ctx.db.patch("users", userId, { walletBalanceCents: 500 });
    });

    await as.mutation(api.votes.cast, {
      topicId,
      choice: "love",
      voteType: "free",
      call: "love",
    });
    // Backing the same topic is a second vote but not a second reading.
    const paid = await as.mutation(api.votes.cast, {
      topicId,
      choice: "love",
      voteType: "paid",
      call: "hate",
    });

    expect(paid.verdict).toBeNull();
    expect(
      await t.run(async (ctx) => await ctx.db.query("calls").collect()),
    ).toHaveLength(1);
    expect(await as.query(api.calls.me, {})).toMatchObject({ made: 1, right: 1 });
  });

  test("later votes move the topic and never the verdict", async () => {
    const t = harness();
    const topicId = await room(t, { love: 6, hate: 0 });
    const { as } = await player(t, "first");

    await as.mutation(api.votes.cast, {
      topicId,
      choice: "love",
      voteType: "free",
      call: "love",
    });

    // The room swings the other way afterwards.
    for (let i = 0; i < 20; i += 1) {
      const { as: other } = await player(t, `swing-${i}`);
      await other.mutation(api.votes.cast, {
        topicId,
        choice: "hate",
        voteType: "free",
      });
    }

    const row = await t.run(
      async (ctx) => (await ctx.db.query("calls").collect())[0],
    );
    expect(row.correct).toBe(true);
    expect(row.crowdWasLove).toBe(true);
    expect(row.sampleSize).toBe(6);
  });
});

describe("the readers board is not a spend ranking", () => {
  test("a lucky short record does not outrank a long good one", async () => {
    const t = harness();
    await t.run(async (ctx) => {
      const mk = async (name: string, made: number, right: number) => {
        const userId = await ctx.db.insert("users", {
          authId: `auth|${name}`,
          email: `${name}@example.test`,
          displayName: name,
          walletBalanceCents: 0,
          quillBalance: 0,
          role: "user",
          isBanned: false,
          profilePublic: false,
          topicsBacked: 0,
          digestOptIn: false,
        });
        await ctx.db.insert("callerStats", {
          userId,
          made,
          right,
          streak: 0,
          bestStreak: 0,
          graded: made,
          withCrowd: right,
        });
      };
      await mk("Lucky", 3, 3); // perfect, but under the floor
      await mk("Solid", 80, 60);
      await mk("Sharp", 40, 36);
    });

    const board = await t.query(api.calls.readers, {});
    expect(board.map((r) => r.displayName)).toEqual(["Sharp", "Solid"]);
    expect(board[0].accuracy).toBe(90);
  });
});
