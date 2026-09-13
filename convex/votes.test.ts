/// <reference types="vite/client" />
import { register as registerRateLimiter } from "@convex-dev/rate-limiter/test";
import { convexTest } from "convex-test";
import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";

import { SPARK_CENTS } from "./config";
import { api } from "./_generated/api";
import type { Id } from "./_generated/dataModel";
import schema from "./schema";

/**
 * The rules this product cannot be wrong about.
 *
 * Postgres enforced one free and one paid vote per person per topic with a
 * unique constraint. Convex has no unique index, so that guarantee is now an
 * index read inside `votes.cast` — application logic, and application logic is
 * exactly the kind of thing that quietly stops being true. This file is what
 * keeps it true.
 *
 * Every test here was watched failing before it was kept.
 */

const modules = import.meta.glob("./**/*.ts");

// Signing up schedules the welcome mail. Fake timers let each test run that
// scheduled work to completion instead of leaving it in flight against a
// database the next test has already torn down.
beforeEach(() => vi.useFakeTimers());
afterEach(() => vi.useRealTimers());

function harness() {
  const t = convexTest(schema, modules);
  // The vote path consumes a rate-limit token in the same transaction, so the
  // component has to be real here or the mutation under test never runs.
  registerRateLimiter(t);
  return t;
}

/** A signed-in account with a country and a wallet, ready to vote. */
async function voter(
  t: ReturnType<typeof harness>,
  subject: string,
  cents = 500,
  country = "ET",
) {
  const as = t.withIdentity({ subject, email: `${subject}@example.test` });
  const userId: Id<"users"> = await as.mutation(api.users.ensure, {});
  await t.finishAllScheduledFunctions(vi.runAllTimers);
  await t.run(async (ctx) => {
    await ctx.db.patch("users", userId, {
      walletBalanceCents: cents,
      countryCode: country,
    });
  });
  return { as, userId };
}

async function topic(t: ReturnType<typeof harness>, slug = "pineapple-pizza") {
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
      freeLove: 0,
      freeHate: 0,
      paidLove: 0,
      paidHate: 0,
      stakedCents: 0,
      skips: 0,
      comments: 0,
    });
    return topicId;
  });
}

describe("one free and one paid vote per person per topic", () => {
  test("a second free vote is refused", async () => {
    const t = harness();
    const topicId = await topic(t);
    const { as } = await voter(t, "a");

    await as.mutation(api.votes.cast, {
      topicId,
      choice: "love",
      voteType: "free",
    });
    await expect(
      as.mutation(api.votes.cast, {
        topicId,
        choice: "hate",
        voteType: "free",
      }),
    ).rejects.toThrow(/already voted/i);
  });

  test("a second paid vote is refused, and costs nothing", async () => {
    const t = harness();
    const topicId = await topic(t);
    const { as, userId } = await voter(t, "b");

    await as.mutation(api.votes.cast, {
      topicId,
      choice: "love",
      voteType: "paid",
    });
    await expect(
      as.mutation(api.votes.cast, {
        topicId,
        choice: "hate",
        voteType: "paid",
      }),
    ).rejects.toThrow(/already backed/i);

    const after = await t.run(async (ctx) => await ctx.db.get("users", userId));
    // One spark left the wallet, not two.
    expect(after?.walletBalanceCents).toBe(500 - SPARK_CENTS);
  });

  test("free and paid on the same topic are both allowed", async () => {
    const t = harness();
    const topicId = await topic(t);
    const { as } = await voter(t, "c");

    await as.mutation(api.votes.cast, {
      topicId,
      choice: "love",
      voteType: "free",
    });
    const result = await as.mutation(api.votes.cast, {
      topicId,
      choice: "love",
      voteType: "paid",
    });
    // Doubling down is legal, and counted on both layers.
    expect(result.stats.freeLove).toBe(1);
    expect(result.stats.paidLove).toBe(1);
  });

  test("simultaneous casts cannot both land", async () => {
    const t = harness();
    const topicId = await topic(t);
    const { as } = await voter(t, "d");

    const results = await Promise.allSettled([
      as.mutation(api.votes.cast, {
        topicId,
        choice: "love",
        voteType: "free",
      }),
      as.mutation(api.votes.cast, {
        topicId,
        choice: "hate",
        voteType: "free",
      }),
    ]);
    expect(results.filter((r) => r.status === "fulfilled")).toHaveLength(1);

    const rows = await t.run(
      async (ctx) => await ctx.db.query("votes").collect(),
    );
    expect(rows).toHaveLength(1);
  });
});

describe("the paid vote is all of it or none of it", () => {
  test("a wallet under one spark cannot cast a paid vote", async () => {
    const t = harness();
    const topicId = await topic(t);
    const { as, userId } = await voter(t, "e", SPARK_CENTS - 1);

    await expect(
      as.mutation(api.votes.cast, {
        topicId,
        choice: "love",
        voteType: "paid",
      }),
    ).rejects.toThrow(/credit/i);

    // Nothing at all was written: no vote, no ledger row, no counter moved.
    const state = await t.run(async (ctx) => ({
      user: await ctx.db.get("users", userId),
      votes: await ctx.db.query("votes").collect(),
      ledger: await ctx.db.query("creditTransactions").collect(),
      stats: await ctx.db.query("topicStats").collect(),
    }));
    expect(state.user?.walletBalanceCents).toBe(SPARK_CENTS - 1);
    expect(state.votes).toHaveLength(0);
    expect(state.ledger.filter((r) => r.type === "spend")).toHaveLength(0);
    expect(state.stats[0].paidLove).toBe(0);
  });

  test("a wallet at zero stays at zero", async () => {
    const t = harness();
    const topicId = await topic(t);
    const { as, userId } = await voter(t, "f", 0);

    await expect(
      as.mutation(api.votes.cast, {
        topicId,
        choice: "hate",
        voteType: "paid",
      }),
    ).rejects.toThrow();

    const after = await t.run(async (ctx) => await ctx.db.get("users", userId));
    expect(after?.walletBalanceCents).toBe(0);
  });

  test("a successful paid vote writes its spend row in the same breath", async () => {
    const t = harness();
    const topicId = await topic(t);
    const { as, userId } = await voter(t, "g");

    await as.mutation(api.votes.cast, {
      topicId,
      choice: "hate",
      voteType: "paid",
    });

    const state = await t.run(async (ctx) => ({
      user: await ctx.db.get("users", userId),
      votes: await ctx.db.query("votes").collect(),
      spends: (await ctx.db.query("creditTransactions").collect()).filter(
        (r) => r.type === "spend",
      ),
      stats: await ctx.db.query("topicStats").collect(),
      byCountry: await ctx.db.query("countryTopicStats").collect(),
    }));

    expect(state.user?.walletBalanceCents).toBe(500 - SPARK_CENTS);
    expect(state.votes).toHaveLength(1);
    expect(state.spends).toHaveLength(1);
    expect(state.spends[0].amountCents).toBe(-SPARK_CENTS);
    expect(state.stats[0].paidHate).toBe(1);
    expect(state.stats[0].stakedCents).toBe(SPARK_CENTS);
    expect(state.byCountry[0].countryCode).toBe("ET");
    expect(state.byCountry[0].paidHate).toBe(1);
  });
});

describe("counters never drift", () => {
  test("a burst of votes leaves the totals equal to a recount", async () => {
    const t = harness();
    const topicId = await topic(t);

    for (let i = 0; i < 12; i += 1) {
      const { as } = await voter(t, `burst-${i}`, 500, i % 2 ? "ET" : "US");
      await as.mutation(api.votes.cast, {
        topicId,
        choice: i % 3 === 0 ? "hate" : "love",
        voteType: "free",
      });
      if (i % 2 === 0) {
        await as.mutation(api.votes.cast, {
          topicId,
          choice: i % 5 === 0 ? "hate" : "love",
          voteType: "paid",
        });
      }
    }

    const { stored, recount, countries } = await t.run(async (ctx) => {
      const votes = await ctx.db.query("votes").collect();
      const tally = { freeLove: 0, freeHate: 0, paidLove: 0, paidHate: 0 };
      const perCountry: Record<string, number> = {};
      for (const vote of votes) {
        const key = `${vote.voteType}${vote.choice === "love" ? "Love" : "Hate"}`;
        tally[key as keyof typeof tally] += 1;
        perCountry[vote.countryCode] = (perCountry[vote.countryCode] ?? 0) + 1;
      }
      return {
        stored: (await ctx.db.query("topicStats").collect())[0],
        recount: tally,
        countries: {
          rows: await ctx.db.query("countryTopicStats").collect(),
          expected: perCountry,
        },
      };
    });

    expect({
      freeLove: stored.freeLove,
      freeHate: stored.freeHate,
      paidLove: stored.paidLove,
      paidHate: stored.paidHate,
    }).toEqual(recount);
    expect(stored.stakedCents).toBe(recount.paidLove * SPARK_CENTS + recount.paidHate * SPARK_CENTS);

    for (const row of countries.rows) {
      const total = row.freeLove + row.freeHate + row.paidLove + row.paidHate;
      expect(total).toBe(countries.expected[row.countryCode]);
    }
  });
});

describe("the top-backers board counts topics, not money", () => {
  test("a spark on each of two topics counts two; free votes count none", async () => {
    const t = harness();
    const first = await topic(t, "first");
    const second = await topic(t, "second");
    const { as, userId } = await voter(t, "backer");

    await as.mutation(api.votes.cast, {
      topicId: first,
      choice: "love",
      voteType: "free",
    });
    // A free vote is an opinion, not a stake. It must not move this counter.
    expect(
      (await t.run(async (ctx) => await ctx.db.get("users", userId)))?.topicsBacked,
    ).toBe(0);

    await as.mutation(api.votes.cast, {
      topicId: first,
      choice: "love",
      voteType: "paid",
    });
    await as.mutation(api.votes.cast, {
      topicId: second,
      choice: "hate",
      voteType: "paid",
    });

    const after = await t.run(async (ctx) => await ctx.db.get("users", userId));
    expect(after?.topicsBacked).toBe(2);
    // The counter is a stored total; it must equal a recount of the paid rows.
    const paid = await t.run(async (ctx) =>
      (await ctx.db.query("votes").collect()).filter((v) => v.voteType === "paid"),
    );
    expect(after?.topicsBacked).toBe(paid.length);
  });
});

