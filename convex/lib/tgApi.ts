import type {
  TgInlineKeyboard,
  TgMessage,
  TgReplyMarkup,
  TgUser,
} from "./tgTypes";

/**
 * Talking to Telegram.
 *
 * Every call is best-effort and returns null rather than throwing. That is not
 * laziness — it is the only safe shape here. A webhook handler that throws
 * makes Telegram redeliver the same update, forever, and a Telegram hiccup
 * must never be the reason a vote that already committed looks like it failed.
 *
 * No token means every method is a silent no-op, so a deployment without the
 * bot configured behaves like a deployment without a bot rather than erroring
 * on a schedule.
 */

const API = "https://api.telegram.org";

function token(): string | null {
  const t = process.env.TELEGRAM_BOT_TOKEN?.trim();
  return t ? t : null;
}

export function configured(): boolean {
  return token() !== null;
}

async function call<T>(method: string, payload: Record<string, unknown>): Promise<T | null> {
  const t = token();
  if (!t) return null;
  try {
    const res = await fetch(`${API}/bot${t}/${method}`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(payload),
    });
    const body = (await res.json()) as { ok: boolean; result?: T; description?: string };
    if (!body.ok) {
      console.warn(`telegram ${method}: ${body.description ?? res.status}`);
      return null;
    }
    return body.result ?? null;
  } catch (err) {
    console.warn(`telegram ${method} unreachable: ${(err as Error).message}`);
    return null;
  }
}

/** Link previews stay off: a list of topics would unfurl the first one and
    push everything else off the screen. */
export function sendMessage(
  chatId: number | string,
  text: string,
  replyMarkup?: TgReplyMarkup,
): Promise<TgMessage | null> {
  return call<TgMessage>("sendMessage", {
    chat_id: chatId,
    text,
    parse_mode: "HTML",
    link_preview_options: { is_disabled: true },
    ...(replyMarkup ? { reply_markup: replyMarkup } : {}),
  });
}

/**
 * A photo card, by URL — Telegram fetches it itself.
 *
 * Fine for the vote card, and deliberately so: the card is the same picture
 * for everybody and Telegram caching it per URL is a saving rather than a bug.
 * A per-reader render would need a byte upload instead, because Telegram
 * caches a URL-photo effectively forever and the second send would show the
 * first one's numbers.
 */
export function sendPhoto(
  chatId: number | string,
  photo: string,
  caption: string,
  keyboard?: TgInlineKeyboard,
): Promise<TgMessage | null> {
  return call<TgMessage>("sendPhoto", {
    chat_id: chatId,
    photo,
    caption,
    parse_mode: "HTML",
    ...(keyboard ? { reply_markup: keyboard } : {}),
  });
}

/** The little toast after an inline tap. `url` may only ever be a
    `t.me/<bot>?start=…` deep link — Telegram refuses anything else. */
export function answerCallback(id: string, text?: string, url?: string): Promise<unknown> {
  return call("answerCallbackQuery", {
    callback_query_id: id,
    ...(text ? { text } : {}),
    ...(url ? { url } : {}),
  });
}

/** Best-effort. Telegram refuses to delete anything older than 48 hours. */
export async function deleteMessage(chatId: number, messageId: number): Promise<boolean> {
  return (await call<boolean>("deleteMessage", { chat_id: chatId, message_id: messageId })) === true;
}

/** Strip a dead card's buttons, for when deleting it was refused. */
export function stripButtons(chatId: number, messageId: number): Promise<unknown> {
  return call("editMessageReplyMarkup", {
    chat_id: chatId,
    message_id: messageId,
    reply_markup: { inline_keyboard: [] },
  });
}

export async function botUsername(): Promise<string | null> {
  return (await call<TgUser>("getMe", {}))?.username ?? null;
}

/** Point Telegram at us. The secret comes back on every delivery's header,
    which is the only thing standing between the webhook and the open web. */
export function setWebhook(url: string, secret: string): Promise<unknown> {
  return call("setWebhook", {
    url,
    secret_token: secret,
    allowed_updates: ["message", "callback_query"],
  });
}

export function deleteWebhook(): Promise<unknown> {
  return call("deleteWebhook", { drop_pending_updates: false });
}

export function webhookInfo(): Promise<{
  url: string;
  pending_update_count: number;
  last_error_message?: string;
} | null> {
  return call("getWebhookInfo", {});
}
