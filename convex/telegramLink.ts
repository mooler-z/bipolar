import { v } from "convex/values";

import { internal } from "./_generated/api";
import {
  internalMutation,
  internalQuery,
  mutation,
  query,
  type QueryCtx,
} from "./_generated/server";
import type { Id } from "./_generated/dataModel";
import { requireUser, currentUser } from "./users";

/**
 * Attaching a Telegram account to a bipolar one.
 *
 * The bot mints a single-use code, bakes it into a web link, and the
 * **signed-in browser** redeems it. That direction matters: the bot knows a
 * Telegram id and nothing else, so it cannot be the side that decides which
 * account is meant. Only a live session can say that.
 *
 * And the redeem is an explicit act, never something a page does on load. A
 * link is a thing people forward; a page that attaches on sight would let a
 * forwarded link silently bind somebody else's Telegram account to whoever
 * opened it.
 *
 * **One each way.** A Telegram account reaches exactly one bipolar account,
 * and a bipolar account is reachable from exactly one Telegram account.
 * Convex has no unique index, so — exactly as with the vote rule — that is
 * the index read before the write, and it is tested.
 */

/** Long enough to go and sign in; short enough that a chat history is not a
    standing credential. */
const CODE_TTL_MS = 15 * 60 * 1000;

/** Who is this Telegram id? The bot's hot path — every update starts here. */
export async function userIdFor(
  ctx: QueryCtx,
  telegramUserId: string,
): Promise<Id<"users"> | null> {
  const row = await ctx.db
    .query("telegramAccounts")
    .withIndex("by_telegram", (q) => q.eq("telegramUserId", telegramUserId))
    .unique();
  return row?.userId ?? null;
}

export const accountFor = internalQuery({
  args: { telegramUserId: v.string() },
  returns: v.union(v.null(), v.object({ userId: v.id("users"), name: v.string() })),
  handler: async (ctx, args) => {
    const userId = await userIdFor(ctx, args.telegramUserId);
    if (!userId) return null;
    const user = await ctx.db.get("users", userId);
    if (!user) return null;
    return { userId, name: user.displayName };
  },
});

/** Which message carried the button, so connecting can take it back down. */
export const notePrompt = internalMutation({
  args: { code: v.string(), messageId: v.number() },
  returns: v.null(),
  handler: async (ctx, args) => {
    const row = await ctx.db
      .query("telegramCodes")
      .withIndex("by_code", (q) => q.eq("code", args.code))
      .unique();
    if (row) await ctx.db.patch("telegramCodes", row._id, { promptMessageId: args.messageId });
    return null;
  },
});

/** Mint a code for a Telegram user who is not linked yet. */
export const issueCode = internalMutation({
  args: {
    telegramUserId: v.string(),
    username: v.optional(v.string()),
    chatId: v.number(),
  },
  returns: v.string(),
  handler: async (ctx, args) => {
    /* Random, not derived from the Telegram id: a guessable code is a code
       that attaches a stranger's chat to whoever guesses it. */
    const code = crypto.randomUUID().replaceAll("-", "");
    await ctx.db.insert("telegramCodes", {
      code,
      telegramUserId: args.telegramUserId,
      username: args.username,
      chatId: args.chatId,
      expiresAt: Date.now() + CODE_TTL_MS,
    });
    return code;
  },
});

/**
 * Redeem, from the web, as the signed-in user.
 *
 * A mutation cannot `fetch`, so the greeting is scheduled rather than sent:
 * by the time somebody gets back to the chat the menu is installed and a
 * question is already waiting. Scheduling it from inside the transaction is
 * what makes that true — a greeting cannot go out for a link that did not
 * commit, and a link that committed always gets one.
 */
export const redeem = mutation({
  args: { code: v.string() },
  returns: v.object({
    chatId: v.number(),
    name: v.string(),
    /** Where to send them back to, when the deployment knows its own handle. */
    botHandle: v.union(v.null(), v.string()),
  }),
  handler: async (ctx, args) => {
    const user = await requireUser(ctx);

    const pending = await ctx.db
      .query("telegramCodes")
      .withIndex("by_code", (q) => q.eq("code", args.code))
      .unique();
    if (!pending || pending.usedAt !== undefined || pending.expiresAt < Date.now()) {
      throw new Error("That link has expired. Send /start to the bot for a fresh one.");
    }
    // Spent before anything else is read, so a code cannot be redeemed twice
    // even by two requests arriving together.
    await ctx.db.patch("telegramCodes", pending._id, { usedAt: Date.now() });

    const byTelegram = await ctx.db
      .query("telegramAccounts")
      .withIndex("by_telegram", (q) => q.eq("telegramUserId", pending.telegramUserId))
      .unique();
    if (byTelegram && byTelegram.userId !== user._id) {
      throw new Error("That Telegram account is already connected to another bipolar account.");
    }

    const byUser = await ctx.db
      .query("telegramAccounts")
      .withIndex("by_user", (q) => q.eq("userId", user._id))
      .unique();
    if (byUser && byUser.telegramUserId !== pending.telegramUserId) {
      throw new Error("Your account is already connected to a different Telegram account.");
    }

    if (!byTelegram) {
      await ctx.db.insert("telegramAccounts", {
        userId: user._id,
        telegramUserId: pending.telegramUserId,
        username: pending.username,
        chatId: pending.chatId,
      });
    } else {
      // Re-linking the same pair is idempotent; refresh where to talk to them.
      await ctx.db.patch("telegramAccounts", byTelegram._id, { chatId: pending.chatId });
    }

    /* Every outstanding invitation for this Telegram account is spent, not
       just the one that was used. Somebody who messaged the bot three times
       has three live CONNECT buttons, and each is a code that still works —
       so this closes the others as credentials and collects their messages so
       the chat can be tidied of them at the same time. */
    const stale: number[] = [];
    const outstanding = await ctx.db
      .query("telegramCodes")
      .withIndex("by_telegram", (q) => q.eq("telegramUserId", pending.telegramUserId))
      .collect();
    for (const row of outstanding) {
      if (row.promptMessageId !== undefined) stale.push(row.promptMessageId);
      if (row.usedAt === undefined) {
        await ctx.db.patch("telegramCodes", row._id, { usedAt: Date.now() });
      }
    }

    await ctx.scheduler.runAfter(0, internal.telegramBot.greet, {
      chatId: pending.chatId,
      userId: user._id,
      name: user.displayName,
      stale,
    });

    return {
      chatId: pending.chatId,
      name: user.displayName,
      botHandle: process.env.TELEGRAM_BOT_USERNAME?.trim() ?? null,
    };
  },
});

/** Whether this account has a Telegram attached, for the web page. */
export const status = query({
  args: {},
  returns: v.object({
    linked: v.boolean(),
    username: v.union(v.null(), v.string()),
    botHandle: v.union(v.null(), v.string()),
  }),
  handler: async (ctx) => {
    const botHandle = process.env.TELEGRAM_BOT_USERNAME?.trim() ?? null;
    const user = await currentUser(ctx);
    if (!user) return { linked: false, username: null, botHandle };
    const row = await ctx.db
      .query("telegramAccounts")
      .withIndex("by_user", (q) => q.eq("userId", user._id))
      .unique();
    return { linked: row !== null, username: row?.username ?? null, botHandle };
  },
});

/** Sign out of the chat. The account and every vote it cast stay — only the
    join goes, which is the whole promise the confirm step makes. */
export const unlink = internalMutation({
  args: { telegramUserId: v.string() },
  returns: v.null(),
  handler: async (ctx, args) => {
    const row = await ctx.db
      .query("telegramAccounts")
      .withIndex("by_telegram", (q) => q.eq("telegramUserId", args.telegramUserId))
      .unique();
    if (row) await ctx.db.delete("telegramAccounts", row._id);
    return null;
  },
});
