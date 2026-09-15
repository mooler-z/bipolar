import { v } from "convex/values";

import {
  LIMITS,
  SIGNUP_GRANT_CENTS,
  SIGNUP_GRANT_QUILLS,
  adminEmails,
} from "./config";
import { internal } from "./_generated/api";
import {
  internalMutation,
  mutation,
  query,
  type MutationCtx,
  type QueryCtx,
} from "./_generated/server";
import type { Doc, Id } from "./_generated/dataModel";

/**
 * Identity, and the one row every other module starts from.
 *
 * Better Auth owns the credential; this table owns what the product knows —
 * wallet, quills, country, role. The join is `authId`, which is the auth
 * subject and is read from `ctx.auth`, never from an argument. A `userId` in a
 * function's arguments would let any caller act as anybody.
 */

/** The caller's row, or null. Never creates — a query cannot write. */
export async function currentUser(
  ctx: QueryCtx,
): Promise<Doc<"users"> | null> {
  const identity = await ctx.auth.getUserIdentity();
  if (!identity) return null;
  return await ctx.db
    .query("users")
    .withIndex("by_auth", (q) => q.eq("authId", identity.subject))
    .unique();
}

/**
 * The caller's row, or a thrown error. What every write path uses.
 *
 * A suspended account is refused here, which is what makes a suspension mean
 * something: it is one check on the one function every write goes through,
 * rather than a flag each mutation has to remember to look at. The message
 * says *account*, not *vote* — this same refusal is what a suspended reader
 * gets for commenting, liking, peeking and spending, and telling them voting
 * is the problem sends them looking in the wrong place.
 */
export async function requireUser(ctx: QueryCtx): Promise<Doc<"users">> {
  const user = await currentUser(ctx);
  if (!user) throw new Error("Sign in to do that.");
  if (user.isBanned) throw new Error("This account is suspended.");
  return user;
}

export const me = query({
  args: {},
  returns: v.union(
    v.null(),
    v.object({
      _id: v.id("users"),
      email: v.string(),
      displayName: v.string(),
      avatarUrl: v.optional(v.string()),
      countryCode: v.optional(v.string()),
      walletBalanceCents: v.number(),
      quillBalance: v.number(),
      role: v.string(),
      /** Suspended. Every write path already refuses; this lets the app say so
          rather than letting each action fail one at a time. */
      isBanned: v.boolean(),
      digestOptIn: v.boolean(),
      /** Straight to the next question after voting, without the result. */
      skipReveal: v.boolean(),
      sparks: v.number(),
      /** Topics backed with a spark. What the rank on screen is derived from. */
      topicsBacked: v.number(),
    }),
  ),
  handler: async (ctx) => {
    const user = await currentUser(ctx);
    if (!user) return null;
    return {
      _id: user._id,
      email: user.email,
      displayName: user.displayName,
      avatarUrl: user.avatarUrl,
      countryCode: user.countryCode,
      walletBalanceCents: user.walletBalanceCents,
      quillBalance: user.quillBalance,
      role: user.role,
      isBanned: user.isBanned,
      digestOptIn: user.digestOptIn,
      skipReveal: user.skipReveal ?? false,
      topicsBacked: user.topicsBacked,
      // A convenience, derived server-side so the client never divides money.
      sparks: Math.floor(user.walletBalanceCents / 50),
    };
  },
});

/**
 * Create the product's row for a freshly authenticated identity, once.
 *
 * Called by the client on every load; the index read makes the second call and
 * the thousandth a no-op. The welcome grant and the welcome mail happen here
 * because this is the only moment an account exists that did not a moment ago.
 */
/**
 * The product's row for an authenticated identity, created if it is missing.
 *
 * Every write path that needs an account calls this rather than assuming one
 * exists. The assumption used to hold only because the account screen happened
 * to create the row first — so an account whose row was removed while its
 * session lived on (a wiped deployment, a deleted user) hit "Sign in to do
 * that" while plainly signed in, with no way forward.
 */
export async function ensureUser(
  ctx: MutationCtx,
  hint: { displayName?: string; avatarUrl?: string } = {},
): Promise<Id<"users">> {
  const identity = await ctx.auth.getUserIdentity();
  if (!identity) throw new Error("Sign in first.");

  const existing = await ctx.db
    .query("users")
    .withIndex("by_auth", (q) => q.eq("authId", identity.subject))
    .unique();
  if (existing) return existing._id;

  const args = hint;

  const email = (identity.email ?? "").toLowerCase();
  const userId = await ctx.db.insert("users", {
    authId: identity.subject,
    email,
    displayName: args.displayName ?? identity.name ?? email.split("@")[0] ?? "Anon",
    avatarUrl: args.avatarUrl ?? undefined,
    walletBalanceCents: SIGNUP_GRANT_CENTS,
    quillBalance: SIGNUP_GRANT_QUILLS,
    // Configuration elevates an address that has already authenticated; it
    // grants nothing on its own.
    role: adminEmails().includes(email) ? "admin" : "user",
    isBanned: false,
    profilePublic: false,
    topicsBacked: 0,
    digestOptIn: true,
  });

  if (SIGNUP_GRANT_CENTS > 0) {
    // The ledger records credit that was given, not bought. Append-only,
    // same mutation as the balance it explains.
    await ctx.db.insert("creditTransactions", {
      userId,
      type: "grant",
      amountCents: SIGNUP_GRANT_CENTS,
    });
  }

  // Scheduled, not awaited: a mail service having a bad day must never fail
  // somebody's sign-up.
  await ctx.scheduler.runAfter(0, internal.notify.welcome, { userId });
  return userId;
}

export const ensure = mutation({
  args: {
    displayName: v.optional(v.string()),
    avatarUrl: v.optional(v.string()),
  },
  returns: v.id("users"),
  handler: async (ctx, args) => await ensureUser(ctx, args),
});

export const setDigestOptIn = mutation({
  args: { optIn: v.boolean() },
  returns: v.null(),
  handler: async (ctx, args) => {
    const user = await requireUser(ctx);
    await ctx.db.patch("users", user._id, { digestOptIn: args.optIn });
    return null;
  },
});

/**
 * Skip the result and go straight to the next question.
 *
 * A preference about a screen, not about a vote: what is cast, counted and
 * recorded is identical either way, and the vote can still be taken back — the
 * undo simply moves to the foot of the next question instead of living under
 * the result nobody asked to see.
 */
export const setSkipReveal = mutation({
  args: { skip: v.boolean() },
  returns: v.null(),
  handler: async (ctx, args) => {
    const user = await requireUser(ctx);
    await ctx.db.patch("users", user._id, { skipReveal: args.skip });
    return null;
  },
});

/**
 * Stamp the country from the edge.
 *
 * Internal, and called only from the HTTP route that can actually see the
 * request. A country arriving as a client argument would be a country the
 * client chose, and the whole country breakdown would be fiction.
 */
/**
 * Where a vote is counted from.
 *
 * A suspended account is skipped: nothing about it should keep moving, and a
 * country quietly updating on an account that cannot act is state changing
 * with nobody able to explain why.
 */
export const stampCountry = internalMutation({
  args: { authId: v.string(), countryCode: v.string() },
  returns: v.null(),
  handler: async (ctx, args) => {
    const code = args.countryCode.trim().toUpperCase();
    if (!/^[A-Z]{2}$/.test(code)) return null;

    const user = await ctx.db
      .query("users")
      .withIndex("by_auth", (q) => q.eq("authId", args.authId))
      .unique();
    // Geolocation fills a blank; it never overrides a country the user chose,
    // and nothing moves on a suspended account.
    if (user && !user.isBanned && !user.countryCode) {
      await ctx.db.patch("users", user._id, { countryCode: code });
    }
    return null;
  },
});

/**
 * The country a person says they are voting from.
 *
 * Geolocation fills the blank; this is the correction — somebody abroad, or
 * behind a VPN, or simply stamped wrong. It is capped, because the per-country
 * breakdown is a headline of the product and an account that could rewrite its
 * own country freely could walk a topic's map around the world by itself.
 *
 * The cap is counted from `countryChanges`, which is append-only: the rows are
 * both the rate limit and the audit trail, and no separate counter can drift
 * away from them.
 */
export const setCountry = mutation({
  args: { countryCode: v.string() },
  returns: v.null(),
  handler: async (ctx, args) => {
    const user = await requireUser(ctx);
    const code = args.countryCode.trim().toUpperCase();
    if (!/^[A-Z]{2}$/.test(code)) throw new Error("Two letters, ISO 3166-1.");
    if (code === user.countryCode) return null;

    // A calendar month back, counted over the append-only rows themselves.
    const since = Date.now() - 30 * 24 * 60 * 60 * 1000;
    const recent = await ctx.db
      .query("countryChanges")
      .withIndex("by_user", (q) => q.eq("userId", user._id))
      .order("desc")
      .take(LIMITS.countryChangesPerMonth + 1);
    if (
      recent.filter((r) => r._creationTime > since).length >=
      LIMITS.countryChangesPerMonth
    ) {
      throw new Error(
        `Country can be changed ${LIMITS.countryChangesPerMonth} times a month.`,
      );
    }

    await ctx.db.insert("countryChanges", {
      userId: user._id,
      fromCode: user.countryCode,
      toCode: code,
    });
    await ctx.db.patch("users", user._id, { countryCode: code });
    return null;
  },
});

/** Credit a wallet and record why, in one transaction. The only way in. */
export async function credit(
  ctx: MutationCtx,
  userId: Id<"users">,
  cents: number,
  quills: number,
  type: "purchase" | "grant" | "refund",
  provenance: { stripePaymentIntentId?: string; packId?: string } = {},
): Promise<void> {
  const user = await ctx.db.get("users", userId);
  if (!user) throw new Error("No such user.");

  await ctx.db.patch("users", userId, {
    walletBalanceCents: user.walletBalanceCents + cents,
    quillBalance: user.quillBalance + quills,
  });
  await ctx.db.insert("creditTransactions", {
    userId,
    type,
    amountCents: cents,
    stripePaymentIntentId: provenance.stripePaymentIntentId,
    packId: provenance.packId,
  });
}
