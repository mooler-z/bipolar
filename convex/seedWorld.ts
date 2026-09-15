import { v } from "convex/values";

import { internal } from "./_generated/api";
import { internalAction, internalMutation } from "./_generated/server";
import type { Id } from "./_generated/dataModel";
import { WORLD, roll, votes as opinionOf } from "./lib/seedOpinions";
import { PEOPLE_TOPICS } from "./seedPeopleTopics";
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

/** How the world sees each named person, by Wikipedia title. */
const FAVOUR = new Map(PEOPLE_TOPICS.map((p) => [p.w, p.f]));

/**
 * How many voters each country gets.
 *
 * Not one. With a single voter per country every country's lean on every
 * question is a coin flip — 0% or 100%, never a proportion — so the map draws
 * in two flat colours and no amount of reputation can move a result. Six is
 * enough for a country to be divided about something, which is the whole
 * point of the product.
 */
const VOICES = 6;

export const people = internalMutation({
  args: { each: v.optional(v.number()) },
  returns: v.array(v.object({ userId: v.id("users"), code: v.string() })),
  handler: async (ctx, args) => {
    const each = Math.max(1, Math.min(args.each ?? VOICES, 12));
    const out = [];
    for (const person of WORLD) {
      for (let n = 0; n < each; n++) {
      const authId = `${MARK}${person.code}:${n}`;
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
        displayName: `${person.name} (demo ${n + 1})`,
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
    }
    return out;
  },
});

/**
 * One wave: every country's opinion on a slice of the questions, shuffled.
 *
 * It used to be one country at a time, walking the whole feed before the next
 * country started — which is correct data and a terrible-looking room. The
 * live rail shows the newest votes, so a seeded deployment opened with the
 * same flag twenty times in a row and then the next flag twenty times.
 *
 * So a wave is a slice of topics crossed with every country, cast in a
 * deterministic shuffle. The rail fills the way a real room does, and the
 * shuffle is seeded so a re-run produces the same order rather than a
 * different-looking one.
 *
 * A slice at a time because a Convex mutation is one transaction with a
 * budget, and twenty countries times five hundred questions is not one.
 */
export const wave = internalMutation({
  args: { cursor: v.number(), take: v.number() },
  returns: v.object({ cast: v.number(), next: v.number(), done: v.boolean() }),
  handler: async (ctx, args) => {
    const topics = await ctx.db
      .query("topics")
      .withIndex("by_status", (q) => q.eq("status", "active"))
      .order("desc")
      .take(args.cursor + args.take);
    const slice = topics.slice(args.cursor);
    if (slice.length === 0) return { cast: 0, next: args.cursor, done: true };

    const people = (await ctx.db.query("users").take(600)).filter((u) =>
      u.authId.startsWith(MARK),
    );
    if (people.length === 0) return { cast: 0, next: args.cursor, done: true };

    /* Every pairing in the wave, then shuffled by a hash of the two ids, so
       the order is mixed but the same on every run. */
    const pairs = slice.flatMap((topic) => people.map((user) => ({ topic, user })));
    pairs.sort(
      (a, b) =>
        roll(a.user.authId, a.topic._id) - roll(b.user.authId, b.topic._id) ||
        a.user.authId.localeCompare(b.user.authId),
    );

    let cast = 0;
    for (const { topic, user } of pairs) {
      const person = WORLD.find((p) => p.code === user.countryCode);
      if (!person) continue;
      const favour = topic.wikipediaTitle ? FAVOUR.get(topic.wikipediaTitle) : undefined;
      const choice = opinionOf(
        person,
        { id: topic._id, about: topic.scopeCountry, favour },
        // Their own roll, so six people from one country can disagree.
        user.authId,
      );
      try {
        /* The same call the web and the bot make. A refusal — already voted,
           topic locked — is the transaction doing its job, not a failure of
           the seed, so it moves on. */
        await castVote(
          ctx,
          (await ctx.db.get("users", user._id))!,
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
 * An action, because it walks the feed in waves and each wave is its own
 * transaction. `perCountry` is the ceiling on questions each country answers
 * — the default is enough to make every board dense without every country
 * having an opinion about every single thing, which is its own kind of
 * unconvincing.
 */
export const run = internalAction({
  args: {
    perCountry: v.optional(v.number()),
    batch: v.optional(v.number()),
    voices: v.optional(v.number()),
  },
  returns: v.object({ voters: v.number(), votes: v.number() }),
  handler: async (ctx, args) => {
    const cap = args.perCountry ?? 90;
    /* Two topics across a hundred and twenty voters is two hundred and forty
       votes, which is about as much as one transaction should carry given the
       counters each one moves. */
    const batch = Math.max(1, Math.min(args.batch ?? 2, 4));

    const population: { userId: Id<"users">; code: string }[] = await ctx.runMutation(
      internal.seedWorld.people,
      { each: args.voices },
    );

    let total = 0;
    let cursor = 0;
    while (cursor < cap) {
      const out: { cast: number; next: number; done: boolean } = await ctx.runMutation(
        internal.seedWorld.wave,
        { cursor, take: Math.min(batch, cap - cursor) },
      );
      total += out.cast;
      cursor = out.next;
      if (out.done) break;
    }

    return { voters: population.length, votes: total };
  },
});
