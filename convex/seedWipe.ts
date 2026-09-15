import { v } from "convex/values";

import { internal } from "./_generated/api";
import { internalAction, internalMutation } from "./_generated/server";

/**
 * Taking the demo room back out.
 *
 * Its own module because `seedWorld.ts` is about putting a world in and this
 * is the only thing in the project that deletes a vote — it deserves to be
 * read on its own rather than found at the bottom of the file that creates
 * them.
 */

/** The stamp, and it must match the one `seedWorld.ts` writes. */
const MARK = "seed:";

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
        internal.seedWipe.clear,
        {},
      );
      votes += out.votes;
      rounds += 1;
      if (out.done || rounds > 200) break;
    }
    return { votes, rounds };
  },
});
