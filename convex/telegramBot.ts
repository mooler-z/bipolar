import { v } from "convex/values";

import { api, internal } from "./_generated/api";
import { internalAction, type ActionCtx } from "./_generated/server";
import { publicSite } from "./config";
import * as tg from "./lib/tgApi";
import {
  MENU,
  ballotCaption,
  escapeHtml,
  ballotKeyboard,
  hotMessage,
  menuKeyboard,
  myStatsMessage,
  myVotesMessage,
  signOutKeyboard,
  verdictToast,
} from "./lib/tgFormat";
import type { TgCallbackQuery, TgMessage, TgUpdate } from "./lib/tgTypes";

/**
 * The conversation.
 *
 * One live ballot at a time. A vote or a skip answers with a toast, **deletes
 * the card it was on**, and deals the next — so the chat is a stack of one
 * rather than a scroll of dead buttons somebody can tap a week later.
 *
 * An action, because it is nothing but network: every read and write goes
 * through the internal queries and mutations in `telegramData.ts`. That split
 * is what keeps a vote a real transaction — the Telegram round trips happen
 * either side of it, never inside it.
 *
 * Nothing in here throws. A webhook that throws makes Telegram redeliver the
 * same update on a loop, so a failure becomes a toast and the update is done.
 */

/**
 * The first thing that happens after connecting on the web.
 *
 * Scheduled by the redeem mutation, so by the time somebody gets back to the
 * chat the menu is installed and a question is already waiting. Coming back to
 * an empty chat that says nothing is how a connect flow ends in a shrug.
 *
 * It clears the invitations first. A CONNECT button left in a chat that is
 * already connected is a dead card — the same thing an answered ballot is, and
 * it goes the same way.
 */
export const greet = internalAction({
  args: {
    chatId: v.number(),
    userId: v.id("users"),
    name: v.string(),
    /** The connect prompts this account was offered, now spent. */
    stale: v.optional(v.array(v.number())),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    for (const messageId of args.stale ?? []) {
      await clear(args.chatId, messageId);
    }
    await tg.sendMessage(
      args.chatId,
      `Connected. You vote here as <b>${escapeHtml(args.name)}</b> — same record, same streak.`,
      menuKeyboard(),
    );
    await deal(ctx, args.chatId, args.userId);
    return null;
  },
});

export const handle = internalAction({
  args: { update: v.any() },
  returns: v.null(),
  handler: async (ctx, args) => {
    const update = args.update as TgUpdate;
    try {
      if (update.message) await onMessage(ctx, update.message);
      else if (update.callback_query) await onCallback(ctx, update.callback_query);
    } catch (err) {
      console.error(`telegram update ${update?.update_id} failed`, err);
    }
    return null;
  },
});

async function onMessage(ctx: ActionCtx, msg: TgMessage): Promise<void> {
  // Private chats only. The bot has nothing to say in a group.
  if (msg.chat.type !== "private" || !msg.from) return;

  const account = await ctx.runQuery(internal.telegramLink.accountFor, {
    telegramUserId: String(msg.from.id),
  });
  if (!account) return await offerConnect(ctx, msg);

  const text = (msg.text ?? "").trim();
  const site = publicSite();

  switch (text) {
    case MENU.myVotes: {
      const rows = await ctx.runQuery(internal.telegramData.recentVotes, {
        userId: account.userId,
      });
      await tg.sendMessage(msg.chat.id, myVotesMessage(rows, site, Date.now()));
      return;
    }
    case MENU.myStats: {
      const stats = await ctx.runQuery(internal.telegramData.myStats, {
        userId: account.userId,
      });
      await tg.sendMessage(msg.chat.id, myStatsMessage(stats));
      return;
    }
    case MENU.hot: {
      /* The public board, unchanged — it ranks on sparks, so "hot" here means
         what the web calls hot rather than a second definition of the word. */
      const rows = await ctx.runQuery(api.leaderboards.hottest, { limit: 5 });
      await tg.sendMessage(msg.chat.id, hotMessage(rows, site));
      return;
    }
    case MENU.signOut:
      await tg.sendMessage(
        msg.chat.id,
        "Sign out of this chat? Your account and every vote stay — only Telegram disconnects.",
        signOutKeyboard(),
      );
      return;
    default:
      break;
  }

  /* The slash commands do what the menu buttons do. Two doors to one room:
     the buttons are the real interface, but a command menu is what somebody
     types when they have forgotten there are buttons. */
  const command = text.split(/[\s@]/)[0];
  switch (command) {
    case "/hot":
      return await onMessage(ctx, { ...msg, text: MENU.hot });
    case "/stats":
      return await onMessage(ctx, { ...msg, text: MENU.myStats });
    case "/votes":
      return await onMessage(ctx, { ...msg, text: MENU.myVotes });
    case "/signout":
      return await onMessage(ctx, { ...msg, text: MENU.signOut });
    case "/start":
      await tg.sendMessage(msg.chat.id, "Menu below. Dealing…", menuKeyboard());
      break;
  }
  return await deal(ctx, msg.chat.id, account.userId);
}

/** The first thing an unlinked chat ever sees. */
async function offerConnect(ctx: ActionCtx, msg: TgMessage): Promise<void> {
  const code = await ctx.runMutation(internal.telegramLink.issueCode, {
    telegramUserId: String(msg.from!.id),
    username: msg.from!.username,
    chatId: msg.chat.id,
  });
  const sent = await tg.sendMessage(
    msg.chat.id,
    "<b>bipolar</b> — vote LOVE or HATE on polarizing topics, and see what the " +
      "people who paid to be counted actually think.\n\nConnect your account to vote from here:",
    {
      inline_keyboard: [
        [{ text: "CONNECT ACCOUNT", url: `${publicSite()}/link/telegram?code=${code}` }],
      ],
    },
  );
  // Remembered so connecting can take the button back down. Best-effort: a
  // prompt whose id never arrived simply stays, which is the old behaviour.
  if (sent) {
    await ctx.runMutation(internal.telegramLink.notePrompt, {
      code,
      messageId: sent.message_id,
    });
  }
}

async function onCallback(ctx: ActionCtx, cb: TgCallbackQuery): Promise<void> {
  const chat = cb.message?.chat;
  const [op, a, b] = (cb.data ?? "").split(":");
  if (!chat || !op) {
    await tg.answerCallback(cb.id);
    return;
  }

  const account = await ctx.runQuery(internal.telegramLink.accountFor, {
    telegramUserId: String(cb.from.id),
  });
  if (!account) {
    await tg.answerCallback(cb.id, "Not connected. Send /start first.");
    return;
  }
  const messageId = cb.message!.message_id;

  switch (op) {
    case "v": {
      if (!a || (b !== "love" && b !== "hate")) break;
      const out = await ctx.runMutation(internal.telegramData.castFor, {
        userId: account.userId,
        topicId: a as never,
        choice: b,
      });
      if (!out.ok) {
        await tg.answerCallback(cb.id, out.why);
        return;
      }
      await tg.answerCallback(
        cb.id,
        verdictToast({ freeLove: out.freeLove, freeHate: out.freeHate }, b),
      );
      await clear(chat.id, messageId);
      return await deal(ctx, chat.id, account.userId);
    }
    case "s": {
      if (!a) break;
      await ctx.runMutation(internal.telegramData.skipFor, {
        userId: account.userId,
        topicId: a as never,
      });
      await tg.answerCallback(cb.id, "Skipped");
      await clear(chat.id, messageId);
      return await deal(ctx, chat.id, account.userId);
    }
    case "so": {
      if (a === "y") {
        await ctx.runMutation(internal.telegramLink.unlink, {
          telegramUserId: String(cb.from.id),
        });
        await tg.answerCallback(cb.id, "Signed out");
        await tg.deleteMessage(chat.id, messageId);
        await tg.sendMessage(chat.id, "Disconnected. Send /start to reconnect.", {
          remove_keyboard: true,
        });
      } else {
        await tg.answerCallback(cb.id);
        await tg.deleteMessage(chat.id, messageId);
      }
      return;
    }
  }
  await tg.answerCallback(cb.id);
}

/**
 * A card that has been answered goes away.
 *
 * Telegram refuses to delete anything older than 48 hours, so when that fails
 * the buttons are stripped instead — a dead card that can still be tapped is
 * how somebody votes twice on a question they answered last week.
 */
async function clear(chatId: number, messageId: number): Promise<void> {
  if (!(await tg.deleteMessage(chatId, messageId))) {
    await tg.stripButtons(chatId, messageId);
  }
}

/** Deal the next question: its own vote card as a photo where there is one. */
async function deal(ctx: ActionCtx, chatId: number, userId: string): Promise<void> {
  const next = await ctx.runQuery(internal.telegramData.nextBallot, {
    userId: userId as never,
  });
  if (!next) {
    await tg.sendMessage(chatId, "All caught up. New topics land through the day.");
    return;
  }

  const caption = ballotCaption(next, publicSite());
  const keyboard = ballotKeyboard(next.topicId);

  /* The card the link preview uses, as the ballot's picture. It is drawn per
     request from live numbers, and it is the same picture whatever chat it
     lands in — so Telegram caching it per URL costs nothing. */
  const card = `${publicSite()}/card/${next.slug}.png`;
  if (await tg.sendPhoto(chatId, card, caption, keyboard)) return;

  // Telegram could not fetch it. A text card still carries the question.
  await tg.sendMessage(chatId, caption, keyboard);
}
