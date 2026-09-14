/// <reference types="vite/client" />
import { convexTest } from "convex-test";
import { describe, expect, test } from "vitest";

import { api } from "./_generated/api";
import type { Id } from "./_generated/dataModel";
import {
  ROLES,
  hasPermission,
  isStaff,
  permissionsFor,
  roleAtLeast,
  type Role,
} from "./lib/rbac";
import schema from "./schema";

/**
 * The console's gate.
 *
 * Rule 6: a rule with nothing enforcing it is a suggestion. The rule here is
 * *"a role may only reach what its capabilities allow"*, and it has two halves
 * that both have to hold — the table says the right thing, and the server
 * actually refuses. Hiding a link proves neither.
 *
 * The most important test in this file is the one that calls a privileged query
 * **as a plain user and expects it to throw.**
 */

const modules = import.meta.glob("./**/*.ts");

async function account(
  t: ReturnType<typeof convexTest>,
  subject: string,
  role: Role,
  extra: { isBanned?: boolean } = {},
): Promise<Id<"users">> {
  return await t.run(async (ctx) =>
    ctx.db.insert("users", {
      authId: subject,
      email: `${subject}@example.test`,
      displayName: subject,
      walletBalanceCents: 0,
      quillBalance: 0,
      role,
      isBanned: extra.isBanned ?? false,
      profilePublic: false,
      topicsBacked: 0,
      digestOptIn: false,
    }),
  );
}

function as(t: ReturnType<typeof convexTest>, subject: string) {
  return t.withIdentity({ subject, email: `${subject}@example.test` });
}

describe("the permission table", () => {
  test("a plain user holds nothing", () => {
    expect(permissionsFor("user")).toEqual([]);
    expect(isStaff("user")).toBe(false);
  });

  test("every tier is a superset of the one below it", () => {
    for (let i = 1; i < ROLES.length; i++) {
      const lower = permissionsFor(ROLES[i - 1]!);
      const higher = permissionsFor(ROLES[i]!);
      for (const p of lower) expect(higher).toContain(p);
      expect(higher.length).toBeGreaterThan(lower.length);
    }
  });

  test("the tiers that matter hold the capabilities they are for", () => {
    expect(hasPermission("creator", "topics:create")).toBe(true);
    expect(hasPermission("creator", "topics:archive")).toBe(false);
    expect(hasPermission("moderator", "topics:archive")).toBe(true);
    expect(hasPermission("moderator", "users:set_role")).toBe(false);
    expect(hasPermission("admin", "users:set_role")).toBe(true);
    expect(hasPermission("admin", "audit:read")).toBe(true);
  });

  test("every staff role can open the dashboard", () => {
    for (const role of ROLES) {
      expect(hasPermission(role, "dashboard:view")).toBe(isStaff(role));
    }
  });

  test("rank orders the hierarchy", () => {
    expect(roleAtLeast("admin", "creator")).toBe(true);
    expect(roleAtLeast("creator", "moderator")).toBe(false);
  });
});

describe("the server refuses, not the screen", () => {
  test("a signed-out reader is not staff", async () => {
    const t = convexTest(schema, modules);
    expect(await t.query(api.admin.me, {})).toBeNull();
    await expect(t.query(api.admin.dashboard, {})).rejects.toThrow(/sign in/i);
  });

  test("a plain user is refused the dashboard", async () => {
    const t = convexTest(schema, modules);
    await account(t, "reader", "user");
    expect(await as(t, "reader").query(api.admin.me, {})).toBeNull();
    await expect(
      as(t, "reader").query(api.admin.dashboard, {}),
    ).rejects.toThrow(/staff/i);
  });

  test("a banned staff account is refused", async () => {
    const t = convexTest(schema, modules);
    await account(t, "rogue", "admin", { isBanned: true });
    expect(await as(t, "rogue").query(api.admin.me, {})).toBeNull();
    await expect(
      as(t, "rogue").query(api.admin.dashboard, {}),
    ).rejects.toThrow(/suspended/i);
  });

  test("a creator is let in and told exactly what it holds", async () => {
    const t = convexTest(schema, modules);
    await account(t, "maker", "creator");
    const identity = await as(t, "maker").query(api.admin.me, {});
    expect(identity?.role).toBe("creator");
    expect(identity?.permissions).toContain("topics:create");
    expect(identity?.permissions).not.toContain("users:ban");
    await expect(
      as(t, "maker").query(api.admin.dashboard, {}),
    ).resolves.toBeTruthy();
  });
});

describe("the dashboard counts", () => {
  test("it reports topics by status, votes by layer, and the featured topic", async () => {
    const t = convexTest(schema, modules);
    const adminId = await account(t, "boss", "admin");

    await t.run(async (ctx) => {
      const categoryId = await ctx.db.insert("categories", {
        slug: "food",
        name: "Food",
      });
      const mk = async (slug: string, status: "draft" | "active" | "archived", featured = false) =>
        ctx.db.insert("topics", {
          slug,
          question: `${slug}?`,
          categoryId,
          status,
          isSensitive: false,
          isLocked: false,
          isFeatured: featured,
          createdBy: adminId,
        });
      const live = await mk("pineapple", "active", true);
      await mk("draft-one", "draft");
      await mk("gone", "archived");
      await ctx.db.insert("topicStats", {
        topicId: live,
        freeLove: 3,
        freeHate: 1,
        paidLove: 2,
        paidHate: 0,
        stakedCents: 100,
        skips: 0,
        comments: 4,
      });
      await ctx.db.insert("countryTopicStats", {
        topicId: live,
        countryCode: "ET",
        freeLove: 3,
        freeHate: 1,
        paidLove: 2,
        paidHate: 0,
      });
    });

    const data = await as(t, "boss").query(api.admin.dashboard, {});
    expect(data.topics).toMatchObject({ active: 1, draft: 1, archived: 1 });
    expect(data.votes).toEqual({ free: 4, paid: 2 });
    expect(data.stakedCents).toBe(100);
    expect(data.comments).toBe(4);
    expect(data.countries).toBe(1);
    expect(data.featured?.slug).toBe("pineapple");
    expect(data.users.total).toBe(1);
    expect(data.users.last7d).toBe(1);
  });
});
