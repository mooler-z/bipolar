/// <reference types="vite/client" />
import { register as registerRateLimiter } from "@convex-dev/rate-limiter/test";
import { convexTest } from "convex-test";
import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";

import { api } from "./_generated/api";
import type { Id } from "./_generated/dataModel";
import type { Role } from "./lib/rbac";
import schema from "./schema";

/**
 * Firing a session from the console.
 *
 * Two rules. It is an admin's button and nobody else's — a moderator who can
 * publish what the crawler proposes is not thereby someone who can make it go
 * out and spend the search quota. And it is one at a time: a second press
 * while a session is out would spend the same searches twice and mint the
 * same wave against itself.
 *
 * The run row is opened by the button, before the action wakes, so the
 * console has something to watch from the first millisecond. The story is
 * told from inside the session; with no API keys the story is one line long,
 * and that line is what these tests can see.
 */

const modules = import.meta.glob("./**/*.ts");

beforeEach(() => vi.useFakeTimers());
afterEach(() => vi.useRealTimers());

function harness() {
  const t = convexTest(schema, modules);
  registerRateLimiter(t);
  return t;
}

async function account(t: ReturnType<typeof harness>, subject: string, role: Role) {
  const userId: Id<"users"> = await t.run(async (ctx) =>
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
  return { userId, as: t.withIdentity({ subject, email: `${subject}@example.test` }) };
}

describe("the button is an admin's", () => {
  test("a moderator cannot fire a session, and nobody signed out can watch one", async () => {
    const t = harness();
    const mod = await account(t, "mod", "moderator");
    await expect(mod.as.mutation(api.adminQueue.fire, {})).rejects.toThrow(/ingest run/i);

    const boss = await account(t, "boss", "admin");
    const runId = await boss.as.mutation(api.adminQueue.fire, {});
    await expect(t.query(api.adminQueue.events, { runId })).rejects.toThrow();
  });

  test("the row is open before the session wakes, and says who pressed it", async () => {
    const t = harness();
    const boss = await account(t, "boss", "admin");
    const runId = await boss.as.mutation(api.adminQueue.fire, {});

    const row = await t.run(async (ctx) => ctx.db.get("ingestRuns", runId));
    expect(row?.seq).toBe(1);
    expect(row?.startedBy).toBe(boss.userId);
    expect(row?.finishedAt).toBeUndefined();

    const sessions = await boss.as.query(api.adminQueue.sessions, {});
    expect(sessions[0]).toMatchObject({ running: true, startedBy: "boss" });

    // Rule 8: the press is a privileged write and leaves a line.
    const log = await t.run(async (ctx) => await ctx.db.query("auditLog").collect());
    expect(log.some((l) => l.action === "discovery.fire" && l.targetId === runId)).toBe(true);
  });

  test("one at a time", async () => {
    const t = harness();
    const boss = await account(t, "boss", "admin");
    await boss.as.mutation(api.adminQueue.fire, {});
    await expect(boss.as.mutation(api.adminQueue.fire, {})).rejects.toThrow(/still out/i);
  });
});

describe("the session tells its story", () => {
  test("with no keys it says so in one line, and comes back", async () => {
    const t = harness();
    const boss = await account(t, "boss", "admin");
    const runId = await boss.as.mutation(api.adminQueue.fire, {});

    // The scheduled action runs here. There is no Firecrawl or OpenAI key in a
    // test, so the whole story is the refusal — which is exactly what the
    // console should show rather than a session that silently never returns.
    await t.finishAllScheduledFunctions(vi.runAllTimers);

    const lines = await boss.as.query(api.adminQueue.events, { runId });
    expect(lines.length).toBeGreaterThanOrEqual(1);
    expect(lines[0]!.kind).toBe("error");
    expect(lines[0]!.text).toMatch(/no firecrawl or openai key/i);

    const row = await t.run(async (ctx) => ctx.db.get("ingestRuns", runId));
    expect(row?.finishedAt).toBeDefined();
    expect((await boss.as.query(api.adminQueue.sessions, {}))[0]!.running).toBe(false);
  });
});
