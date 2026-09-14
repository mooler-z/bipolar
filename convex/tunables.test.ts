/// <reference types="vite/client" />
import { convexTest } from "convex-test";
import { describe, expect, test } from "vitest";

import { DISCOVERY } from "./config";
import { api, internal } from "./_generated/api";
import type { Id } from "./_generated/dataModel";
import { TUNABLES, clampTo, sessionDue, tunableOf } from "./lib/tunables";
import type { Role } from "./lib/rbac";
import schema from "./schema";

/**
 * Settings an operator can change without a deploy.
 *
 * Two rules, and both of them are about what happens when somebody is wrong.
 * **The bounds are the server's**, because a page is not a control: a crawling
 * session set to run two thousand times a day would spend the Firecrawl quota
 * before breakfast, and the field that asked for it is not what should stop it.
 * **A change is a privileged write**, so it is an admin's to make and it leaves
 * a line naming what it was.
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

describe("the bounds belong to the server", () => {
  test("every setting has a default inside its own range", () => {
    for (const t of TUNABLES) {
      expect(t.min).toBeLessThanOrEqual(t.max);
      expect(t.fallback).toBeGreaterThanOrEqual(t.min);
      expect(t.fallback).toBeLessThanOrEqual(t.max);
    }
  });

  test("out of range is pulled back in, and a fraction is rounded", () => {
    const runs = tunableOf("discovery.runsPerDay")!;
    expect(clampTo(runs, 2000)).toBe(runs.max);
    expect(clampTo(runs, -4)).toBe(runs.min);
    expect(clampTo(runs, 6.4)).toBe(6);
    expect(clampTo(runs, Number.NaN)).toBe(runs.fallback);
  });

  test("a value the page would never send is still clamped when it arrives", async () => {
    const t = convexTest(schema, modules);
    await account(t, "boss", "admin");

    const out = await as(t, "boss").mutation(api.tunables.set, {
      key: "discovery.runsPerDay",
      value: 9_999,
    });
    expect(out.value).toBe(tunableOf("discovery.runsPerDay")!.max);

    const resolved = await t.query(internal.tunables.resolved, {});
    expect(resolved["discovery.runsPerDay"]).toBe(
      tunableOf("discovery.runsPerDay")!.max,
    );
  });

  test("a setting nobody has touched reads as the code value", async () => {
    const t = convexTest(schema, modules);
    const resolved = await t.query(internal.tunables.resolved, {});
    // An empty settings table has to behave exactly like the repository.
    expect(resolved["discovery.topicsPerRun"]).toBe(DISCOVERY.topicsPerRun);
    expect(resolved["discovery.runsPerDay"]).toBe(DISCOVERY.runsPerDay);
  });

  test("an unknown key is refused rather than quietly stored", async () => {
    const t = convexTest(schema, modules);
    await account(t, "boss", "admin");
    await expect(
      as(t, "boss").mutation(api.tunables.set, { key: "money.spark", value: 1 }),
    ).rejects.toThrow(/no such setting/i);
  });
});

describe("changing one is a privileged write", () => {
  test("a moderator cannot, an admin can, and the record says so", async () => {
    const t = convexTest(schema, modules);
    await account(t, "mod", "moderator");
    await account(t, "boss", "admin");

    await expect(
      as(t, "mod").mutation(api.tunables.set, {
        key: "discovery.runsPerDay",
        value: 12,
      }),
    ).rejects.toThrow(/settings manage/i);

    await as(t, "boss").mutation(api.tunables.set, {
      key: "discovery.runsPerDay",
      value: 12,
    });

    const log = await t.run(async (ctx) => await ctx.db.query("auditLog").collect());
    expect(log).toHaveLength(1);
    expect(log[0]!.action).toBe("settings.change");
    expect(log[0]!.metadata).toMatchObject({ was: DISCOVERY.runsPerDay, now: 12 });
  });

  test("resetting forgets the override rather than writing the old number", async () => {
    const t = convexTest(schema, modules);
    await account(t, "boss", "admin");
    const boss = as(t, "boss");

    await boss.mutation(api.tunables.set, { key: "discovery.runsPerDay", value: 12 });
    expect(
      (await boss.query(api.tunables.list, {})).find(
        (r) => r.key === "discovery.runsPerDay",
      ),
    ).toMatchObject({ value: 12, isDefault: false });

    await boss.mutation(api.tunables.reset, { key: "discovery.runsPerDay" });

    // The row is gone, not set back — so a later change to the repository is
    // what this deployment picks up.
    const rows = await t.run(async (ctx) => await ctx.db.query("settings").collect());
    expect(rows.filter((r) => r.key === "discovery.runsPerDay")).toHaveLength(0);
    expect(
      (await boss.query(api.tunables.list, {})).find(
        (r) => r.key === "discovery.runsPerDay",
      ),
    ).toMatchObject({ value: DISCOVERY.runsPerDay, isDefault: true });
  });
});

describe("the cadence is a setting, and the cron only ticks", () => {
  const hour = 3_600_000;

  test("a session that has never run is always due", () => {
    expect(sessionDue(null, 6, Date.now())).toBe(true);
  });

  test("six a day means the four-hour tick fires and the third does not", () => {
    const now = 1_000 * hour;
    expect(sessionDue(now - 3 * hour, 6, now)).toBe(false);
    expect(sessionDue(now - 4 * hour, 6, now)).toBe(true);
  });

  test("turning it up is felt on the next tick", () => {
    const now = 1_000 * hour;
    // Twelve a day is every two hours: the same gap that was too early at six
    // is now overdue, without anything being redeployed.
    expect(sessionDue(now - 3 * hour, 12, now)).toBe(true);
    expect(sessionDue(now - 1 * hour, 24, now)).toBe(true);
  });
});
