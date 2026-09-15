import { v } from "convex/values";

import { httpAction, internalAction } from "./_generated/server";
import { internal } from "./_generated/api";
import { publicSite } from "./config";
import * as tg from "./lib/tgApi";
import { COMMANDS, DESCRIPTION, NAME, SHORT } from "./lib/tgProfile";

/**
 * Where Telegram knocks.
 *
 * There is no session on this route — Telegram is the caller — so the only
 * thing between it and the open internet is the secret token we registered
 * with `setWebhook`, which Telegram echoes back in a header on every delivery.
 * Wrong or missing, and the update is dropped unread.
 *
 * **It always answers 200 once the secret checks out.** A 5xx makes Telegram
 * redeliver the same update on a loop, so the handler is scheduled and the
 * response goes back immediately: a bot that is slow to reply is a bot, and a
 * bot that 500s is a bot being hammered by its own retry.
 */

/** Constant-time compare. The digests are equal length, unlike the inputs. */
async function matches(got: string | null, expected: string): Promise<boolean> {
  if (!got) return false;
  const enc = new TextEncoder();
  const [a, b] = await Promise.all([
    crypto.subtle.digest("SHA-256", enc.encode(got)),
    crypto.subtle.digest("SHA-256", enc.encode(expected)),
  ]);
  const x = new Uint8Array(a);
  const y = new Uint8Array(b);
  let diff = 0;
  for (let i = 0; i < x.length; i++) diff |= x[i]! ^ y[i]!;
  return diff === 0;
}

export const webhook = httpAction(async (ctx, request) => {
  const expected = process.env.TELEGRAM_WEBHOOK_SECRET?.trim();
  const got = request.headers.get("x-telegram-bot-api-secret-token");
  if (!expected || !(await matches(got, expected))) {
    return new Response("Unauthorized", { status: 401 });
  }

  let update: unknown;
  try {
    update = await request.json();
  } catch {
    // Malformed body: acknowledge it so Telegram stops resending it.
    return new Response(JSON.stringify({ ok: true }), {
      headers: { "content-type": "application/json" },
    });
  }

  /* Scheduled rather than awaited. The conversation makes several Telegram
     calls, and Telegram gives a webhook a short deadline before it treats the
     delivery as failed and sends it again. */
  await ctx.scheduler.runAfter(0, internal.telegramBot.handle, { update });

  return new Response(JSON.stringify({ ok: true }), {
    headers: { "content-type": "application/json" },
  });
});

/**
 * Point Telegram at this deployment. Run from the CLI after a deploy:
 *
 *   npx convex run telegram:register '{}'
 *
 * Deliberately manual. Registering on boot would mean every developer running
 * the backend locally silently steals the bot's updates from production.
 */
export const register = internalAction({
  args: {},
  returns: v.object({ url: v.string(), ok: v.boolean() }),
  handler: async () => {
    const secret = process.env.TELEGRAM_WEBHOOK_SECRET?.trim();
    if (!secret) throw new Error("TELEGRAM_WEBHOOK_SECRET is not set.");
    if (!tg.configured()) throw new Error("TELEGRAM_BOT_TOKEN is not set.");

    /* The HTTP origin, not the site origin: `publicSite()` is where people
       browse, and Convex serves HTTP actions from the `.convex.site` host. */
    const url = `${httpOrigin()}/telegram/webhook`;
    const ok = (await tg.setWebhook(url, secret)) !== null;
    return { url, ok };
  },
});

/** What Telegram thinks of us: pending updates and the last delivery error. */
export const health = internalAction({
  args: {},
  returns: v.any(),
  handler: async () => (await tg.webhookInfo()) ?? { error: "no answer from Telegram" },
});

export const unregister = internalAction({
  args: {},
  returns: v.null(),
  handler: async () => {
    await tg.deleteWebhook();
    return null;
  },
});

/**
 * Where this deployment answers HTTP.
 *
 * `CONVEX_SITE_URL` is set by Convex itself; the fallback derives it from the
 * public site only if somebody has pointed that at the same deployment, which
 * is true here and stated rather than assumed.
 */
function httpOrigin(): string {
  const given = process.env.CONVEX_SITE_URL?.trim();
  if (given) return given.replace(/\/$/, "");
  return publicSite().replace(/\/$/, "");
}

/**
 * Push the bot's public copy to Telegram.
 *
 *   npx convex run telegram:describe '{}'
 *
 * Idempotent, and safe to re-run after editing `lib/tgProfile.ts` — which is
 * the point of it being there rather than in a form somebody filled in once.
 */
export const describe = internalAction({
  args: {},
  returns: v.object({
    name: v.boolean(),
    short: v.boolean(),
    description: v.boolean(),
    commands: v.boolean(),
  }),
  handler: async () => {
    if (!tg.configured()) throw new Error("TELEGRAM_BOT_TOKEN is not set.");
    /* Sequential, not parallel: Telegram rate-limits profile writes hard, and
       four at once is how one of them silently does not take. */
    const name = await tg.setMyName(NAME);
    const short = await tg.setMyShortDescription(SHORT);
    const description = await tg.setMyDescription(DESCRIPTION);
    const commands = await tg.setMyCommands(COMMANDS);
    return { name, short, description, commands };
  },
});
