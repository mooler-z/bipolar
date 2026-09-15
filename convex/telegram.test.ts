/// <reference types="vite/client" />
import { register as registerRateLimiter } from "@convex-dev/rate-limiter/test";
import { convexTest } from "convex-test";
import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";

import { api, internal } from "./_generated/api";
import type { Id } from "./_generated/dataModel";
import { MENU, ballotKeyboard, escapeHtml, verdictLine, verdictToast } from "./lib/tgFormat";
import schema from "./schema";

/**
 * The bot's two rules, and its one piece of wording that must not drift.
 *
 * A Telegram account reaches exactly one bipolar account and a bipolar account
 * is reachable from exactly one Telegram account. Convex has no unique index,
 * so that is a read before a write — the same shape as the vote rule, and
 * worth just as little without a test that hammers it.
 *
 * And a vote from the chat is the *same* vote: the same transaction, the same
 * counters, stamped `telegram` so the two surfaces stay tellable apart.
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
    const categoryId = await ctx.db.insert("categories", { slug: "food", name: "Food" });
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

async function voter(t: ReturnType<typeof harness>, subject: string) {
  const as = t.withIdentity({ subject, email: `${subject}@example.test` });
  const userId: Id<"users"> = await as.mutation(api.users.ensure, {});
  await t.finishAllScheduledFunctions(vi.runAllTimers);
  return { as, userId };
}

/** Mint a code the way the bot does, for a given Telegram id. */
async function codeFor(t: ReturnType<typeof harness>, telegramUserId: string) {
  return await t.mutation(internal.telegramLink.issueCode, {
    telegramUserId,
    username: "someone",
    chatId: 4242,
  });
}

describe("one Telegram account, one bipolar account", () => {
  test("a code connects the signed-in account, and only once", async () => {
    const t = harness();
    await seed(t);
    const { as } = await voter(t, "one");

    const code = await codeFor(t, "tg-1");
    const out = await as.mutation(api.telegramLink.redeem, { code });
    expect(out.chatId).toBe(4242);
    expect(await as.query(api.telegramLink.status, {})).toEqual({
      linked: true,
      username: "someone",
    });

    // Single-use: the same link cannot be replayed out of a chat history.
    await expect(as.mutation(api.telegramLink.redeem, { code })).rejects.toThrow(/expired/i);
  });

  test("a Telegram account cannot be attached to a second bipolar account", async () => {
    const t = harness();
    await seed(t);
    const { as: one } = await voter(t, "one");
    const { as: two } = await voter(t, "two");

    await one.mutation(api.telegramLink.redeem, { code: await codeFor(t, "tg-1") });
    await expect(
      two.mutation(api.telegramLink.redeem, { code: await codeFor(t, "tg-1") }),
    ).rejects.toThrow(/already connected/i);
  });

  test("a bipolar account cannot be attached to a second Telegram account", async () => {
    const t = harness();
    await seed(t);
    const { as } = await voter(t, "one");

    await as.mutation(api.telegramLink.redeem, { code: await codeFor(t, "tg-1") });
    await expect(
      as.mutation(api.telegramLink.redeem, { code: await codeFor(t, "tg-2") }),
    ).rejects.toThrow(/already connected/i);
  });

  test("an expired code connects nobody", async () => {
    const t = harness();
    await seed(t);
    const { as } = await voter(t, "one");
    const code = await codeFor(t, "tg-1");

    vi.advanceTimersByTime(16 * 60 * 1000);
    await expect(as.mutation(api.telegramLink.redeem, { code })).rejects.toThrow(/expired/i);
    expect((await as.query(api.telegramLink.status, {})).linked).toBe(false);
  });

  test("signing out drops the join and keeps the votes", async () => {
    const t = harness();
    const topicId = await seed(t);
    const { as, userId } = await voter(t, "one");
    await as.mutation(api.telegramLink.redeem, { code: await codeFor(t, "tg-1") });

    await t.mutation(internal.telegramData.castFor, { userId, topicId, choice: "love" });
    await t.mutation(internal.telegramLink.unlink, { telegramUserId: "tg-1" });

    expect((await as.query(api.telegramLink.status, {})).linked).toBe(false);
    const votes = await t.run(async (ctx) => await ctx.db.query("votes").collect());
    expect(votes).toHaveLength(1);
  });
});

describe("a vote from the chat is the same vote", () => {
  test("it writes one vote, stamped telegram, and moves the counters", async () => {
    const t = harness();
    const topicId = await seed(t);
    const { userId } = await voter(t, "one");

    const out = await t.mutation(internal.telegramData.castFor, {
      userId,
      topicId,
      choice: "love",
    });
    expect(out).toEqual({ ok: true, freeLove: 1, freeHate: 0 });

    const votes = await t.run(async (ctx) => await ctx.db.query("votes").collect());
    expect(votes).toHaveLength(1);
    // The surface is recorded, or the two can never be told apart afterwards.
    expect(votes[0]!.source).toBe("telegram");
    expect(votes[0]!.voteType).toBe("free");

    const totals = await t.run(
      async (ctx) => await ctx.db.query("topicStats").first(),
    );
    expect(totals!.freeLove).toBe(1);
  });

  test("the one-vote-per-topic rule holds across surfaces", async () => {
    const t = harness();
    const topicId = await seed(t);
    const { as, userId } = await voter(t, "one");

    await as.mutation(api.votes.cast, { topicId, choice: "love", voteType: "free" });
    // The bot must not be a second door around the product's central rule.
    const again = await t.mutation(internal.telegramData.castFor, {
      userId,
      topicId,
      choice: "hate",
    });
    expect(again.ok).toBe(false);

    const votes = await t.run(async (ctx) => await ctx.db.query("votes").collect());
    expect(votes).toHaveLength(1);
  });

  test("a refusal is returned, never thrown", async () => {
    const t = harness();
    const topicId = await seed(t);
    const { userId } = await voter(t, "one");
    await t.run(async (ctx) => {
      await ctx.db.patch("topics", topicId, { isLocked: true });
    });

    /* A throw here would reach the webhook, and a webhook that fails makes
       Telegram redeliver the same tap forever. */
    const out = await t.mutation(internal.telegramData.castFor, {
      userId,
      topicId,
      choice: "love",
    });
    expect(out.ok).toBe(false);
  });

  test("a skip from the chat is recorded as a signal", async () => {
    const t = harness();
    const topicId = await seed(t);
    const { userId } = await voter(t, "one");

    await t.mutation(internal.telegramData.skipFor, { userId, topicId });
    const skips = await t.run(async (ctx) => await ctx.db.query("topicSkips").collect());
    expect(skips).toHaveLength(1);
    const acts = await t.run(async (ctx) => await ctx.db.query("interactions").collect());
    expect(acts.some((a) => a.kind === "skip")).toBe(true);
  });
});

describe("what the bot says", () => {
  test("the verdict shows the lean and never the layers", () => {
    expect(verdictLine(61, 39)).toBe("LOVED 61% · HATED 39%");
    expect(verdictLine(0, 0)).toBe("No votes yet");
    expect(verdictLine(5, 5)).toBe("SPLIT 50/50");
    // Paid counts are not arguments here, so they cannot leak into the toast.
    expect(verdictToast({ freeLove: 61, freeHate: 39 }, "love")).toBe(
      "You: LOVE ✓ · LOVED 61% · HATED 39%",
    );
  });

  test("a question with markup in it cannot break the message", () => {
    expect(escapeHtml('<b>"pizza" & co</b>')).toBe('&lt;b&gt;"pizza" &amp; co&lt;/b&gt;');
  });

  test("callback data stays inside Telegram's 64-byte cap", () => {
    // A Convex id is ~32 chars; "v:<id>:hate" must still fit, or every button
    // on every card silently stops working.
    const id = "k17abcdefghijklmnopqrstuvwxyz1234";
    for (const row of ballotKeyboard(id).inline_keyboard) {
      for (const button of row) {
        expect(new TextEncoder().encode(button.callback_data!).length).toBeLessThanOrEqual(64);
      }
    }
  });

  test("the menu labels are one constant, since the bot matches on them", () => {
    // A label written twice is a menu button that stops working when one copy
    // is edited. This asserts the shape the handler switches on.
    expect(Object.values(MENU)).toContain("🗳 Vote");
    expect(new Set(Object.values(MENU)).size).toBe(Object.values(MENU).length);
  });
});
