/// <reference types="vite/client" />
import { register as registerRateLimiter } from "@convex-dev/rate-limiter/test";
import { convexTest } from "convex-test";
import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";

import { api } from "./_generated/api";
import type { Id } from "./_generated/dataModel";
import { PRIOR } from "./lib/affinity";
import schema from "./schema";

/**
 * Every act is written down, and the feed reads what it says.
 *
 * The thing to prove is not the arithmetic — `affinity.test.ts` does that —
 * but the wiring: that a pull from the room actually lands in the log with
 * the topic's tags on it, that the weights move, and that the very next feed
 * is different because of it.
 */

const modules = import.meta.glob("./**/*.ts");

beforeEach(() => vi.useFakeTimers());
afterEach(() => vi.useRealTimers());

function harness() {
  const t = convexTest(schema, modules);
  registerRateLimiter(t);
  return t;
}

async function reader(t: ReturnType<typeof harness>, subject: string) {
  const as = t.withIdentity({ subject, email: `${subject}@example.test` });
  const userId: Id<"users"> = await as.mutation(api.users.ensure, {});
  await t.finishAllScheduledFunctions(vi.runAllTimers);
  await t.run(async (ctx) => {
    await ctx.db.patch("users", userId, { countryCode: "ET", walletBalanceCents: 500 });
  });
  return { as, userId };
}

/** Three topics: two about pizza, one about war, all equally busy. */
async function corpus(t: ReturnType<typeof harness>, by: Id<"users">) {
  return await t.run(async (ctx) => {
    const food = await ctx.db.insert("categories", { slug: "food", name: "Food" });
    const world = await ctx.db.insert("categories", { slug: "world", name: "World" });
    const mk = async (slug: string, categoryId: Id<"categories">, tagSlugs: string[]) => {
      const id = await ctx.db.insert("topics", {
        slug,
        question: `${slug}?`,
        categoryId,
        status: "active",
        isSensitive: false,
        isLocked: false,
        isFeatured: false,
        tagSlugs,
        createdBy: by,
      });
      await ctx.db.insert("topicStats", {
        topicId: id, freeLove: 10, freeHate: 10, paidLove: 0, paidHate: 0,
        stakedCents: 0, skips: 0, comments: 0,
      });
      return id;
    };
    return {
      pizzaA: await mk("pizza-a", food, ["pizza"]),
      pizzaB: await mk("pizza-b", food, ["pizza"]),
      war: await mk("war", world, ["war"]),
    };
  });
}

describe("acts are written down with what the topic is made of", () => {
  test("a pull lands in the log and moves the tag more than a vote would", async () => {
    const t = harness();
    const { as, userId } = await reader(t, "puller");
    const { pizzaA } = await corpus(t, userId);

    await as.mutation(api.interactions.pull, { topicId: pizzaA });

    const log = await t.run(async (ctx) => await ctx.db.query("interactions").collect());
    expect(log).toHaveLength(1);
    expect(log[0]).toMatchObject({ kind: "pull", tagSlugs: ["pizza"] });

    const weights = await t.run(async (ctx) => await ctx.db.query("userAffinity").collect());
    const pizza = weights.find((w) => w.key === "tag:pizza")!;
    expect(pizza.weight).toBeGreaterThan(PRIOR);
    expect(pizza.n).toBe(1);
  });

  test("a vote is a vote, a paid vote is a spark, and taking it back is an undo", async () => {
    const t = harness();
    const { as, userId } = await reader(t, "voter");
    const { pizzaA, pizzaB } = await corpus(t, userId);

    await as.mutation(api.votes.cast, { topicId: pizzaA, choice: "love", voteType: "free" });
    await as.mutation(api.votes.cast, { topicId: pizzaB, choice: "love", voteType: "paid" });
    const afterVotes = await t.run(async (ctx) =>
      (await ctx.db.query("userAffinity").collect()).find((w) => w.key === "tag:pizza")!.weight,
    );

    await as.mutation(api.retract.vote, { topicId: pizzaB });

    const kinds = await t.run(async (ctx) =>
      (await ctx.db.query("interactions").collect()).map((i) => i.kind),
    );
    expect(kinds).toEqual(["vote", "spark", "undo"]);

    const afterUndo = await t.run(async (ctx) =>
      (await ctx.db.query("userAffinity").collect()).find((w) => w.key === "tag:pizza")!.weight,
    );
    expect(afterUndo).toBeLessThan(afterVotes);
    expect(afterUndo).toBeGreaterThan(PRIOR);
  });

  test("a skip is written, and a comment is written", async () => {
    const t = harness();
    const { as, userId } = await reader(t, "talker");
    const { pizzaA, war } = await corpus(t, userId);
    await t.run(async (ctx) => {
      await ctx.db.patch("users", userId, { quillBalance: 3 });
    });

    await as.mutation(api.votes.skip, { topicId: war });
    await as.mutation(api.comments.post, { topicId: pizzaA, body: "Obviously." });

    const kinds = await t.run(async (ctx) =>
      (await ctx.db.query("interactions").collect()).map((i) => i.kind),
    );
    expect(kinds).toEqual(["skip", "comment"]);
  });
});

describe("the very next feed is different because of it", () => {
  test("pulling one pizza topic lifts the other pizza topic over the war", async () => {
    const t = harness();
    const { as, userId } = await reader(t, "hungry");
    const { pizzaA, pizzaB, war } = await corpus(t, userId);

    const before = await as.query(api.topics.feed, { limit: 10, seed: "x", now: Date.now() });
    // Equal counters, no history: nothing separates them but the seed.
    expect(before.map((c) => c.slug).sort()).toEqual(["pizza-a", "pizza-b", "war"]);

    await as.mutation(api.interactions.pull, { topicId: pizzaA });
    await as.mutation(api.votes.skip, { topicId: war });

    const after = await as.query(api.topics.feed, { limit: 10, seed: "x", now: Date.now() });
    const slugs = after.map((c) => c.slug);
    expect(slugs.indexOf("pizza-b")).toBeLessThan(slugs.indexOf("war"));
    void pizzaB;
  });
});
