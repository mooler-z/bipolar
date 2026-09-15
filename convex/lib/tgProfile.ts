/**
 * Everything Telegram shows about the bot before anybody talks to it.
 *
 * In the repository rather than typed into BotFather once, for the reason any
 * public copy belongs in a repository: it can be reviewed in a diff, it cannot
 * drift from what the product actually does without somebody seeing, and it
 * survives whoever set it up. `telegram:describe` pushes it.
 *
 * Telegram shows three different texts in three different places, and they are
 * not interchangeable:
 *
 *   **name** — the title at the top of the chat.
 *   **short description** — the one line under the name on the bot's profile
 *     card, and what shows in search results. Around 120 characters.
 *   **description** — the block on the empty-chat screen, which is the only
 *     one anybody reads *before* pressing Start. Up to 512.
 *
 * The voice is the product's: the one public description, said plainly, with
 * no adjectives doing work the mechanic already does.
 */

export const NAME = "bipolar";

/** Under the name, and in search. One line, no full stop needed. */
export const SHORT =
  "Vote LOVE or HATE on polarizing topics, and see what the people who paid to be counted actually think";

/** The empty-chat screen — the only copy read before Start is pressed. */
export const DESCRIPTION = [
  "Vote LOVE or HATE on polarizing topics.",
  "",
  "Every question is answered twice: by the crowd, for free, and by the people who paid to be counted. You see the split the moment you take a side.",
  "",
  "Connect your account and the bot deals you a question at a time. Votes here are the same votes — same record, same streak, same world map.",
].join("\n");

/** The slash-command menu. Kept short: the buttons are the real interface. */
export const COMMANDS: { command: string; description: string }[] = [
  { command: "start", description: "Connect, and get a question" },
  { command: "vote", description: "Deal the next question" },
  { command: "hot", description: "What the room is arguing about" },
  { command: "stats", description: "Your record" },
  { command: "votes", description: "Your last few votes" },
  { command: "signout", description: "Disconnect this chat" },
];
