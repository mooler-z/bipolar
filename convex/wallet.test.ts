/// <reference types="vite/client" />
import { register as registerRateLimiter } from "@convex-dev/rate-limiter/test";
import { convexTest } from "convex-test";
import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";

import { PACKS, SPARK_CENTS } from "./config";
import { api } from "./_generated/api";
import type { Id } from "./_generated/dataModel";
import schema from "./schema";

/**
 * Packs are free during the hackathon, and that is exactly why these tests
 * exist. Free is the one condition under which it is tempting to let the
 * catalogue be sloppy — and every rule here has to survive the day money is
 * real, when the same code path becomes a checkout.
 */

const modules = import.meta.glob("./**/*.ts");
const STARTER = PACKS[0];

beforeEach(() => vi.useFakeTimers());
afterEach(() => vi.useRealTimers());

function harness() {
  const t = convexTest(schema, modules);
  registerRateLimiter(t);
  return t;
}

async function account(t: ReturnType<typeof harness>, subject: string) {
  const as = t.withIdentity({ subject, email: `${subject}@example.test` });
  const userId: Id<"users"> = await as.mutation(api.users.ensure, {});
  await t.finishAllScheduledFunctions(vi.runAllTimers);
  return { as, userId };
}

describe("claiming a pack", () => {
  test("credits exactly what the catalogue says, and says who paid", async () => {
    const t = harness();
    const { as, userId } = await account(t, "claimer");
    const before = await t.run(async (ctx) => await ctx.db.get("users", userId));

    const got = await as.mutation(api.wallet.claimPack, { packId: STARTER.id });
    expect(got.cents).toBe(STARTER.priceCents);
    expect(got.quills).toBe(STARTER.quills);

    const state = await t.run(async (ctx) => ({
      user: await ctx.db.get("users", userId),
      ledger: await ctx.db.query("creditTransactions").collect(),
    }));
    expect(state.user?.walletBalanceCents).toBe(
      (before?.walletBalanceCents ?? 0) + STARTER.priceCents,
    );
    expect(state.user?.quillBalance).toBe(
      (before?.quillBalance ?? 0) + STARTER.quills,
    );

    // The ledger must never claim money that did not exist. Nothing about a
    // free claim may be recorded as a purchase.
    const claim = state.ledger.find((r) => r.packId === STARTER.id);
    expect(claim?.type).toBe("grant");
    expect(claim?.amountCents).toBe(STARTER.priceCents);
    expect(claim?.stripePaymentIntentId).toBeUndefined();
    expect(state.ledger.some((r) => r.type === "purchase")).toBe(false);
  });

  test("a second pack is refused while the first still has sparks in it", async () => {
    const t = harness();
    const { as, userId } = await account(t, "greedy");

    await as.mutation(api.wallet.claimPack, { packId: STARTER.id });
    const after = await t.run(async (ctx) => await ctx.db.get("users", userId));

    await expect(
      as.mutation(api.wallet.claimPack, { packId: "heavy" }),
    ).rejects.toThrow(/still have sparks/i);

    const state = await t.run(async (ctx) => ({
      user: await ctx.db.get("users", userId),
      ledger: await ctx.db.query("creditTransactions").collect(),
    }));
    expect(state.user?.walletBalanceCents).toBe(after?.walletBalanceCents);
    expect(state.ledger.filter((r) => r.packId !== undefined)).toHaveLength(1);
  });

  test("two simultaneous claims cannot both pay out", async () => {
    const t = harness();
    const { as, userId } = await account(t, "racer");
    const before = await t.run(async (ctx) => await ctx.db.get("users", userId));

    const results = await Promise.allSettled([
      as.mutation(api.wallet.claimPack, { packId: STARTER.id }),
      as.mutation(api.wallet.claimPack, { packId: "heavy" }),
    ]);
    expect(results.filter((r) => r.status === "fulfilled")).toHaveLength(1);

    const state = await t.run(async (ctx) => ({
      user: await ctx.db.get("users", userId),
      ledger: await ctx.db.query("creditTransactions").collect(),
    }));
    expect(state.ledger.filter((r) => r.packId !== undefined)).toHaveLength(1);
    // Exactly one pack's worth of credit arrived, whichever one won.
    const claimed = state.ledger.find((r) => r.packId !== undefined)!;
    expect(state.user?.walletBalanceCents).toBe(
      (before?.walletBalanceCents ?? 0) + claimed.amountCents,
    );
  });

  test("a pack that is not in the catalogue is refused", async () => {
    const t = harness();
    const { as, userId } = await account(t, "inventor");

    await expect(
      as.mutation(api.wallet.claimPack, { packId: "infinite" }),
    ).rejects.toThrow(/no such pack/i);

    // Nothing written: no marker, so a real pack can still be claimed after.
    const user = await t.run(async (ctx) => await ctx.db.get("users", userId));
    expect(user?.claimedPackId).toBeUndefined();
  });

  test("signing out of an account does not make a fresh wallet", async () => {
    const t = harness();
    const { as } = await account(t, "same-person");
    await as.mutation(api.wallet.claimPack, { packId: STARTER.id });

    // The same identity coming back is the same account, not a new one.
    const again = t.withIdentity({
      subject: "same-person",
      email: "same-person@example.test",
    });
    await expect(
      again.mutation(api.wallet.claimPack, { packId: STARTER.id }),
    ).rejects.toThrow(/still have sparks/i);
  });
});

describe("the catalogue is the only source of prices", () => {
  test("it is published as free, and names what this reader took", async () => {
    const t = harness();
    const { as } = await account(t, "reader");

    const before = await as.query(api.wallet.packs, {});
    expect(before.free).toBe(true);
    expect(before.claimedPackId).toBeNull();
    expect(before.items.map((p) => p.id)).toEqual(PACKS.map((p) => p.id));
    expect(before.items.every((p) => p.claimable)).toBe(true);

    await as.mutation(api.wallet.claimPack, { packId: STARTER.id });
    expect((await as.query(api.wallet.packs, {})).claimedPackId).toBe(STARTER.id);
  });

  test("claimed credit spends like any other, and runs out", async () => {
    const t = harness();
    const { as, userId } = await account(t, "spender");
    await as.mutation(api.wallet.claimPack, { packId: STARTER.id });

    // Free credit is still real credit: drain it and the refusal is the same
    // refusal a paying account would get.
    await t.run(async (ctx) => {
      await ctx.db.patch("users", userId, {
        walletBalanceCents: SPARK_CENTS - 1,
        countryCode: "ET",
      });
    });

    const topicId = await t.run(async (ctx) => {
      const categoryId = await ctx.db.insert("categories", {
        slug: "food",
        name: "Food",
      });
      const id = await ctx.db.insert("topics", {
        slug: "pineapple",
        question: "Pineapple on pizza?",
        categoryId,
        status: "active",
        isSensitive: false,
        isLocked: false,
        isFeatured: false,
        createdBy: userId,
      });
      await ctx.db.insert("topicStats", {
        topicId: id,
        freeLove: 0,
        freeHate: 0,
        paidLove: 0,
        paidHate: 0,
        stakedCents: 0,
        skips: 0,
        comments: 0,
      });
      return id;
    });

    await expect(
      as.mutation(api.votes.cast, {
        topicId,
        choice: "love",
        voteType: "paid",
      }),
    ).rejects.toThrow(/credit/i);
  });
});
