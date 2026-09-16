import { v } from "convex/values";

import { internal } from "./_generated/api";
import {
  internalMutation,
  mutation,
  query,
  type MutationCtx,
  type QueryCtx,
} from "./_generated/server";
import { audit, requirePermission } from "./admin";
import { perform } from "./simulateActs";

/**
 * A room that keeps moving while nobody is in it.
 *
 * An empty live rail is the hardest thing to demonstrate past: this product
 * is a crowd, and a crowd that has not said anything in four hours looks like
 * a product nobody uses. So the demo accounts can be left running — voting,
 * arguing and agreeing several times a second — and the rail fills the way it
 * would if twenty countries were awake.
 *
 * **It beats rather than ticks.** A Convex cron fires at most once a minute,
 * which is a hundredth of the rate this wants, so a beat does its work and
 * then schedules the next one a second later. The cron is demoted to a
 * supervisor: once a minute it checks whether the chain is still alive and
 * restarts it if a deploy or an error broke the link.
 *
 * **Two beats must never run at once**, or turning it off and on again leaves
 * two chains going at double the rate forever. Every beat carries the token it
 * was started with and stops the moment the stored token is something else, so
 * a restart orphans the old chain rather than racing it.
 *
 * **It is off by default and it says what it is.** Every act comes from an
 * account stamped `seed:` and named "(demo)", every flick of the switch lands
 * an `auditLog` row, and nothing it writes is reachable by a path a real
 * person's act is not.
 */

const KEY = "simulate.live";

/**
 * Acts per beat, and a beat is a second.
 *
 * A pace rather than a number: a room where exactly five things happen every
 * second is a metronome, and it reads as one. The beat rolls somewhere in this
 * range each time instead, so the rail arrives in ones and threes the way a
 * real afternoon does. Setting both ends to the same number pins it.
 */
const DEFAULT_LEAST = 1;
const DEFAULT_MOST = 3;
/** Nobody needs a hundred acts a second, and the transaction would not take it. */
const CEILING = 20;

const clamp = (n: number, low: number, high: number) =>
  Math.max(low, Math.min(Math.round(n), high));

/** A chain is dead if its last beat is older than this. */
const STALL_MS = 8_000;

type Sim = {
  on: boolean;
  least: number;
  most: number;
  token: string;
  lastBeatAt: number;
};

async function read(ctx: QueryCtx | MutationCtx): Promise<Sim> {
  const row = await ctx.db
    .query("settings")
    .withIndex("by_key", (q) => q.eq("key", KEY))
    .unique();
  const value = (row?.value ?? null) as (Partial<Sim> & { rate?: number }) | null;
  /* `rate` is what this setting used to be, when a beat did the same number of
     acts every time. A row written then still means something: a pace pinned
     to one number. */
  const least = clamp(value?.least ?? value?.rate ?? DEFAULT_LEAST, 1, CEILING);
  return {
    on: value?.on === true,
    least,
    most: clamp(value?.most ?? value?.rate ?? DEFAULT_MOST, least, CEILING),
    token: typeof value?.token === "string" ? value.token : "",
    lastBeatAt: typeof value?.lastBeatAt === "number" ? value.lastBeatAt : 0,
  };
}

async function write(ctx: MutationCtx, next: Sim): Promise<void> {
  const row = await ctx.db
    .query("settings")
    .withIndex("by_key", (q) => q.eq("key", KEY))
    .unique();
  if (row) await ctx.db.patch("settings", row._id, { value: next });
  else await ctx.db.insert("settings", { key: KEY, value: next });
}

export const state = query({
  args: {},
  returns: v.object({
    on: v.boolean(),
    /** The pace, as a range. Equal ends mean a fixed number of acts a beat. */
    least: v.number(),
    most: v.number(),
    voices: v.number(),
    /** Whether a beat has landed recently, so the panel can say "running"
        rather than merely "switched on". */
    beating: v.boolean(),
  }),
  handler: async (ctx) => {
    await requirePermission(ctx, "settings:manage");
    const sim = await read(ctx);
    const voices = (await ctx.db.query("users").take(600)).filter((u) =>
      u.authId.startsWith("seed:"),
    ).length;
    return {
      on: sim.on,
      least: sim.least,
      most: sim.most,
      voices,
      beating: sim.on && Date.now() - sim.lastBeatAt < STALL_MS,
    };
  },
});

export const set = mutation({
  args: {
    on: v.boolean(),
    least: v.optional(v.number()),
    most: v.optional(v.number()),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const me = await requirePermission(ctx, "settings:manage");
    const now = await read(ctx);
    /* A fresh token on every change, which is what orphans any chain already
       running — including the one this switch started a moment ago. */
    const token = crypto.randomUUID();
    const least = clamp(args.least ?? now.least, 1, CEILING);
    const next: Sim = {
      on: args.on,
      least,
      // A range given upside down is a slip, not an instruction to do nothing.
      most: clamp(args.most ?? Math.max(now.most, least), least, CEILING),
      token,
      lastBeatAt: 0,
    };
    await write(ctx, next);
    if (args.on) await ctx.scheduler.runAfter(0, internal.simulate.beat, { token });

    /* Rule 8. Turning fabricated activity on is exactly the kind of thing
       somebody should be able to ask "who did this, and when" about. */
    await audit(ctx, me._id, args.on ? "simulate.on" : "simulate.off", "settings", KEY, {
      on: next.on,
      least: next.least,
      most: next.most,
    });
    return null;
  },
});

/**
 * One beat: a second's worth of acts, then the next beat.
 *
 * It reschedules itself rather than returning to a cron, because a cron
 * cannot fire faster than once a minute and this wants to be a hundred times
 * that. The chain stops on its own the moment the switch is off or the token
 * has moved on — there is nothing to cancel.
 */
export const beat = internalMutation({
  args: { token: v.string() },
  returns: v.object({
    /** How many acts this beat set out to do, before anything refused. */
    acts: v.number(),
    votes: v.number(),
    comments: v.number(),
    likes: v.number(),
  }),
  handler: async (ctx, args) => {
    const sim = await read(ctx);
    const quiet = { acts: 0, votes: 0, comments: 0, likes: 0 };
    // Switched off, or this chain has been replaced by a newer one.
    if (!sim.on || sim.token !== args.token) return quiet;

    /* The roll is the whole point of a range, and it has to be a fresh one
       every beat: a seed taken from the stored row would give every beat in a
       second the same answer. */
    const acts =
      sim.least + Math.floor(Math.random() * (sim.most - sim.least + 1));
    const done = await perform(ctx, acts);
    await write(ctx, { ...sim, lastBeatAt: Date.now() });
    await ctx.scheduler.runAfter(1000, internal.simulate.beat, { token: args.token });
    return { acts, votes: done.votes, comments: done.comments, likes: done.likes };
  },
});

/**
 * The supervisor, once a minute.
 *
 * A self-rescheduling chain is one failed link from being over, and the
 * failure is silent — the switch still reads "on" and nothing happens. So the
 * cron's job is no longer to do the work but to notice the work has stopped
 * and start it again, with a new token so the old chain cannot come back.
 */
export const supervise = internalMutation({
  args: {},
  returns: v.object({ restarted: v.boolean() }),
  handler: async (ctx) => {
    const sim = await read(ctx);
    if (!sim.on) return { restarted: false };
    if (Date.now() - sim.lastBeatAt < STALL_MS) return { restarted: false };

    const token = crypto.randomUUID();
    await write(ctx, { ...sim, token, lastBeatAt: Date.now() });
    await ctx.scheduler.runAfter(0, internal.simulate.beat, { token });
    return { restarted: true };
  },
});

/** One burst, by hand, whatever the switch says. For checking it works. */
export const once = internalMutation({
  args: { acts: v.optional(v.number()) },
  returns: v.object({
    votes: v.number(),
    comments: v.number(),
    likes: v.number(),
    refused: v.array(v.string()),
  }),
  handler: async (ctx, args) => await perform(ctx, Math.min(args.acts ?? 5, 40)),
});
