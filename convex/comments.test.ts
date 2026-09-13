/// <reference types="vite/client" />
import { register as registerRateLimiter } from "@convex-dev/rate-limiter/test";
import { convexTest } from "convex-test";
import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";

import { api } from "./_generated/api";
import type { Id } from "./_generated/dataModel";
import schema from "./schema";

/**
 * A comment costs a quill, and a removal never gives it back.
 *
 * Both halves matter. The spend is what keeps a comment worth something; the
 * soft delete is what keeps the spend provable after the words are gone.
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

async function talker(
  t: ReturnType<typeof harness>,
  subject: string,
  quills = 3,
) {
  const as = t.withIdentity({ subject, email: `${subject}@example.test` });
  const userId: Id<"users"> = await as.mutation(api.users.ensure, {});
  await t.finishAllScheduledFunctions(vi.runAllTimers);
  await t.run(async (ctx) => {
    await ctx.db.patch("users", userId, { quillBalance: quills });
  });
  return { as, userId };
}

describe("one quill, one comment", () => {
  test("posting spends exactly one and counts it", async () => {
    const t = harness();
    const topicId = await seed(t);
    const { as, userId } = await talker(t, "a");

    await as.mutation(api.comments.post, { topicId, body: "Absolutely not." });

    const state = await t.run(async (ctx) => ({
      user: await ctx.db.get("users", userId),
      rows: await ctx.db.query("comments").collect(),
      stats: await ctx.db.query("topicStats").collect(),
    }));
    expect(state.user?.quillBalance).toBe(2);
    expect(state.rows).toHaveLength(1);
    // The counter moves in the same transaction as the row it counts.
    expect(state.stats[0].comments).toBe(1);
  });

  test("a balance of zero cannot comment, and writes nothing", async () => {
    const t = harness();
    const topicId = await seed(t);
    const { as, userId } = await talker(t, "b", 0);

    await expect(
      as.mutation(api.comments.post, { topicId, body: "Let me in." }),
    ).rejects.toThrow(/quill/i);

    const state = await t.run(async (ctx) => ({
      user: await ctx.db.get("users", userId),
      rows: await ctx.db.query("comments").collect(),
      stats: await ctx.db.query("topicStats").collect(),
    }));
    expect(state.user?.quillBalance).toBe(0);
    expect(state.rows).toHaveLength(0);
    expect(state.stats[0].comments).toBe(0);
  });

  test("an empty comment is refused and costs nothing", async () => {
    const t = harness();
    const topicId = await seed(t);
    const { as, userId } = await talker(t, "c");

    await expect(
      as.mutation(api.comments.post, { topicId, body: "   " }),
    ).rejects.toThrow();
    expect(
      (await t.run(async (ctx) => await ctx.db.get("users", userId)))
        ?.quillBalance,
    ).toBe(3);
  });
});

describe("removal is soft, and final", () => {
  test("the row survives, the words do not, and the quill is not refunded", async () => {
    const t = harness();
    const topicId = await seed(t);
    const { as, userId } = await talker(t, "d");

    const commentId = await as.mutation(api.comments.post, {
      topicId,
      body: "I regret this already.",
    });
    await as.mutation(api.comments.remove, { commentId });

    const state = await t.run(async (ctx) => ({
      row: await ctx.db.get("comments", commentId),
      user: await ctx.db.get("users", userId),
      stats: await ctx.db.query("topicStats").collect(),
    }));
    // Rule 8: the row is the record of a quill spent. It stays.
    expect(state.row).not.toBeNull();
    expect(state.row?.body).toBe("I regret this already.");
    expect(state.row?.deletedAt).toBeGreaterThan(0);
    expect(state.user?.quillBalance).toBe(2);
    // The count is of what was said here. A removal does not unsay it.
    expect(state.stats[0].comments).toBe(1);

    const listed = await t.query(api.comments.list, { slug: "pineapple" });
    expect(listed).toHaveLength(1);
    expect(listed[0].body).toBeNull();
  });

  test("a stranger cannot remove somebody else's comment", async () => {
    const t = harness();
    const topicId = await seed(t);
    const { as: author } = await talker(t, "e");
    const { as: stranger } = await talker(t, "f");

    const commentId = await author.mutation(api.comments.post, {
      topicId,
      body: "Mine.",
    });
    await expect(
      stranger.mutation(api.comments.remove, { commentId }),
    ).rejects.toThrow(/not yours/i);
  });

  test("a moderator can, and the removal is audited", async () => {
    const t = harness();
    const topicId = await seed(t);
    const { as: author } = await talker(t, "g");
    const { as: mod, userId: modId } = await talker(t, "h");
    await t.run(async (ctx) => {
      await ctx.db.patch("users", modId, { role: "moderator" });
    });

    const commentId = await author.mutation(api.comments.post, {
      topicId,
      body: "Something worth removing.",
    });
    await mod.mutation(api.comments.remove, { commentId });

    const audit = await t.run(async (ctx) =>
      await ctx.db.query("auditLog").collect(),
    );
    expect(audit).toHaveLength(1);
    expect(audit[0]).toMatchObject({
      actorId: modId,
      action: "comment.removed",
      targetType: "comments",
      targetId: commentId,
    });
  });
});

describe("comments are not behind the gate", () => {
  test("a reader who has not voted still sees the argument", async () => {
    const t = harness();
    const topicId = await seed(t);
    const { as } = await talker(t, "i");
    await as.mutation(api.comments.post, { topicId, body: "It is a fruit." });

    // Signed out entirely: the opinions are readable, the tally is not.
    const listed = await t.query(api.comments.list, { slug: "pineapple" });
    expect(listed[0].body).toBe("It is a fruit.");
    expect(listed[0].canRemove).toBe(false);

    const page = await t.query(api.topics.bySlug, { slug: "pineapple" });
    expect(page!.topic.stats).toBeNull();
    expect(page!.topic.commentCount).toBe(1);
  });
});
