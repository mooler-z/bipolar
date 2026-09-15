/// <reference types="vite/client" />
import { register as registerRateLimiter } from "@convex-dev/rate-limiter/test";
import { convexTest } from "convex-test";
import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";

import { api } from "./_generated/api";
import type { Id } from "./_generated/dataModel";
import { mentioned, typing } from "./lib/mentions";
import schema from "./schema";

const modules = import.meta.glob("./**/*.ts");

beforeEach(() => vi.useFakeTimers());
afterEach(() => vi.useRealTimers());

function harness() {
  const t = convexTest(schema, modules);
  registerRateLimiter(t);
  return t;
}

/** One topic, ready to be argued about. */
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

async function talker(t: ReturnType<typeof harness>, subject: string, quills = 8) {
  const as = t.withIdentity({ subject, email: `${subject}@example.test` });
  const userId: Id<"users"> = await as.mutation(api.users.ensure, {});
  await t.finishAllScheduledFunctions(vi.runAllTimers);
  await t.run(async (ctx) => {
    await ctx.db.patch("users", userId, { quillBalance: quills });
  });
  return { as, userId };
}

/**
 * A mention is matched against the people in the thread, never parsed out of
 * the text. These hold the two things that buys: names with spaces in them
 * work, and a name nobody in the room has cannot be reached.
 */

const room = [
  { id: "a", name: "Sam" },
  { id: "b", name: "Sam Cole" },
  { id: "c", name: "Tiên Nguyễn" },
];

describe("who a line names", () => {
  test("a name with a space in it is one name", () => {
    expect(mentioned("@Sam Cole is wrong", room).map((p) => p.id)).toEqual(["b"]);
    // And the shorter name inside it is not also matched.
    expect(mentioned("@Sam Cole is wrong", room)).toHaveLength(1);
  });

  test("names outside the thread cannot be reached", () => {
    expect(mentioned("@Nobody at all", room)).toEqual([]);
  });

  test("an address is not a mention", () => {
    expect(mentioned("write to me@example.test", [{ id: "d", name: "example.test" }])).toEqual([]);
    // Because the picker is what decides; an @ mid-word is never a mention.
    expect(typing("me@exam", 7)).toBeNull();
  });

  test("the same person named twice is told once", () => {
    expect(mentioned("@Sam and @Sam again", room)).toHaveLength(1);
  });

  test("case does not matter, and non-Latin names work", () => {
    expect(mentioned("@tiên nguyễn what", room).map((p) => p.id)).toEqual(["c"]);
  });
});

describe("what is being typed", () => {
  test("the picker opens on an @ at a word start and closes on a sentence", () => {
    expect(typing("hey @sa", 7)).toEqual({ query: "sa", from: 4 });
    expect(typing("@", 1)).toEqual({ query: "", from: 0 });
    expect(typing("no mention here", 15)).toBeNull();
    expect(typing(`@${"x".repeat(41)}`, 42)).toBeNull();
  });
});

describe("a mention names somebody who is already here", () => {
  /** Give people names worth testing against: one with a space in it. */
  async function named(t: ReturnType<typeof harness>, subject: string, name: string) {
    const who = await talker(t, subject, 8);
    await t.run(async (ctx) => {
      await ctx.db.patch("users", who.userId, { displayName: name });
    });
    return who;
  }

  test("naming somebody in the thread rings their bell, once", async () => {
    const t = harness();
    const topicId = await seed(t);
    const { userId: sam } = await named(t, "sam", "Sam Cole");
    const { as: other } = await named(t, "other", "Rae");

    // Sam has to be in the thread before Sam can be named in it.
    await t.run(async (ctx) => {
      await ctx.db.insert("comments", { topicId, userId: sam, body: "Mine.", likes: 0 });
    });
    await other.mutation(api.comments.post, { topicId, body: "@Sam Cole is wrong, @Sam Cole." });

    const notices = await t.run(async (ctx) => await ctx.db.query("notifications").collect());
    expect(notices).toHaveLength(1);
    expect(notices[0]!.userId).toBe(sam);
    expect(notices[0]!.kind).toBe("mention");
  });

  test("a name nobody here has reaches nobody", async () => {
    const t = harness();
    const topicId = await seed(t);
    const { as } = await named(t, "solo", "Rae");
    await named(t, "elsewhere", "Ghost");

    // Ghost exists, but has said nothing here. A mention that could reach any
    // account in the database is a spam tool with a friendly icon.
    await as.mutation(api.comments.post, { topicId, body: "@Ghost you there?" });
    expect(
      await t.run(async (ctx) => await ctx.db.query("notifications").collect()),
    ).toHaveLength(0);
  });

  test("replying to somebody and naming them rings once, not twice", async () => {
    const t = harness();
    const topicId = await seed(t);
    const { as: sam, userId: samId } = await named(t, "sam", "Sam Cole");
    const { as: rae } = await named(t, "rae", "Rae");

    const parent = await sam.mutation(api.comments.post, { topicId, body: "Mine." });
    await rae.mutation(api.comments.post, {
      topicId,
      body: "@Sam Cole no.",
      parentId: parent,
    });

    const notices = await t.run(async (ctx) => await ctx.db.query("notifications").collect());
    expect(notices).toHaveLength(1);
    expect(notices[0]!.userId).toBe(samId);
    // The reply is the stronger fact, so that is the one told.
    expect(notices[0]!.kind).toBe("reply");
  });

  test("naming yourself tells nobody, and the roster never offers you", async () => {
    const t = harness();
    const topicId = await seed(t);
    const { as, userId } = await named(t, "solo", "Rae");

    await as.mutation(api.comments.post, { topicId, body: "First." });
    await as.mutation(api.comments.post, { topicId, body: "@Rae again." });
    expect(
      await t.run(async (ctx) => await ctx.db.query("notifications").collect()),
    ).toHaveLength(0);

    const roster = await as.query(api.commentThread.people, { slug: "pineapple" });
    expect(roster.some((p) => p.id === userId)).toBe(false);
  });

  test("the roster is everybody who has spoken here, and nobody who has not", async () => {
    const t = harness();
    const topicId = await seed(t);
    const { as: rae } = await named(t, "rae", "Rae");
    const { as: sam } = await named(t, "sam", "Sam Cole");
    await named(t, "silent", "Ghost");

    await sam.mutation(api.comments.post, { topicId, body: "Here." });
    const roster = await rae.query(api.commentThread.people, { slug: "pineapple" });
    expect(roster.map((p) => p.name)).toEqual(["Sam Cole"]);
  });
});
