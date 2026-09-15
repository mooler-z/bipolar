import { v } from "convex/values";

import { internal } from "./_generated/api";
import { internalAction, internalMutation } from "./_generated/server";
import type { Id } from "./_generated/dataModel";
import { WORLD, votes as opinionOf } from "./lib/seedOpinions";
import { castVote } from "./voteWrite";

/**
 * The demo population.
 *
 * The world page needs a world. A fresh deployment has two countries on it,
 * which is a fair picture of the truth and a poor picture of the product — so
 * this fills the room with twenty countries chosen in pairs that disagree.
 *
 * **Every vote goes through the real transaction.** `castVote` is what the web
 * and the bot both call, so the seeded counters, the ledger, the per-country
 * stats and the ranker's signals are all exactly what they would be if twenty
 * people had really voted. Writing the counters by hand would have been
 * quicker and would have produced a database that no real vote could ever have
 * produced — which is a worse demo *and* a worse test.
 *
 * **It is fabricated and it never pretends otherwise.** Every account is
 * stamped `seed:` in the one field nothing else uses, so the room can be told
 * apart from a real one and taken back out by that stamp alone.
 *
 * Run it from the CLI, a slice at a time:
 *
 *   npx convex run seedWorld:run '{}'
 *   npx convex run seedWorld:clear '{}'
 */

/** The stamp. One place, so `clear` can never disagree with `run`. */
const MARK = "seed:";

export const people = internalMutation({
  args: {},
  returns: v.array(v.object({ userId: v.id("users"), code: v.string() })),
  handler: async (ctx) => {
    const out = [];
    for (const person of WORLD) {
      const authId = `${MARK}${person.code}`;
      const existing = await ctx.db
        .query("users")
        .withIndex("by_auth", (q) => q.eq("authId", authId))
        .unique();
      if (existing) {
        out.push({ userId: existing._id, code: person.code });
        continue;
      }
      const userId = await ctx.db.insert("users", {
        authId,
        email: "",
        // Named for what it is. A demo account that looks like a person is a
        // demo account somebody eventually quotes as one.
        displayName: `${person.name} (demo)`,
        countryCode: person.code,
        walletBalanceCents: 0,
        quillBalance: 0,
        role: "user",
        isBanned: false,
        profilePublic: false,
        topicsBacked: 0,
        digestOptIn: false,
      });
      out.push({ userId, code: person.code });
    }
    return out;
  },
});

/**
 * One country's opinions, over a slice of the questions.
 *
 * A slice at a time because a Convex mutation is one transaction with a budget,
 * and twenty countries times five hundred questions is not one transaction.
 */
export const opinions = internalMutation({
  args: {
    userId: v.id("users"),
    code: v.string(),
    cursor: v.number(),
    take: v.number(),
  },
  returns: v.object({ cast: v.number(), next: v.number(), done: v.boolean() }),
  handler: async (ctx, args) => {
    const person = WORLD.find((p) => p.code === args.code);
    const user = await ctx.db.get("users", args.userId);
    if (!person || !user) return { cast: 0, next: args.cursor, done: true };

    const topics = await ctx.db
      .query("topics")
      .withIndex("by_status", (q) => q.eq("status", "active"))
      .order("desc")
      .take(args.cursor + args.take);
    const slice = topics.slice(args.cursor);
    if (slice.length === 0) return { cast: 0, next: args.cursor, done: true };

    let cast = 0;
    for (const topic of slice) {
      const choice = opinionOf(person, { id: topic._id, about: topic.scopeCountry });
      try {
        /* The same call the web and the bot make. A refusal — already voted,
           topic locked — is the transaction doing its job, not a failure of
           the seed, so it moves on. */
        await castVote(
          ctx,
          (await ctx.db.get("users", args.userId))!,
          { topicId: topic._id, choice, voteType: "free" },
          "web",
        );
        cast += 1;
      } catch {
        // Already answered, or closed. Either way there is nothing to add.
      }
    }
    return { cast, next: args.cursor + slice.length, done: slice.length < args.take };
  },
});

/**
 * Fill the room.
 *
 * An action, because it walks the whole population in slices and each slice is
 * its own transaction. `perCountry` is the ceiling on questions each one
 * answers — the default is enough to make every board dense without every
 * country having an opinion about every single thing, which is its own kind of
 * unconvincing.
 */
export const run = internalAction({
  args: { perCountry: v.optional(v.number()), batch: v.optional(v.number()) },
  returns: v.object({ countries: v.number(), votes: v.number() }),
  handler: async (ctx, args) => {
    const cap = args.perCountry ?? 90;
    const batch = args.batch ?? 30;

    /* Annotated, and so is the slice below. A handler that calls its own
       module makes the generated API depend on the type it is generating, and
       TypeScript resolves that cycle by quietly making the whole API `any` —
       which type-checks fine here and takes every other file's types with it. */
    const population: { userId: Id<"users">; code: string }[] = await ctx.runMutation(
      internal.seedWorld.people,
      {},
    );
    let total = 0;

    for (const person of population) {
      let cursor = 0;
      while (cursor < cap) {
        const out: { cast: number; next: number; done: boolean } = await ctx.runMutation(
          internal.seedWorld.opinions,
          {
            userId: person.userId as Id<"users">,
            code: person.code,
            cursor,
            take: Math.min(batch, cap - cursor),
          },
        );
        total += out.cast;
        cursor = out.next;
        if (out.done) break;
      }
    }

    return { countries: population.length, votes: total };
  },
});

/**
 * Take the demo room back out.
 *
 * It deletes, which nothing else in this codebase does to a vote — Rule 8 is
 * absolute about that. The exception holds because these rows were never a
 * record of anything: no person cast them, no money moved, and the stamp says
 * so. Removing fabricated rows is not the thing Rule 8 exists to prevent.
 */
export const clear = internalMutation({
  args: { take: v.optional(v.number()) },
  returns: v.object({ votes: v.number(), users: v.number(), done: v.boolean() }),
  handler: async (ctx, args) => {
    /* A slice at a time. A transaction has a read budget and twenty countries
       times ninety votes is four times over it — the first version of this
       tried to do the lot and failed at the limit, which is the worst possible
       moment because half the room is already gone. */
    const take = args.take ?? 400;
    const seeded = (await ctx.db.query("users").take(600)).filter((u) =>
      u.authId.startsWith(MARK),
    );
    if (seeded.length === 0) return { votes: 0, users: 0, done: true };

    let removed = 0;
    for (const user of seeded) {
      if (removed >= take) return { votes: removed, users: 0, done: false };

      const theirs = await ctx.db
        .query("votes")
        .withIndex("by_user", (q) => q.eq("userId", user._id))
        .take(take - removed);

      for (const vote of theirs) {
        const field = `${vote.voteType}${vote.choice === "love" ? "Love" : "Hate"}` as
          | "freeLove"
          | "freeHate"
          | "paidLove"
          | "paidHate";

        // The counters are walked back the way they were put on, so a cleared
        // deployment is the one it was before rather than one carrying totals
        // with no votes behind them.
        const totals = await ctx.db
          .query("topicStats")
          .withIndex("by_topic", (q) => q.eq("topicId", vote.topicId))
          .unique();
        if (totals) {
          await ctx.db.patch("topicStats", totals._id, {
            [field]: Math.max(0, totals[field] - 1),
          });
        }
        const perCountry = await ctx.db
          .query("countryTopicStats")
          .withIndex("by_topic_country", (q) =>
            q.eq("topicId", vote.topicId).eq("countryCode", vote.countryCode),
          )
          .unique();
        if (perCountry) {
          await ctx.db.patch("countryTopicStats", perCountry._id, {
            [field]: Math.max(0, perCountry[field] - 1),
          });
        }

        await ctx.db.delete("votes", vote._id);
        removed += 1;
      }

      if (theirs.length > 0) continue;

      // No votes left on this one: its traces and then the account itself.
      for (const table of ["interactions", "userAffinity", "calls"] as const) {
        const rows = await ctx.db
          .query(table)
          .withIndex("by_user", (q) => q.eq("userId", user._id))
          .take(300);
        for (const row of rows) await ctx.db.delete(table, row._id);
        if (rows.length === 300) return { votes: removed, users: 0, done: false };
      }
      const stats = await ctx.db
        .query("callerStats")
        .withIndex("by_user", (q) => q.eq("userId", user._id))
        .unique();
      if (stats) await ctx.db.delete("callerStats", stats._id);

      await ctx.db.delete("users", user._id);
    }

    return { votes: removed, users: seeded.length, done: true };
  },
});

/** Walk `clear` until the demo room is gone. */
export const wipe = internalAction({
  args: {},
  returns: v.object({ votes: v.number(), rounds: v.number() }),
  handler: async (ctx) => {
    let votes = 0;
    let rounds = 0;
    for (;;) {
      const out: { votes: number; users: number; done: boolean } = await ctx.runMutation(
        internal.seedWorld.clear,
        {},
      );
      votes += out.votes;
      rounds += 1;
      if (out.done || rounds > 200) break;
    }
    return { votes, rounds };
  },
});
