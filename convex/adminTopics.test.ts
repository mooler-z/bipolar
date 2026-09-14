/// <reference types="vite/client" />
import { convexTest } from "convex-test";
import { describe, expect, test } from "vitest";

import { api, internal } from "./_generated/api";
import type { Id } from "./_generated/dataModel";
import type { Role } from "./lib/rbac";
import schema from "./schema";

/**
 * The topic console's guarantees.
 *
 * Four rules, each with a test that has been watched failing:
 *
 * - a role may only reach what its capabilities allow;
 * - a **creator** may only act on what it wrote, which no permission check can
 *   see and so is the easiest of the four to lose in a refactor;
 * - featuring is exclusive — two featured topics means the ranker's weight
 *   stops meaning anything;
 * - every privileged write leaves an audit row **in the same mutation**.
 */

const modules = import.meta.glob("./**/*.ts");
type T = ReturnType<typeof convexTest>;

async function account(t: T, subject: string, role: Role): Promise<Id<"users">> {
  return await t.run(async (ctx) =>
    ctx.db.insert("users", {
      authId: subject,
      email: `${subject}@example.test`,
      displayName: subject,
      walletBalanceCents: 0,
      quillBalance: 0,
      role,
      isBanned: false,
      profilePublic: false,
      topicsBacked: 0,
      digestOptIn: false,
    }),
  );
}

const as = (t: T, subject: string) =>
  t.withIdentity({ subject, email: `${subject}@example.test` });

async function topic(
  t: T,
  by: Id<"users">,
  slug: string,
  extra: { status?: "draft" | "active" | "archived"; featured?: boolean } = {},
): Promise<Id<"topics">> {
  return await t.run(async (ctx) => {
    const categoryId =
      (await ctx.db.query("categories").first())?._id ??
      (await ctx.db.insert("categories", { slug: "food", name: "Food" }));
    const id = await ctx.db.insert("topics", {
      slug,
      question: `${slug}?`,
      categoryId,
      status: extra.status ?? "active",
      isSensitive: false,
      isLocked: false,
      isFeatured: extra.featured ?? false,
      createdBy: by,
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
}

const auditRows = (t: T) => t.run(async (ctx) => ctx.db.query("auditLog").collect());

describe("who may reach the console", () => {
  test("a plain user cannot even list", async () => {
    const t = convexTest(schema, modules);
    await account(t, "reader", "user");
    await expect(as(t, "reader").query(api.adminTopics.list, {})).rejects.toThrow(
      /staff/i,
    );
  });

  test("a creator may list and edit but may not archive", async () => {
    const t = convexTest(schema, modules);
    const id = await account(t, "maker", "creator");
    const topicId = await topic(t, id, "pineapple");

    await expect(as(t, "maker").query(api.adminTopics.list, {})).resolves.toBeTruthy();
    await expect(
      as(t, "maker").mutation(api.adminTopics.setStatus, {
        topicId,
        status: "archived",
      }),
    ).rejects.toThrow(/cannot topics archive/i);
  });

  test("a moderator may archive", async () => {
    const t = convexTest(schema, modules);
    const author = await account(t, "maker", "creator");
    await account(t, "mod", "moderator");
    const topicId = await topic(t, author, "pineapple");

    await as(t, "mod").mutation(api.adminTopics.setStatus, {
      topicId,
      status: "archived",
    });
    const after = await t.run(async (ctx) => ctx.db.get(topicId));
    expect(after?.status).toBe("archived");
  });
});

describe("a creator only touches its own work", () => {
  test("someone else's topic is refused", async () => {
    const t = convexTest(schema, modules);
    const mine = await account(t, "maker", "creator");
    const theirs = await account(t, "other", "creator");
    const notMine = await topic(t, theirs, "not-mine");
    const isMine = await topic(t, mine, "is-mine");

    await expect(
      as(t, "maker").mutation(api.adminTopics.edit, {
        topicId: notMine,
        question: "Rewritten by a stranger?",
      }),
    ).rejects.toThrow(/only change topics they wrote/i);

    await expect(
      as(t, "maker").mutation(api.adminTopics.edit, {
        topicId: isMine,
        question: "Rewritten by its author?",
      }),
    ).resolves.toBeTruthy();
  });

  test("a moderator is not bound by authorship", async () => {
    const t = convexTest(schema, modules);
    const author = await account(t, "maker", "creator");
    await account(t, "mod", "moderator");
    const topicId = await topic(t, author, "theirs");

    await expect(
      as(t, "mod").mutation(api.adminTopics.edit, {
        topicId,
        question: "Edited by a moderator?",
      }),
    ).resolves.toBeTruthy();
  });
});

describe("featuring is exclusive", () => {
  test("promoting one demotes the other, in the same mutation", async () => {
    const t = convexTest(schema, modules);
    const id = await account(t, "mod", "moderator");
    const first = await topic(t, id, "first", { featured: true });
    const second = await topic(t, id, "second");

    const out = await as(t, "mod").mutation(api.adminTopics.setFeatured, {
      topicId: second,
      featured: true,
    });
    expect(out.demoted).toBe(1);

    const rows = await t.run(async (ctx) => [
      await ctx.db.get(first),
      await ctx.db.get(second),
    ]);
    expect(rows[0]?.isFeatured).toBe(false);
    expect(rows[1]?.isFeatured).toBe(true);
  });

  test("archiving a featured topic un-features it", async () => {
    const t = convexTest(schema, modules);
    const id = await account(t, "mod", "moderator");
    const topicId = await topic(t, id, "hot", { featured: true });

    await as(t, "mod").mutation(api.adminTopics.setStatus, {
      topicId,
      status: "archived",
    });
    const after = await t.run(async (ctx) => ctx.db.get(topicId));
    // The ranker weights isFeatured; a dead row must not keep the weight.
    expect(after?.isFeatured).toBe(false);
  });

  test("an unpublished topic cannot be featured", async () => {
    const t = convexTest(schema, modules);
    const id = await account(t, "mod", "moderator");
    const topicId = await topic(t, id, "draft-one", { status: "draft" });

    await expect(
      as(t, "mod").mutation(api.adminTopics.setFeatured, {
        topicId,
        featured: true,
      }),
    ).rejects.toThrow(/published/i);
  });
});

describe("nothing privileged happens unrecorded", () => {
  test("archive, lock, feature and edit each leave a row", async () => {
    const t = convexTest(schema, modules);
    const id = await account(t, "mod", "moderator");
    const topicId = await topic(t, id, "pineapple");
    const caller = as(t, "mod");

    await caller.mutation(api.adminTopics.setLocked, { topicId, locked: true });
    await caller.mutation(api.adminTopics.setFeatured, { topicId, featured: true });
    await caller.mutation(api.adminTopics.edit, {
      topicId,
      question: "A better question?",
    });
    await caller.mutation(api.adminTopics.setStatus, { topicId, status: "archived" });

    const rows = await auditRows(t);
    expect(rows.map((r) => r.action).sort()).toEqual([
      "topic.edit",
      "topic.feature",
      "topic.lock",
      "topic.status",
    ]);
    // The actor is named on every one — an anonymous audit row is not an audit.
    expect(rows.every((r) => r.actorId === id)).toBe(true);
  });

  test("a refused write leaves no row at all", async () => {
    const t = convexTest(schema, modules);
    const author = await account(t, "maker", "creator");
    await account(t, "other", "creator");
    const topicId = await topic(t, author, "theirs");

    await expect(
      as(t, "other").mutation(api.adminTopics.setLocked, { topicId, locked: true }),
    ).rejects.toThrow();
    expect(await auditRows(t)).toHaveLength(0);
  });
});

describe("the question rules hold on every path", () => {
  test("an edit cannot smuggle in a question the importer would reject", async () => {
    const t = convexTest(schema, modules);
    const id = await account(t, "mod", "moderator");
    const topicId = await topic(t, id, "pineapple");

    for (const bad of ["Too short", "No question mark", "x".repeat(80) + "?"]) {
      await expect(
        as(t, "mod").mutation(api.adminTopics.edit, { topicId, question: bad }),
      ).rejects.toThrow(/8-70 characters/);
    }
  });
});

describe("who decides what the public sees", () => {
  test("a creator may draft but may not publish", async () => {
    const t = convexTest(schema, modules);
    const id = await account(t, "maker", "creator");
    const topicId = await topic(t, id, "mine", { status: "draft" });

    // Its own draft, its own topic — and still not its call.
    await expect(
      as(t, "maker").mutation(api.adminTopics.setStatus, {
        topicId,
        status: "active",
      }),
    ).rejects.toThrow(/cannot topics publish/i);

    await expect(
      as(t, "maker").mutation(api.adminTopics.setStatus, {
        topicId,
        status: "draft",
      }),
    ).resolves.toBeTruthy();
  });

  test("a moderator approves", async () => {
    const t = convexTest(schema, modules);
    const author = await account(t, "maker", "creator");
    await account(t, "mod", "moderator");
    const topicId = await topic(t, author, "pending", { status: "draft" });

    await as(t, "mod").mutation(api.adminTopics.setStatus, {
      topicId,
      status: "active",
    });
    expect((await t.run(async (ctx) => ctx.db.get(topicId)))?.status).toBe("active");
  });
});

describe("discovery mode decides where new topics land", () => {
  test("auto is the default, and it publishes", async () => {
    const t = convexTest(schema, modules);
    await account(t, "mod", "moderator");
    const view = await as(t, "mod").query(api.settings.discovery, {});
    expect(view.mode).toBe("auto");
    // Derived from the cadence, never typed twice.
    expect(view.runsPerDay).toBe(Math.round(24 / view.everyHours));
  });

  test("only an admin may flip it, and the flip is recorded", async () => {
    const t = convexTest(schema, modules);
    await account(t, "mod", "moderator");
    const adminId = await account(t, "boss", "admin");

    await expect(
      as(t, "mod").mutation(api.settings.setDiscoveryMode, { mode: "review" }),
    ).rejects.toThrow(/cannot settings manage/i);

    await as(t, "boss").mutation(api.settings.setDiscoveryMode, { mode: "review" });
    expect((await as(t, "boss").query(api.settings.discovery, {})).mode).toBe("review");

    const rows = await auditRows(t);
    expect(rows).toHaveLength(1);
    expect(rows[0]).toMatchObject({
      action: "settings.discovery",
      actorId: adminId,
      metadata: { was: "auto", now: "review" },
    });
  });

  test("in review, a crawled topic lands as a draft", async () => {
    const t = convexTest(schema, modules);
    await account(t, "boss", "admin");
    await as(t, "boss").mutation(api.settings.setDiscoveryMode, { mode: "review" });

    const topicId = await t.mutation(internal.ingestStore.mint, {
      question: "A crawled question?",
      description: "Found on the live web.",
      category: "culture",
      tags: ["one"],
      polarizing: 70,
      sensitive: false,
      sourceUrl: "https://example.test/a",
      sourceTitle: "A headline",
    });

    const row = await t.run(async (ctx) => ctx.db.get(topicId));
    // The whole point: the crawler proposes, it does not publish.
    expect(row?.status).toBe("draft");
  });

  test("in auto, the same topic goes straight live", async () => {
    const t = convexTest(schema, modules);
    const topicId = await t.mutation(internal.ingestStore.mint, {
      question: "Another crawled question?",
      description: "Found on the live web.",
      category: "culture",
      tags: ["one"],
      polarizing: 70,
      sensitive: false,
      sourceUrl: "https://example.test/b",
      sourceTitle: "A headline",
    });
    expect((await t.run(async (ctx) => ctx.db.get(topicId)))?.status).toBe("active");
  });
});
