/// <reference types="vite/client" />
import { register as registerRateLimiter } from "@convex-dev/rate-limiter/test";
import { convexTest } from "convex-test";
import { describe, expect, test } from "vitest";

import { api } from "./_generated/api";
import type { Id } from "./_generated/dataModel";
import type { Role } from "./lib/rbac";
import schema from "./schema";

/**
 * The people console.
 *
 * Every other section of this console acts on topics. This one acts on
 * accounts, which is why it carries two guards a capability check cannot make
 * on its own: never yourself, and never anybody at or above your own rank.
 *
 * Both are the sort of rule that looks obviously true and is one refactor away
 * from being false, so both are hammered here — and so is the thing that makes
 * them auditable afterwards, which is that no write in this file can happen
 * without an `auditLog` row in the same mutation.
 */

const modules = import.meta.glob("./**/*.ts");

/** The rate limiter is a component, and a vote goes through it. */
function harness() {
  const t = convexTest(schema, modules);
  registerRateLimiter(t);
  return t;
}

async function account(
  t: ReturnType<typeof convexTest>,
  subject: string,
  role: Role,
): Promise<Id<"users">> {
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

function as(t: ReturnType<typeof convexTest>, subject: string) {
  return t.withIdentity({ subject, email: `${subject}@example.test` });
}

async function log(t: ReturnType<typeof convexTest>) {
  return await t.run(async (ctx) => await ctx.db.query("auditLog").collect());
}

describe("who may look", () => {
  test("a plain reader is refused, and a moderator is not", async () => {
    const t = harness();
    await account(t, "reader", "user");
    await account(t, "mod", "moderator");

    // The most important shape in this file: the server refuses, rather than
    // the client hiding a link.
    await expect(as(t, "reader").query(api.adminUsers.list, {})).rejects.toThrow();
    expect((await as(t, "mod").query(api.adminUsers.list, {})).rows.length).toBeGreaterThan(0);
  });

  test("a creator can enter the console but not this section", async () => {
    const t = harness();
    await account(t, "maker", "creator");
    await expect(as(t, "maker").query(api.adminUsers.list, {})).rejects.toThrow(/users read/i);
  });
});

describe("never yourself, never upward", () => {
  test("an admin cannot suspend or demote their own account", async () => {
    const t = harness();
    const boss = await account(t, "boss", "admin");

    await expect(
      as(t, "boss").mutation(api.adminUsers.setBanned, { userId: boss, banned: true }),
    ).rejects.toThrow(/your own account/i);
    await expect(
      as(t, "boss").mutation(api.adminUsers.setRole, { userId: boss, role: "user" }),
    ).rejects.toThrow(/your own account/i);
    expect(await log(t)).toHaveLength(0);
  });

  test("a moderator cannot suspend an admin, or another moderator", async () => {
    const t = harness();
    await account(t, "mod", "moderator");
    const boss = await account(t, "boss", "admin");
    const peer = await account(t, "peer", "moderator");

    for (const target of [boss, peer]) {
      await expect(
        as(t, "mod").mutation(api.adminUsers.setBanned, { userId: target, banned: true }),
      ).rejects.toThrow(/at or above yours/i);
    }
    expect(await log(t)).toHaveLength(0);
  });

  test("a moderator cannot hand out roles at all", async () => {
    const t = harness();
    await account(t, "mod", "moderator");
    const reader = await account(t, "reader", "user");
    await expect(
      as(t, "mod").mutation(api.adminUsers.setRole, { userId: reader, role: "creator" }),
    ).rejects.toThrow(/users set_role/i);
  });

  test("an admin cannot mint a peer", async () => {
    const t = harness();
    await account(t, "boss", "admin");
    const reader = await account(t, "reader", "user");
    // Promoting somebody and creating your own equal are different decisions.
    await expect(
      as(t, "boss").mutation(api.adminUsers.setRole, { userId: reader, role: "admin" }),
    ).rejects.toThrow(/at or above your own/i);
  });

  test("the list flags what the caller may act on, matching the mutations", async () => {
    const t = harness();
    await account(t, "mod", "moderator");
    await account(t, "boss", "admin");
    await account(t, "reader", "user");

    const rows = (await as(t, "mod").query(api.adminUsers.list, {})).rows;
    const by = new Map(rows.map((r) => [r.displayName, r.actionable]));
    expect(by.get("reader")).toBe(true);
    expect(by.get("mod")).toBe(false);
    expect(by.get("boss")).toBe(false);
  });
});

describe("what actually happens, and what it leaves behind", () => {
  test("a suspension sticks and is recorded against the name that made it", async () => {
    const t = harness();
    const boss = await account(t, "boss", "admin");
    const reader = await account(t, "reader", "user");

    await as(t, "boss").mutation(api.adminUsers.setBanned, {
      userId: reader,
      banned: true,
      reason: "spam",
    });

    const them = await t.run(async (ctx) => await ctx.db.get("users", reader));
    expect(them!.isBanned).toBe(true);

    const rows = await log(t);
    expect(rows).toHaveLength(1);
    expect(rows[0]!.action).toBe("user.banned");
    expect(rows[0]!.actorId).toBe(boss);
    expect(rows[0]!.targetId).toBe(reader);
    expect((rows[0]!.metadata as { reason?: string }).reason).toBe("spam");
  });

  test("reinstating is its own recorded act, not an erasure of the first", async () => {
    const t = harness();
    await account(t, "boss", "admin");
    const reader = await account(t, "reader", "user");

    await as(t, "boss").mutation(api.adminUsers.setBanned, { userId: reader, banned: true });
    await as(t, "boss").mutation(api.adminUsers.setBanned, { userId: reader, banned: false });

    // Rule 8: the log appends. Nothing here ever removes what happened.
    const rows = await log(t);
    expect(rows.map((r) => r.action)).toEqual(["user.banned", "user.reinstated"]);
  });

  test("a role change records what it was before", async () => {
    const t = harness();
    await account(t, "boss", "admin");
    const reader = await account(t, "reader", "user");

    await as(t, "boss").mutation(api.adminUsers.setRole, { userId: reader, role: "moderator" });

    const them = await t.run(async (ctx) => await ctx.db.get("users", reader));
    expect(them!.role).toBe("moderator");

    const rows = await log(t);
    expect(rows[0]!.action).toBe("user.role_set");
    expect(rows[0]!.metadata).toMatchObject({ was: "user", now: "moderator" });
  });

  test("a no-op writes nothing at all", async () => {
    const t = harness();
    await account(t, "boss", "admin");
    const reader = await account(t, "reader", "user");

    // Already active, already a user. A log full of non-events is a log nobody
    // reads, which is how the real entry gets missed.
    await as(t, "boss").mutation(api.adminUsers.setBanned, { userId: reader, banned: false });
    await as(t, "boss").mutation(api.adminUsers.setRole, { userId: reader, role: "user" });
    expect(await log(t)).toHaveLength(0);
  });

  test("an invented role is refused", async () => {
    const t = harness();
    await account(t, "boss", "admin");
    const reader = await account(t, "reader", "user");
    await expect(
      as(t, "boss").mutation(api.adminUsers.setRole, { userId: reader, role: "owner" }),
    ).rejects.toThrow(/no such role/i);
  });

  test("search and filters narrow to the right people", async () => {
    const t = harness();
    await account(t, "mod", "moderator");
    await account(t, "alice", "user");
    const bob = await account(t, "bob", "creator");
    await as(t, "mod").mutation(api.adminUsers.setBanned, { userId: bob, banned: true });

    const byName = await as(t, "mod").query(api.adminUsers.list, { search: "ali" });
    expect(byName.rows.map((r) => r.displayName)).toEqual(["alice"]);

    const banned = await as(t, "mod").query(api.adminUsers.list, { standing: "banned" });
    expect(banned.rows.map((r) => r.displayName)).toEqual(["bob"]);

    const creators = await as(t, "mod").query(api.adminUsers.list, { role: "creator" });
    expect(creators.rows.map((r) => r.displayName)).toEqual(["bob"]);
  });
});

describe("a suspension locks everything, not just voting", () => {
  /** A signed-in account, suspended, with a topic to fail against. */
  async function locked(t: ReturnType<typeof convexTest>) {
    const boss = await account(t, "boss", "admin");
    const them = await account(t, "them", "user");
    await as(t, "boss").mutation(api.adminUsers.setBanned, { userId: them, banned: true });

    const topicId = await t.run(async (ctx) => {
      const categoryId = await ctx.db.insert("categories", { slug: "food", name: "Food" });
      const id = await ctx.db.insert("topics", {
        slug: "pineapple",
        question: "Pineapple on pizza?",
        categoryId,
        status: "active",
        isSensitive: false,
        isLocked: false,
        isFeatured: false,
        createdBy: boss,
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
    await t.run(async (ctx) => {
      await ctx.db.patch("users", them, { quillBalance: 5, walletBalanceCents: 500 });
    });
    return { them, topicId };
  }

  test("every ordinary write is refused, and says the account is the reason", async () => {
    const t = harness();
    const { topicId } = await locked(t);
    const me = as(t, "them");

    /* The refusal is one check on `requireUser`, which every write passes
       through — so this asserts the whole surface, not one mutation. The
       wording matters too: telling somebody commenting that they "cannot vote"
       sends them looking in the wrong place. */
    for (const attempt of [
      () => me.mutation(api.votes.cast, { topicId, choice: "love", voteType: "free" }),
      () => me.mutation(api.votes.skip, { topicId }),
      () => me.mutation(api.votes.peek, { topicId }),
      () => me.mutation(api.comments.post, { topicId, body: "hi" }),
      () => me.mutation(api.users.setDigestOptIn, { optIn: false }),
      () => me.mutation(api.users.setSkipReveal, { skip: true }),
      () => me.mutation(api.users.setCountry, { countryCode: "GB" }),
    ]) {
      await expect(attempt()).rejects.toThrow(/suspended/i);
    }
  });

  test("onboarding is refused too, though it cannot use the same guard", async () => {
    const t = harness();
    await locked(t);
    /* `interests.save` has to create the row for a first-run reader, so it
       cannot call `requireUser` — and that exemption is exactly how a
       suspended account kept a write that reshapes its own feed. */
    await expect(
      as(t, "them").mutation(api.interests.save, {
        countryCode: "GB",
        categorySlugs: ["food"],
      }),
    ).rejects.toThrow(/suspended/i);
  });

  test("nothing was written by any of it", async () => {
    const t = harness();
    const { topicId } = await locked(t);
    const me = as(t, "them");
    await me.mutation(api.votes.cast, { topicId, choice: "love", voteType: "free" }).catch(() => {});
    await me.mutation(api.comments.post, { topicId, body: "hi" }).catch(() => {});

    expect(await t.run(async (ctx) => await ctx.db.query("votes").collect())).toHaveLength(0);
    expect(await t.run(async (ctx) => await ctx.db.query("comments").collect())).toHaveLength(0);
  });

  test("the account can still see that it is suspended, and read", async () => {
    const t = harness();
    await locked(t);
    const me = as(t, "them");

    /* `users.ensure` stays open on purpose: it is called on every load, and
       blocking it would break the very screen that explains the suspension. It
       cannot rename anybody — an existing row is returned untouched. */
    await expect(me.mutation(api.users.ensure, { displayName: "Renamed" })).resolves.toBeDefined();
    const who = await me.query(api.users.me, {});
    expect(who!.isBanned).toBe(true);
    expect(who!.displayName).toBe("them");
  });

  test("reinstating gives everything back", async () => {
    const t = harness();
    const { them, topicId } = await locked(t);
    await as(t, "boss").mutation(api.adminUsers.setBanned, { userId: them, banned: false });

    await expect(
      as(t, "them").mutation(api.votes.cast, { topicId, choice: "love", voteType: "free" }),
    ).resolves.toBeDefined();
  });
});
