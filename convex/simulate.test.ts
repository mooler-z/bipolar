/// <reference types="vite/client" />
import { register as registerRateLimiter } from "@convex-dev/rate-limiter/test";
import { convexTest } from "convex-test";
import { describe, expect, test } from "vitest";

import { internal } from "./_generated/api";
import type { Id } from "./_generated/dataModel";
import schema from "./schema";

/**
 * The heartbeat, and the two ways it can go wrong.
 *
 * It reschedules itself every second because a cron cannot fire faster than
 * once a minute. That buys the rate and costs two hazards, both of which are
 * silent and neither of which a person would notice by looking at the page:
 *
 *   **Two chains at once.** Turning it off and on again, or a supervisor
 *   restarting a chain that was not actually dead, doubles the rate for ever.
 *   **A chain that stops.** A failed link ends it, the switch still reads on,
 *   and nothing happens.
 *
 * So every beat carries a token and dies if the stored one has moved on, and
 * the supervisor restarts only a chain that has genuinely stalled.
 */

const modules = import.meta.glob("./**/*.ts");
const KEY = "simulate.live";

function harness() {
  const t = convexTest(schema, modules);
  registerRateLimiter(t);
  return t;
}

/** A room with something to do: one demo account and a few questions. */
async function room(t: ReturnType<typeof harness>) {
  await t.run(async (ctx) => {
    const author = await ctx.db.insert("users", {
      authId: "system:test", email: "", displayName: "Discovery",
      walletBalanceCents: 0, quillBalance: 0, role: "creator",
      isBanned: false, profilePublic: false, topicsBacked: 0, digestOptIn: false,
    });
    await ctx.db.insert("users", {
      authId: "seed:ET:0", email: "", displayName: "Ethiopia (demo 1)",
      countryCode: "ET", walletBalanceCents: 0, quillBalance: 0, role: "user",
      isBanned: false, profilePublic: false, topicsBacked: 0, digestOptIn: false,
    });
    const categoryId = await ctx.db.insert("categories", { slug: "news", name: "News" });
    for (let i = 0; i < 12; i++) {
      const topicId = await ctx.db.insert("topics", {
        slug: `t${i}`, question: `Question ${i}?`, categoryId, status: "active",
        isSensitive: false, isLocked: false, isFeatured: false, createdBy: author,
      });
      await ctx.db.insert("topicStats", {
        topicId, freeLove: 0, freeHate: 0, paidLove: 0, paidHate: 0,
        stakedCents: 0, skips: 0, comments: 0,
      });
    }
  });
}

async function switchTo(
  t: ReturnType<typeof harness>,
  value: { on: boolean; rate: number; token: string; lastBeatAt: number },
) {
  await t.run(async (ctx) => {
    const row = await ctx.db.query("settings").withIndex("by_key", (q) => q.eq("key", KEY)).unique();
    if (row) await ctx.db.patch("settings", row._id, { value });
    else await ctx.db.insert("settings", { key: KEY, value });
  });
}

const pending = async (t: ReturnType<typeof harness>) =>
  await t.run(async (ctx) => await ctx.db.system.query("_scheduled_functions").collect());

/**
 * Cancel whatever the chain has booked, before the test ends.
 *
 * A beat books the next one a second out, and the harness will faithfully run
 * it — a second later, against a test that has already finished and taken its
 * database with it. That surfaces as `Write outside of transaction`, an
 * unhandled rejection pinned to whichever test happened to be running at the
 * time. Noise sitting exactly where a real failure would appear is worse than
 * no signal at all, so every test that leaves a beat booked hangs it up here.
 */
async function quiet(t: ReturnType<typeof harness>) {
  await t.run(async (ctx) => {
    for (const f of await ctx.db.system.query("_scheduled_functions").collect()) {
      await ctx.scheduler.cancel(f._id);
    }
  });
}

describe("the heartbeat", () => {
  test("a beat acts, records that it beat, and books the next one", async () => {
    const t = harness();
    await room(t);
    await switchTo(t, { on: true, rate: 6, token: "alpha", lastBeatAt: 0 });

    const out = await t.mutation(internal.simulate.beat, { token: "alpha" });
    expect(out.votes + out.comments + out.likes).toBeGreaterThan(0);

    // The next beat is booked, or the chain is one beat long.
    const next = (await pending(t)).filter((f) => f.name.includes("beat"));
    expect(next).toHaveLength(1);

    // And it left proof it ran, which is what the supervisor reads.
    const sim = await t.run(async (ctx) => {
      const row = await ctx.db.query("settings").withIndex("by_key", (q) => q.eq("key", KEY)).unique();
      return row!.value as { lastBeatAt: number };
    });
    expect(sim.lastBeatAt).toBeGreaterThan(0);
    await quiet(t);
  });

  test("a beat from a replaced chain does nothing and books nothing", async () => {
    const t = harness();
    await room(t);
    await switchTo(t, { on: true, rate: 6, token: "beta", lastBeatAt: 0 });

    /* This is what stops a double rate for ever: the old chain's beat has to
       die on its own, because there is nothing to cancel it with. */
    const out = await t.mutation(internal.simulate.beat, { token: "alpha" });
    expect(out).toEqual({ votes: 0, comments: 0, likes: 0 });
    expect(await pending(t)).toHaveLength(0);

    const votes = await t.run(async (ctx) => await ctx.db.query("votes").collect());
    expect(votes).toHaveLength(0);
  });

  test("switching off stops the chain at the next beat", async () => {
    const t = harness();
    await room(t);
    await switchTo(t, { on: false, rate: 6, token: "alpha", lastBeatAt: Date.now() });

    const out = await t.mutation(internal.simulate.beat, { token: "alpha" });
    expect(out).toEqual({ votes: 0, comments: 0, likes: 0 });
    expect(await pending(t)).toHaveLength(0);
  });
});

describe("the supervisor", () => {
  test("it leaves a living chain alone", async () => {
    const t = harness();
    await room(t);
    await switchTo(t, { on: true, rate: 6, token: "alpha", lastBeatAt: Date.now() });

    // Restarting a chain that is merely between beats is how the rate doubles.
    expect(await t.mutation(internal.simulate.supervise, {})).toEqual({ restarted: false });
    expect(await pending(t)).toHaveLength(0);
  });

  test("it restarts a stalled one, with a token that orphans the old", async () => {
    const t = harness();
    await room(t);
    await switchTo(t, { on: true, rate: 6, token: "alpha", lastBeatAt: Date.now() - 60_000 });

    expect(await t.mutation(internal.simulate.supervise, {})).toEqual({ restarted: true });
    expect((await pending(t)).filter((f) => f.name.includes("beat"))).toHaveLength(1);

    const token = await t.run(async (ctx) => {
      const row = await ctx.db.query("settings").withIndex("by_key", (q) => q.eq("key", KEY)).unique();
      return (row!.value as { token: string }).token;
    });
    expect(token).not.toBe("alpha");
    await quiet(t);
  });

  test("it does nothing at all when the switch is off", async () => {
    const t = harness();
    await room(t);
    await switchTo(t, { on: false, rate: 6, token: "alpha", lastBeatAt: 0 });
    expect(await t.mutation(internal.simulate.supervise, {})).toEqual({ restarted: false });
    expect(await pending(t)).toHaveLength(0);
  });
});

describe("what a beat writes", () => {
  test("its votes are real votes, counted once", async () => {
    const t = harness();
    await room(t);
    await switchTo(t, { on: true, rate: 12, token: "alpha", lastBeatAt: 0 });
    await t.mutation(internal.simulate.beat, { token: "alpha" });

    const votes = await t.run(async (ctx) => await ctx.db.query("votes").collect());
    const stats = await t.run(async (ctx) => await ctx.db.query("topicStats").collect());
    const counted = stats.reduce(
      (n, s) => n + s.freeLove + s.freeHate + s.paidLove + s.paidHate,
      0,
    );
    /* Through `castVote`, so the counters move exactly once — a simulator
       that wrote its own totals would drift from the votes behind them. */
    expect(counted).toBe(votes.length);
    await quiet(t);
  });

  test("nothing it writes comes from a real account", async () => {
    const t = harness();
    await room(t);
    await switchTo(t, { on: true, rate: 12, token: "alpha", lastBeatAt: 0 });
    await t.mutation(internal.simulate.beat, { token: "alpha" });

    const acted = await t.run(async (ctx) => {
      const rows = await ctx.db.query("votes").collect();
      const out: string[] = [];
      for (const r of rows) {
        const u = await ctx.db.get("users", r.userId as Id<"users">);
        out.push(u!.authId);
      }
      return out;
    });
    expect(acted.every((id) => id.startsWith("seed:"))).toBe(true);
    await quiet(t);
  });
});
