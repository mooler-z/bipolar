/**
 * The slice of the Telegram Bot API this bot reads.
 *
 * Narrow types by hand rather than a client library: the surface is a handful
 * of methods and the updates already arrive through an HTTP action of our own,
 * so a framework would wrap one `fetch` and add a dependency to a backend that
 * has kept almost none.
 */

export type TgUser = { id: number; username?: string; first_name?: string };

export type TgChat = {
  id: number;
  type: "private" | "group" | "supergroup" | "channel";
};

export type TgMessage = {
  message_id: number;
  chat: TgChat;
  from?: TgUser;
  text?: string;
};

export type TgCallbackQuery = {
  id: string;
  from: TgUser;
  message?: TgMessage;
  data?: string;
};

export type TgUpdate = {
  update_id: number;
  message?: TgMessage;
  callback_query?: TgCallbackQuery;
};

export type TgButton = { text: string; callback_data?: string; url?: string };

export type TgInlineKeyboard = { inline_keyboard: TgButton[][] };

/**
 * The persistent menu above the text field. Tapping a button sends its label
 * as an ordinary message, so the bot matches on the label strings — which is
 * why they are a frozen constant rather than written inline twice.
 */
export type TgReplyKeyboard = {
  keyboard: { text: string }[][];
  resize_keyboard: boolean;
  is_persistent: boolean;
};

export type TgKeyboardRemove = { remove_keyboard: true };

export type TgReplyMarkup = TgInlineKeyboard | TgReplyKeyboard | TgKeyboardRemove;
