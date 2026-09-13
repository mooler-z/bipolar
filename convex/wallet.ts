import { v } from "convex/values";

import { PACKS, SPARK_CENTS, packById } from "./config";
import { mutation, query } from "./_generated/server";
import { limiter } from "./limits";
import { credit, currentUser, requireUser } from "./users";

/**
 * The wallet.
 *
 * Nobody is charged 50 cents through a card processor — the fee would eat most
 * of it. People buy a pack once, the credit lands here in integer cents, and a
 * paid vote is a decrement with no marginal payment fee. To the person doing
 * it, it feels like dropping a coin rather than making a payment.
 *
 * The catalogue below is the only source of prices. A checkout names a pack by
 * id; a price arriving from a client is ignored, because a client that can name
 * a price can name zero.
 */

/** Public, and the only shape of a price the client ever sees. */
export const packs = query({
  args: {},
  returns: v.object({
    /** Free during the hackathon. Said here so no screen can imply otherwise. */
    free: v.boolean(),
    claimedPackId: v.union(v.null(), v.string()),
    items: v.array(
      v.object({
        id: v.string(),
        label: v.string(),
        priceCents: v.number(),
        sparks: v.number(),
        quills: v.number(),
      }),
    ),
  }),
  handler: async (ctx) => {
    const user = await currentUser(ctx);
    return {
      free: true,
      claimedPackId: user?.claimedPackId ?? null,
      items: PACKS.map((p) => ({ ...p })),
    };
  },
});

export const balance = query({
  args: {},
  returns: v.object({
    cents: v.number(),
    sparks: v.number(),
    quills: v.number(),
  }),
  handler: async (ctx) => {
    const user = await currentUser(ctx);
    return {
      cents: user?.walletBalanceCents ?? 0,
      sparks: Math.floor((user?.walletBalanceCents ?? 0) / SPARK_CENTS),
      quills: user?.quillBalance ?? 0,
    };
  },
});

/** The ledger, newest first. Append-only upstream, so this is the whole truth. */
export const history = query({
  args: { limit: v.optional(v.number()) },
  returns: v.array(
    v.object({
      at: v.number(),
      type: v.string(),
      amountCents: v.number(),
      topicId: v.union(v.null(), v.id("topics")),
      packId: v.union(v.null(), v.string()),
    }),
  ),
  handler: async (ctx, args) => {
    const user = await currentUser(ctx);
    if (!user) return [];
    const rows = await ctx.db
      .query("creditTransactions")
      .withIndex("by_user", (q) => q.eq("userId", user._id))
      .order("desc")
      .take(Math.min(args.limit ?? 50, 100));
    return rows.map((r) => ({
      at: r._creationTime,
      type: r.type,
      amountCents: r.amountCents,
      topicId: r.topicId ?? null,
      packId: r.packId ?? null,
    }));
  },
});

/**
 * Claim a pack.
 *
 * **No card is charged. There is no Stripe account behind this build and every
 * pack is free.** What that changes is this one step and nothing else: the
 * catalogue, its prices in cents, the wallet, the spark cost, the peek cost,
 * the ledger and every refusal are real, and a wallet at zero still cannot cast
 * a paid vote. The economics are simulated; the mechanics are not.
 *
 * Three things this must get right even while it is free:
 *
 * **The client names a pack, never a price.** The catalogue is a server-side
 * constant and the only source of prices. A client that can send a price can
 * send zero, and that stays true on the day money is real.
 *
 * **It is a `grant`, not a `purchase`.** `purchase` is reserved for cents that
 * actually reached us through a processor, and nothing writes one. The ledger
 * must never claim money that did not exist. The pack is recorded beside it.
 *
 * **One claim per account.** Otherwise the catalogue is an unlimited wallet and
 * the paid vote stops meaning anything — which would quietly destroy the only
 * thing the paid layer is for. Enforced the way the vote rule is: a read before
 * the write, plus a test that hammers it.
 *
 * Swapping real payments in later replaces this mutation with a checkout action
 * and a verified webhook. Everything downstream of `credit()` is untouched.
 */
export const claimPack = mutation({
  args: { packId: v.string() },
  returns: v.object({
    cents: v.number(),
    sparks: v.number(),
    quills: v.number(),
  }),
  handler: async (ctx, args) => {
    const user = await requireUser(ctx);
    await limiter.limit(ctx, "checkout", { key: user._id, throws: true });

    const pack = packById(args.packId);
    if (!pack) throw new Error("No such pack.");

    if (user.claimedPackId !== undefined) {
      throw new Error(
        "You have already claimed a pack. One per account while packs are free.",
      );
    }

    // The marker goes down in the same transaction as the credit, so two
    // simultaneous claims cannot both find nothing and both pay out.
    await ctx.db.patch("users", user._id, { claimedPackId: pack.id });
    await credit(ctx, user._id, pack.priceCents, pack.quills, "grant", {
      packId: pack.id,
    });

    return {
      cents: pack.priceCents,
      sparks: Math.floor(pack.priceCents / SPARK_CENTS),
      quills: pack.quills,
    };
  },
});

/**
 * Credit handed out by an administrator — seeding demo accounts, or putting
 * sparks in a judge's wallet so the paid layer can be seen working.
 *
 * This is not a purchase and never claims to be: it lands as a `grant` row, so
 * the ledger can always tell money that came from Stripe from money that did
 * not. Every grant is audited in the same mutation.
 */
export const grant = mutation({
  args: {
    email: v.string(),
    cents: v.number(),
    quills: v.optional(v.number()),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const actor = await requireUser(ctx);
    if (actor.role !== "admin") throw new Error("Administrators only.");
    if (!Number.isInteger(args.cents) || args.cents <= 0 || args.cents > 10_000) {
      throw new Error("A grant is a positive whole number of cents, under 100.00.");
    }

    const target = await ctx.db
      .query("users")
      .withIndex("by_email", (q) => q.eq("email", args.email.toLowerCase()))
      .unique();
    if (!target) throw new Error("No account with that address.");

    await credit(ctx, target._id, args.cents, args.quills ?? 0, "grant", {});
    await ctx.db.insert("auditLog", {
      actorId: actor._id,
      action: "wallet.grant",
      targetType: "users",
      targetId: target._id,
      metadata: { cents: args.cents, quills: args.quills ?? 0 },
    });
    return null;
  },
});
