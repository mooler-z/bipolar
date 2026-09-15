/// <reference types="vite/client" />
import { register as registerRateLimiter } from "@convex-dev/rate-limiter/test";
import { convexTest } from "convex-test";
import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";

import { api } from "./_generated/api";
import type { Id } from "./_generated/dataModel";
import { STRENGTH } from "./lib/affinity";
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

/** A seeded topic and somebody with quills to spend on it. */
async function voice(t: ReturnType<typeof harness>, subject: string) {
  const topicId = await seed(t);
  const { as, userId } = await talker(t, subject, 8);
  return { as, userId, topicId, slug: "pineapple" };
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

    const listed = await t.query(api.commentThread.list, { slug: "pineapple" });
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
    const listed = await t.query(api.commentThread.list, { slug: "pineapple" });
    expect(listed[0].body).toBe("It is a fruit.");
    expect(listed[0].canRemove).toBe(false);

    const page = await t.query(api.topics.bySlug, { slug: "pineapple" });
    expect(page!.topic.stats).toBeNull();
    expect(page!.topic.commentCount).toBe(1);
  });
});

describe("two hundred characters is the limit", () => {
  test("two hundred lands, two hundred and one is refused, and no quill is spent", async () => {
    const t = harness();
    const { as, topicId, userId } = await voice(t, "brief");

    await as.mutation(api.comments.post, { topicId, body: "x".repeat(200) });

    const before = await t.run(async (ctx) =>
      (await ctx.db.get("users", userId))!.quillBalance,
    );
    await expect(
      as.mutation(api.comments.post, { topicId, body: "x".repeat(201) }),
    ).rejects.toThrow(/200 characters or fewer/i);
    // The refusal happens before the money moves, exactly as the vote does it.
    const after = await t.run(async (ctx) =>
      (await ctx.db.get("users", userId))!.quillBalance,
    );
    expect(after).toBe(before);
  });
});

describe("replies go one level deep and no further", () => {
  test("a reply is filed under the line it answers", async () => {
    const t = harness();
    const { as, topicId } = await voice(t, "answerer");

    const parent = await as.mutation(api.comments.post, { topicId, body: "No." });
    const reply = await as.mutation(api.comments.post, {
      topicId,
      body: "Yes.",
      parentId: parent,
    });

    const row = await t.run(async (ctx) => await ctx.db.get("comments", reply));
    expect(row?.parentId).toBe(parent);
  });

  test("a reply to a reply is filed under the same parent", async () => {
    const t = harness();
    const { as, topicId } = await voice(t, "deep");

    const parent = await as.mutation(api.comments.post, { topicId, body: "One." });
    const reply = await as.mutation(api.comments.post, { topicId, body: "Two.", parentId: parent });
    const deeper = await as.mutation(api.comments.post, { topicId, body: "Three.", parentId: reply });

    // A thread that nests without limit is a thread nobody can read on a phone.
    const row = await t.run(async (ctx) => await ctx.db.get("comments", deeper));
    expect(row?.parentId).toBe(parent);
  });

  test("the thread comes back in thread order, parents oldest first", async () => {
    const t = harness();
    const { as, topicId, slug } = await voice(t, "reader");

    const a = await as.mutation(api.comments.post, { topicId, body: "First." });
    await as.mutation(api.comments.post, { topicId, body: "Second." });
    await as.mutation(api.comments.post, { topicId, body: "Under first.", parentId: a });

    const thread = await as.query(api.commentThread.list, { slug });
    expect(thread.map((r) => r.body)).toEqual(["First.", "Under first.", "Second."]);
    expect(thread.map((r) => r.depth)).toEqual([0, 1, 0]);
  });

  test("a line on another topic cannot be answered", async () => {
    const t = harness();
    const { as, topicId } = await voice(t, "crosser");
    const other = await t.run(async (ctx) => {
      const categoryId = (await ctx.db.query("categories").first())!._id;
      const author = (await ctx.db.query("users").first())!._id;
      return await ctx.db.insert("topics", {
        slug: "elsewhere", question: "Elsewhere?", categoryId, status: "active",
        isSensitive: false, isLocked: false, isFeatured: false, createdBy: author,
      });
    });
    const parent = await as.mutation(api.comments.post, { topicId: other, body: "There." });
    await expect(
      as.mutation(api.comments.post, { topicId, body: "Here.", parentId: parent }),
    ).rejects.toThrow(/another topic/i);
  });
});

describe("a like is free, and it is one per person", () => {
  test("a second tap takes it back rather than adding another", async () => {
    const t = harness();
    const { as, topicId, userId } = await voice(t, "liker");
    const commentId = await as.mutation(api.comments.post, { topicId, body: "Right." });

    const quills = await t.run(async (ctx) => (await ctx.db.get("users", userId))!.quillBalance);

    expect(await as.mutation(api.comments.like, { commentId })).toEqual({ liked: true, likes: 1 });
    expect(await as.mutation(api.comments.like, { commentId })).toEqual({ liked: false, likes: 0 });
    expect(await as.mutation(api.comments.like, { commentId })).toEqual({ liked: true, likes: 1 });

    // The count and the row move together: one row, one like.
    const rows = await t.run(async (ctx) => await ctx.db.query("commentLikes").collect());
    expect(rows).toHaveLength(1);
    // And it is free.
    expect(await t.run(async (ctx) => (await ctx.db.get("users", userId))!.quillBalance)).toBe(quills);
  });

  test("the reader sees their own like, and a removed line cannot be liked", async () => {
    const t = harness();
    const { as, topicId, slug } = await voice(t, "seer");
    const commentId = await as.mutation(api.comments.post, { topicId, body: "Mine." });
    await as.mutation(api.comments.like, { commentId });

    const [row] = await as.query(api.commentThread.list, { slug });
    expect(row).toMatchObject({ likes: 1, liked: true });

    await as.mutation(api.comments.remove, { commentId });
    await expect(as.mutation(api.comments.like, { commentId })).rejects.toThrow(/removed/i);
  });
});

describe("somebody is told, and never about their own act", () => {
  test("a reply tells the line it answers; a like tells whoever wrote it", async () => {
    const t = harness();
    const topicId = await seed(t);
    const { as: one, userId: mine } = await talker(t, "one", 8);
    const { as: two, userId: theirs } = await talker(t, "two", 8);

    const parent = await one.mutation(api.comments.post, { topicId, body: "Mine." });
    await two.mutation(api.comments.post, { topicId, body: "Answering.", parentId: parent });
    await two.mutation(api.comments.like, { commentId: parent });

    const notices = await t.run(async (ctx) => await ctx.db.query("notifications").collect());
    expect(notices).toHaveLength(2);
    // Both went to the author of the line, and both name who did it.
    expect(notices.every((n) => n.userId === mine)).toBe(true);
    expect(notices.every((n) => n.actorId === theirs)).toBe(true);
    expect(notices.map((n) => n.kind).sort()).toEqual(["like", "reply"]);
    expect(notices.find((n) => n.kind === "reply")?.excerpt).toBe("Answering.");
  });

  test("answering or liking yourself tells nobody", async () => {
    const t = harness();
    const topicId = await seed(t);
    const { as } = await talker(t, "alone", 8);

    const parent = await as.mutation(api.comments.post, { topicId, body: "One." });
    await as.mutation(api.comments.post, { topicId, body: "Two.", parentId: parent });
    await as.mutation(api.comments.like, { commentId: parent });

    // Being told what you just did is the fastest way to teach somebody that
    // the bell is worth ignoring.
    expect(await t.run(async (ctx) => await ctx.db.query("notifications").collect())).toHaveLength(0);
  });

  test("opening the bell reads everything, and nothing is deleted", async () => {
    const t = harness();
    const topicId = await seed(t);
    const { as: one } = await talker(t, "author", 8);
    const { as: two } = await talker(t, "reader", 8);

    const parent = await one.mutation(api.comments.post, { topicId, body: "Mine." });
    await two.mutation(api.comments.like, { commentId: parent });

    expect(await one.query(api.notifications.unread, {})).toBe(1);
    await one.mutation(api.notifications.markRead, {});
    expect(await one.query(api.notifications.unread, {})).toBe(0);

    const kept = await t.run(async (ctx) => await ctx.db.query("notifications").collect());
    expect(kept).toHaveLength(1);
    expect(kept[0]!.readAt).toBeDefined();

    // And the other person's bell was never rung.
    expect(await two.query(api.notifications.unread, {})).toBe(0);
  });
});

describe("the argument teaches the ranker", () => {
  test("taking a like back is written down, and pulls the weight back", async () => {
    const t = harness();
    const { as, topicId } = await voice(t, "fickle");
    const commentId = await as.mutation(api.comments.post, { topicId, body: "Sure." });

    await as.mutation(api.comments.like, { commentId });
    const afterLike = await t.run(async (ctx) =>
      (await ctx.db.query("userAffinity").collect()).find((w) => w.key.startsWith("cat:"))!.weight,
    );
    await as.mutation(api.comments.like, { commentId });
    const afterUnlike = await t.run(async (ctx) =>
      (await ctx.db.query("userAffinity").collect()).find((w) => w.key.startsWith("cat:"))!.weight,
    );

    // A weight that can rise but never fall is a weight that says nothing.
    expect(afterUnlike).toBeLessThan(afterLike);

    const kinds = await t.run(async (ctx) =>
      (await ctx.db.query("interactions").collect()).map((i) => i.kind),
    );
    expect(kinds).toEqual(["comment", "like", "unlike"]);
  });

  test("a reply and a like are written down, and a reply outweighs a like", async () => {
    const t = harness();
    const { as, topicId } = await voice(t, "teacher");

    const parent = await as.mutation(api.comments.post, { topicId, body: "One." });
    await as.mutation(api.comments.like, { commentId: parent });
    await as.mutation(api.comments.post, { topicId, body: "Two.", parentId: parent });

    const kinds = await t.run(async (ctx) =>
      (await ctx.db.query("interactions").collect()).map((i) => i.kind),
    );
    expect(kinds).toEqual(["comment", "like", "reply"]);
    expect(STRENGTH.reply.alpha).toBeGreaterThan(STRENGTH.like.alpha);
  });
});
