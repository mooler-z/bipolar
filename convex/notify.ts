import { v } from "convex/values";

import { CADENCE, DIGEST, publicSite } from "./config";
import { internal } from "./_generated/api";
import {
  internalAction,
  internalMutation,
  internalQuery,
} from "./_generated/server";
import type { Id } from "./_generated/dataModel";
import { send } from "./lib/agentmail";

/**
 * Reaching somebody who is not looking at the page.
 *
 * A voting app is a habit or it is nothing, and a habit needs a reason to come
 * back that arrives on its own. AgentMail carries two: the welcome, which tells
 * a new account it already has credit to spend, and the daily note, which names
 * what people are arguing about today. Remove it and the product can only speak
 * to people already on the page.
 *
 * Three rules hold for everything here:
 *
 *   - Sending never blocks the thing it describes. Every notice is scheduled,
 *     so a mail service having a bad day cannot fail somebody's sign-up.
 *   - Nothing sends twice. A row is claimed under a dedupe key before the send;
 *     a cron that fires twice finds the row and stops.
 *   - No key, no noise, no error. With AgentMail unconfigured every function
 *     here returns quietly and nothing else in the app changes.
 */

/* ── Claiming the right to send ─────────────────────────────────────────── */

/** Reserve a notice. Returns false when this exact notice already went out. */
export const claim = internalMutation({
  args: {
    userId: v.id("users"),
    kind: v.union(
      v.literal("welcome"),
      v.literal("digest"),
      v.literal("packLanded"),
    ),
    dedupeKey: v.string(),
    to: v.string(),
    subject: v.string(),
  },
  returns: v.union(v.null(), v.id("mailLog")),
  handler: async (ctx, args) => {
    const already = await ctx.db
      .query("mailLog")
      .withIndex("by_dedupe", (q) => q.eq("dedupeKey", args.dedupeKey))
      .first();
    if (already) return null;
    return await ctx.db.insert("mailLog", { ...args, delivered: false });
  },
});

export const markDelivered = internalMutation({
  args: { logId: v.id("mailLog"), delivered: v.boolean() },
  returns: v.null(),
  handler: async (ctx, args) => {
    await ctx.db.patch("mailLog", args.logId, { delivered: args.delivered });
    return null;
  },
});

/* ── The welcome ────────────────────────────────────────────────────────── */

export const recipient = internalQuery({
  args: { userId: v.id("users") },
  returns: v.union(
    v.null(),
    v.object({ email: v.string(), name: v.string(), sparks: v.number() }),
  ),
  handler: async (ctx, args) => {
    const user = await ctx.db.get("users", args.userId);
    if (!user || !user.email) return null;
    return {
      email: user.email,
      name: user.displayName,
      sparks: Math.floor(user.walletBalanceCents / 50),
    };
  },
});

export const welcome = internalAction({
  args: { userId: v.id("users") },
  returns: v.null(),
  handler: async (ctx, args) => {
    const to = await ctx.runQuery(internal.notify.recipient, args);
    if (!to) return null;

    const subject = "You're in — now go disagree with someone";
    const logId: Id<"mailLog"> | null = await ctx.runMutation(
      internal.notify.claim,
      {
        userId: args.userId,
        kind: "welcome",
        dedupeKey: `welcome:${args.userId}`,
        to: to.email,
        subject,
      },
    );
    if (!logId) return null;

    const text =
      `${to.name},\n\n` +
      "bi-polar is one question at a time: LOVE it or HATE it.\n\n" +
      "A free vote is your everyday opinion. A paid vote costs one spark — " +
      "50 cents of real money — and it is one per person per topic, so it " +
      "buys no extra volume. It only proves you meant it.\n\n" +
      `You start with ${to.sparks} sparks, on us.\n\n` +
      "A topic's result stays hidden until you vote or pay to peek. Decide " +
      "first, then see.\n\n" +
      `${publicSite()}\n`;

    const { ok } = await send(to.email, subject, text);
    await ctx.runMutation(internal.notify.markDelivered, {
      logId,
      delivered: ok,
    });
    return null;
  },
});

/* ── The daily note ─────────────────────────────────────────────────────── */

/** The hottest topics, by money staked. Public data — never the gated split. */
export const hottest = internalQuery({
  args: { limit: v.number() },
  returns: v.array(
    v.object({
      slug: v.string(),
      question: v.string(),
      stakedCents: v.number(),
    }),
  ),
  handler: async (ctx, args) => {
    const rows = await ctx.db.query("topicStats").take(300);
    const ranked = rows
      .sort((a, b) => b.stakedCents - a.stakedCents)
      .slice(0, args.limit);

    const out = [];
    for (const row of ranked) {
      const topic = await ctx.db.get("topics", row.topicId);
      if (topic && topic.status === "active") {
        out.push({
          slug: topic.slug,
          question: topic.question,
          stakedCents: row.stakedCents,
        });
      }
    }
    return out;
  },
});

/** Who wants the note, and has not had today's yet. */
export const digestAudience = internalQuery({
  args: { limit: v.number() },
  returns: v.array(
    v.object({
      userId: v.id("users"),
      email: v.string(),
      name: v.string(),
    }),
  ),
  handler: async (ctx, args) => {
    const users = await ctx.db.query("users").take(1_000);
    return users
      .filter((u) => u.digestOptIn && u.email && !u.isBanned)
      .slice(0, args.limit)
      .map((u) => ({ userId: u._id, email: u.email, name: u.displayName }));
  },
});

export const stampDigest = internalMutation({
  args: { userId: v.id("users"), at: v.number() },
  returns: v.null(),
  handler: async (ctx, args) => {
    await ctx.db.patch("users", args.userId, { lastDigestAt: args.at });
    return null;
  },
});

/**
 * One note a day, naming what people are arguing about.
 *
 * The dedupe key carries the date, so the cron firing twice on the same day
 * sends nothing the second time — and the same key means a deployment restored
 * from a backup cannot re-mail a day that already went out.
 */
export const digest = internalAction({
  args: {},
  returns: v.object({ sent: v.number() }),
  handler: async (ctx) => {
    const topics = await ctx.runQuery(internal.notify.hottest, {
      limit: DIGEST.topics,
    });
    // Nothing to argue about is not worth an email.
    if (topics.length === 0) return { sent: 0 };

    const day = new Date().toISOString().slice(0, 10);
    const audience = await ctx.runQuery(internal.notify.digestAudience, {
      limit: DIGEST.maxRecipients,
    });

    const site = publicSite();
    const body =
      topics
        .map((t, i) => `${i + 1}. ${t.question}\n   ${site}/t/${t.slug}`)
        .join("\n\n") +
      "\n\nResults stay hidden until you vote. Decide first, then see.\n";

    let sent = 0;
    for (const person of audience) {
      const subject = `Today on bi-polar: ${topics[0].question}`;
      const logId: Id<"mailLog"> | null = await ctx.runMutation(
        internal.notify.claim,
        {
          userId: person.userId,
          kind: "digest",
          dedupeKey: `digest:${person.userId}:${day}`,
          to: person.email,
          subject,
        },
      );
      if (!logId) continue;

      const { ok } = await send(
        person.email,
        subject,
        `${person.name},\n\n${body}`,
      );
      await ctx.runMutation(internal.notify.markDelivered, {
        logId,
        delivered: ok,
      });
      await ctx.runMutation(internal.notify.stampDigest, {
        userId: person.userId,
        at: Date.now(),
      });
      if (ok) sent += 1;
    }
    return { sent };
  },
});

/** Re-exported so `crons.ts` reads as a schedule rather than a lookup table. */
export const DIGEST_HOUR_UTC = CADENCE.digestHourUtc;
