/// <reference types="vite/client" />
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
    const t = convexTest(schema, modules);
    await account(t, "reader", "user");
    await account(t, "mod", "moderator");

    // The most important shape in this file: the server refuses, rather than
    // the client hiding a link.
    await expect(as(t, "reader").query(api.adminUsers.list, {})).rejects.toThrow();
    expect((await as(t, "mod").query(api.adminUsers.list, {})).rows.length).toBeGreaterThan(0);
  });

  test("a creator can enter the console but not this section", async () => {
    const t = convexTest(schema, modules);
    await account(t, "maker", "creator");
    await expect(as(t, "maker").query(api.adminUsers.list, {})).rejects.toThrow(/users read/i);
  });
});

describe("never yourself, never upward", () => {
  test("an admin cannot suspend or demote their own account", async () => {
    const t = convexTest(schema, modules);
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
    const t = convexTest(schema, modules);
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
    const t = convexTest(schema, modules);
    await account(t, "mod", "moderator");
    const reader = await account(t, "reader", "user");
    await expect(
      as(t, "mod").mutation(api.adminUsers.setRole, { userId: reader, role: "creator" }),
    ).rejects.toThrow(/users set_role/i);
  });

  test("an admin cannot mint a peer", async () => {
    const t = convexTest(schema, modules);
    await account(t, "boss", "admin");
    const reader = await account(t, "reader", "user");
    // Promoting somebody and creating your own equal are different decisions.
    await expect(
      as(t, "boss").mutation(api.adminUsers.setRole, { userId: reader, role: "admin" }),
    ).rejects.toThrow(/at or above your own/i);
  });

  test("the list flags what the caller may act on, matching the mutations", async () => {
    const t = convexTest(schema, modules);
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
    const t = convexTest(schema, modules);
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
    const t = convexTest(schema, modules);
    await account(t, "boss", "admin");
    const reader = await account(t, "reader", "user");

    await as(t, "boss").mutation(api.adminUsers.setBanned, { userId: reader, banned: true });
    await as(t, "boss").mutation(api.adminUsers.setBanned, { userId: reader, banned: false });

    // Rule 8: the log appends. Nothing here ever removes what happened.
    const rows = await log(t);
    expect(rows.map((r) => r.action)).toEqual(["user.banned", "user.reinstated"]);
  });

  test("a role change records what it was before", async () => {
    const t = convexTest(schema, modules);
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
    const t = convexTest(schema, modules);
    await account(t, "boss", "admin");
    const reader = await account(t, "reader", "user");

    // Already active, already a user. A log full of non-events is a log nobody
    // reads, which is how the real entry gets missed.
    await as(t, "boss").mutation(api.adminUsers.setBanned, { userId: reader, banned: false });
    await as(t, "boss").mutation(api.adminUsers.setRole, { userId: reader, role: "user" });
    expect(await log(t)).toHaveLength(0);
  });

  test("an invented role is refused", async () => {
    const t = convexTest(schema, modules);
    await account(t, "boss", "admin");
    const reader = await account(t, "reader", "user");
    await expect(
      as(t, "boss").mutation(api.adminUsers.setRole, { userId: reader, role: "owner" }),
    ).rejects.toThrow(/no such role/i);
  });

  test("search and filters narrow to the right people", async () => {
    const t = convexTest(schema, modules);
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
