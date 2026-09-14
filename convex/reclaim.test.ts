/// <reference types="vite/client" />
import { register as registerRateLimiter } from "@convex-dev/rate-limiter/test";
import { convexTest } from "convex-test";
import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";

import { LIMITS, SPARK_CENTS } from "./config";
import { api } from "./_generated/api";
import type { Id } from "./_generated/dataModel";
import schema from "./schema";

/**
 * Taking a pack back after the last one ran out.
 *
 * The rule the catalogue used to enforce was "one per account", and it was
 * enforced because free credit that never stops is the same thing as no paid
 * layer at all. Relaxing it to "one at a time" keeps that danger in the room,
 * so the two guards that replaced the old rule are what these tests hammer:
 * the balance must actually have run dry, and only so many may be taken back
 * in a day.
 */

const modules = import.meta.glob("./**/*.ts");
const DAY_MS = 24 * 60 * 60 * 1000;

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

/** Spend everything, the way a run of paid votes would. */
async function drain(t: ReturnType<typeof harness>, userId: Id<"users">) {
  await t.run(async (ctx) => {
    await ctx.db.patch("users", userId, { walletBalanceCents: 0 });
  });
}

describe("a pack comes back when the balance it carries has run dry", () => {
  test("an emptied wallet may take another, and both grants stay in the ledger", async () => {
    const t = harness();
    const { as, userId } = await account(t, "returner");
    await as.mutation(api.wallet.claimPack, { packId: "starter" });
    await drain(t, userId);

    const got = await as.mutation(api.wallet.claimPack, { packId: "heavy" });
    expect(got.cents).toBe(2500);

    const state = await t.run(async (ctx) => ({
      user: await ctx.db.get("users", userId),
      ledger: await ctx.db.query("creditTransactions").collect(),
    }));
    expect(state.user?.walletBalanceCents).toBe(2500);
    // The last pack taken, not a claim that can never happen again.
    expect(state.user?.claimedPackId).toBe("heavy");

    // Append-only, and still never a purchase: two grants, both named.
    const packRows = state.ledger.filter((r) => r.packId !== undefined);
    expect(packRows).toHaveLength(2);
    expect(packRows.every((r) => r.type === "grant")).toBe(true);
    expect(state.ledger.some((r) => r.type === "purchase")).toBe(false);
  });

  test("a wallet with one spark left in it has not run dry", async () => {
    const t = harness();
    const { as, userId } = await account(t, "almost");
    await as.mutation(api.wallet.claimPack, { packId: "starter" });
    await t.run(async (ctx) => {
      await ctx.db.patch("users", userId, { walletBalanceCents: SPARK_CENTS });
    });

    await expect(
      as.mutation(api.wallet.claimPack, { packId: "starter" }),
    ).rejects.toThrow(/still have sparks/i);

    // One cent below a spark is a wallet that can no longer buy anything.
    await t.run(async (ctx) => {
      await ctx.db.patch("users", userId, {
        walletBalanceCents: SPARK_CENTS - 1,
      });
    });
    await expect(
      as.mutation(api.wallet.claimPack, { packId: "starter" }),
    ).resolves.toBeDefined();
  });

  test("the two currencies empty independently", async () => {
    const t = harness();
    const { as, userId } = await account(t, "scribe");
    await as.mutation(api.wallet.claimPack, { packId: "starter" });
    // Out of quills, flush with sparks: the quill pack returns and the spark
    // packs do not. Asking about one balance would get both of these wrong.
    await t.run(async (ctx) => {
      await ctx.db.patch("users", userId, {
        walletBalanceCents: 1000,
        quillBalance: 0,
      });
    });

    const shelf = await as.query(api.wallet.packs, {});
    expect(shelf.items.find((p) => p.id === "quills")?.claimable).toBe(true);
    expect(shelf.items.find((p) => p.id === "starter")?.claimable).toBe(false);

    await expect(
      as.mutation(api.wallet.claimPack, { packId: "starter" }),
    ).rejects.toThrow(/still have sparks/i);
    await as.mutation(api.wallet.claimPack, { packId: "quills" });
    expect(
      (await t.run(async (ctx) => await ctx.db.get("users", userId)))
        ?.quillBalance,
    ).toBe(10);
  });
});

describe("the daily ceiling is what keeps free credit from being infinite", () => {
  test("the budget runs out, and the wallet is not credited past it", async () => {
    const t = harness();
    const { as, userId } = await account(t, "grinder");
    await as.mutation(api.wallet.claimPack, { packId: "starter" });

    // The first pack is not a reclaim, so the whole day's budget is still there.
    for (let i = 0; i < LIMITS.reclaimsPerDay; i++) {
      await drain(t, userId);
      await as.mutation(api.wallet.claimPack, { packId: "starter" });
    }

    await drain(t, userId);
    await expect(
      as.mutation(api.wallet.claimPack, { packId: "starter" }),
    ).rejects.toThrow(/today/i);
    const dry = await t.run(async (ctx) => await ctx.db.get("users", userId));
    expect(dry?.walletBalanceCents).toBe(0);

    // A refused reclaim writes nothing at all, ledger included.
    const rows = await t.run(
      async (ctx) => await ctx.db.query("creditTransactions").collect(),
    );
    expect(rows.filter((r) => r.packId !== undefined)).toHaveLength(
      1 + LIMITS.reclaimsPerDay,
    );
  });

  test("tomorrow it opens again", async () => {
    const t = harness();
    const { as, userId } = await account(t, "patient");
    await as.mutation(api.wallet.claimPack, { packId: "starter" });
    for (let i = 0; i < LIMITS.reclaimsPerDay; i++) {
      await drain(t, userId);
      await as.mutation(api.wallet.claimPack, { packId: "starter" });
    }
    await drain(t, userId);
    await expect(
      as.mutation(api.wallet.claimPack, { packId: "starter" }),
    ).rejects.toThrow(/today/i);

    vi.advanceTimersByTime(DAY_MS);
    await expect(
      as.mutation(api.wallet.claimPack, { packId: "starter" }),
    ).resolves.toBeDefined();
  });
});
