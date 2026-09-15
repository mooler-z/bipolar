import type { TgInlineKeyboard, TgReplyKeyboard } from "./tgTypes";

/**
 * What the bot says, and nothing about how it says it.
 *
 * Pure, so the wording is testable without a network. The house voice carries
 * over from the web — terse, past tense, no hype — with one deliberate
 * difference: **Telegram is emoji-native**. The web app is icons-only and
 * bans emoji outright; a chat that refuses them reads as a form rather than as
 * something somebody made, so buttons and menu labels use them here.
 *
 * Money words stay off. Sparks are a wallet thing and the bot does not spend
 * anybody's balance — every vote it casts is free.
 */

/** Telegram's HTML parse mode needs exactly these three escaped. */
export function escapeHtml(value: string): string {
  return value.replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;");
}

/** The menu labels. The bot matches incoming text against these, so they are
    one constant rather than the same string written in two places. */
export const MENU = {
  vote: "🗳 Vote",
  hot: "🔥 Hot now",
  myVotes: "🕒 My votes",
  myStats: "📊 My stats",
  signOut: "🚪 Sign out",
} as const;

export function menuKeyboard(): TgReplyKeyboard {
  return {
    keyboard: [
      [{ text: MENU.vote }, { text: MENU.hot }],
      [{ text: MENU.myVotes }, { text: MENU.myStats }],
      [{ text: MENU.signOut }],
    ],
    resize_keyboard: true,
    is_persistent: true,
  };
}

/**
 * The ballot's buttons.
 *
 * `callback_data` is capped at 64 bytes by Telegram. A Convex document id is
 * around 32 characters, so `v:<id>:love` lands near 40 — inside the cap, but
 * close enough that it is worth saying out loud rather than rediscovering when
 * a longer id silently breaks every button.
 */
export function ballotKeyboard(topicId: string): TgInlineKeyboard {
  return {
    inline_keyboard: [
      [
        { text: "❤️ LOVE", callback_data: `v:${topicId}:love` },
        { text: "💔 HATE", callback_data: `v:${topicId}:hate` },
      ],
      [{ text: "⏭ SKIP", callback_data: `s:${topicId}` }],
    ],
  };
}

/** A stray tap must not disconnect anybody, so signing out is confirmed. */
export function signOutKeyboard(): TgInlineKeyboard {
  return {
    inline_keyboard: [
      [
        { text: "🚪 Sign out", callback_data: "so:y" },
        { text: "Cancel", callback_data: "so:n" },
      ],
    ],
  };
}

/** The question, as a tap-through to the page that carries its card. */
export function topicLink(question: string, slug: string, site: string): string {
  return `<a href="${site}/t/${slug}">${escapeHtml(question)}</a>`;
}

/** The ballot itself: the linked question, then what is known about the room. */
export function ballotCaption(
  topic: { question: string; slug: string; categoryName?: string; voteCount: number },
  site: string,
): string {
  const room = topic.voteCount === 0 ? "first vote" : `${count(topic.voteCount)} votes`;
  const tag = hashtag(topic.categoryName ?? "");
  return `<b>${topicLink(topic.question, topic.slug, site)}</b>\n${tag ? `${tag} · ` : ""}${room}`;
}

/**
 * The toast after a tap.
 *
 * This is the one place the bot shows a result, and it shows the crowd's lean
 * only — the same half the card and the link preview carry. The Committed
 * layer is what voting or paying for on the web buys, and a toast is not a
 * back door to it.
 */
export function verdictToast(
  stats: { freeLove: number; freeHate: number },
  choice: "love" | "hate",
): string {
  return `You: ${choice.toUpperCase()} ✓ · ${verdictLine(stats.freeLove, stats.freeHate)}`;
}

export function verdictLine(love: number, hate: number): string {
  const total = love + hate;
  if (total === 0) return "No votes yet";
  const lovePct = Math.round((love / total) * 100);
  const hatePct = 100 - lovePct;
  if (love === hate) return `SPLIT ${lovePct}/${hatePct}`;
  return love > hate
    ? `LOVED ${lovePct}% · HATED ${hatePct}%`
    : `HATED ${hatePct}% · LOVED ${lovePct}%`;
}

/** 1234 → "1.2k". A chat line is narrow and a full number earns nothing. */
export function count(n: number): string {
  if (n < 1000) return String(n);
  const k = n / 1000;
  return `${k >= 10 ? Math.round(k) : Math.round(k * 10) / 10}k`;
}

/** "Ancient Rome" → "#AncientRome": a tag Telegram makes tappable, rather
    than a floating word that reads like a typo. */
function hashtag(category: string): string {
  const compact = category.replace(/[^\p{L}\p{N}]+/gu, "");
  return compact ? `#${compact}` : "";
}

/** One page of somebody's own voting history. */
export function myVotesMessage(
  rows: { question: string; slug: string; choice: string; at: number }[],
  site: string,
  now: number,
): string {
  if (rows.length === 0) return "Nothing yet. Tap 🗳 Vote and pick a side.";
  const lines = rows.map((row) => {
    const mark = row.choice === "love" ? "❤️" : "💔";
    return `${mark} ${topicLink(row.question, row.slug, site)}  <i>${ago(row.at, now)}</i>`;
  });
  return `<b>🕒 Your last ${rows.length}</b>\n\n${lines.join("\n")}`;
}

export function myStatsMessage(s: {
  votes: number;
  love: number;
  hate: number;
  streak: number;
  accuracy: number | null;
}): string {
  if (s.votes === 0) return "No votes yet. Tap 🗳 Vote to start.";
  const lean = s.love >= s.hate ? "lover" : "hater";
  const [lovePct] = [Math.round((s.love / Math.max(1, s.votes)) * 100)];
  return [
    `<b>📊 Your record</b>`,
    ``,
    `Votes cast · <b>${count(s.votes)}</b>`,
    `Split · ❤️ ${lovePct}%  💔 ${100 - lovePct}%  (a ${lean})`,
    s.accuracy === null
      ? `Calls · none yet`
      : `Calls right · <b>${s.accuracy}%</b>  ·  streak ${s.streak}`,
  ].join("\n");
}

/** What the room is arguing about now. */
export function hotMessage(
  rows: { question: string; slug: string; votes: number }[],
  site: string,
): string {
  if (rows.length === 0) return "Nothing hot yet today.";
  const lines = rows.map(
    (row, i) =>
      `${i + 1}. ${topicLink(row.question, row.slug, site)} · <i>${count(row.votes)}</i>`,
  );
  return `<b>🔥 Hot now</b>\n\n${lines.join("\n")}`;
}

/** Terse relative time. A chat does not want "3 minutes ago" spelled out. */
export function ago(at: number, now: number): string {
  const s = Math.max(0, Math.floor((now - at) / 1000));
  if (s < 60) return "just now";
  const m = Math.floor(s / 60);
  if (m < 60) return `${m}m`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h`;
  return `${Math.floor(h / 24)}d`;
}
