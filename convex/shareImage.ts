import { v } from "convex/values";

import { httpAction, internalQuery } from "./_generated/server";
import { internal } from "./_generated/api";
import { pctOf, renderVoteCard } from "./lib/voteCard";

/**
 * The card, at an address.
 *
 * `seo.ts` already answers a pasted link with the live tags; this is the
 * picture those tags point at. It is drawn per request rather than stored,
 * because the thing it shows changes every time somebody votes and a cached
 * card is a card that is wrong — and because the only client that ever fetches
 * it is an unfurler, roughly once per paste.
 *
 * **Nothing here is gated, because nothing here is gated data.** The card
 * carries the crowd's lean, which `seo.ts` already publishes as text, and
 * never the Crowd/Committed split, which is what voting or paying buys.
 *
 * A slug that names no topic gets a 404 rather than an empty card: an unfurler
 * that receives a valid picture will show it, and a blank grey rectangle under
 * somebody's link is worse than no picture at all.
 */

export const splitFor = internalQuery({
  args: { slug: v.string() },
  returns: v.union(
    v.null(),
    v.object({
      question: v.string(),
      freeLove: v.number(),
      freeHate: v.number(),
    }),
  ),
  handler: async (ctx, args) => {
    const topic = await ctx.db
      .query("topics")
      .withIndex("by_slug", (q) => q.eq("slug", args.slug))
      .unique();
    if (!topic) return null;

    const row = await ctx.db
      .query("topicStats")
      .withIndex("by_topic", (q) => q.eq("topicId", topic._id))
      .unique();
    return {
      question: topic.question,
      freeLove: row?.freeLove ?? 0,
      freeHate: row?.freeHate ?? 0,
    };
  },
});

export const card = httpAction(async (ctx, request) => {
  const slug = new URL(request.url).pathname
    .replace(/^\/card\//, "")
    .replace(/\.png$/, "")
    .split("/")[0];

  const split = await ctx.runQuery(internal.shareImage.splitFor, { slug: slug ?? "" });
  if (!split) return new Response("Not found", { status: 404 });

  const png = renderVoteCard(pctOf(split.freeLove, split.freeHate), split.question);
  /* The bytes as their own buffer. A `Uint8Array` can be a window onto a
     larger one, and handing that straight to `Response` is how a body ends up
     carrying whatever happened to sit next to it in memory. */
  const body = png.buffer.slice(png.byteOffset, png.byteOffset + png.byteLength) as ArrayBuffer;
  return new Response(body, {
    headers: {
      "content-type": "image/png",
      "content-length": String(png.byteLength),
      /* Short, and shared. The numbers move, so a card cached for a day is a
         card that lies for a day; five minutes is long enough that a link
         pasted into a busy channel is drawn once rather than per reader. */
      "cache-control": "public, max-age=300, s-maxage=300",
    },
  });
});
