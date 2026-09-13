import { httpAction } from "./_generated/server";
import { api } from "./_generated/api";
import { publicSite } from "./config";

/**
 * Addresses a machine reads.
 *
 * The whole growth mechanic is a pasted topic link showing something real. A
 * static bundle cannot do that — a crawler gets an empty shell — so these
 * routes are registered ahead of the site in `http.ts` and answer with markup
 * built from the live counters.
 *
 * What they may show is exactly the public half: the question, its context,
 * and the country lean. The two-layer aggregate is gated in the payload, and
 * that gate does not stop at the API — a preview that leaked the split would
 * be the same leak with a nicer font.
 */

function escape(text: string): string {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

export const topicPage = httpAction(async (ctx, request) => {
  const slug = new URL(request.url).pathname.replace(/^\/t\//, "").split("/")[0];
  const found = await ctx.runQuery(api.topics.bySlug, { slug });

  if (!found) {
    return new Response("Not found", {
      status: 404,
      headers: { "content-type": "text/plain" },
    });
  }

  const { topic, countries } = found;
  const site = publicSite();
  const title = escape(topic.question);
  const description = escape(
    topic.description ?? "LOVE it or HATE it. Vote to see what everyone else said.",
  );

  // The lean, not the counts. Enough to make the link worth pasting; not
  // enough to reconstruct what a reader has not yet earned.
  const leanLines = countries
    .slice(0, 12)
    .map(
      (c) =>
        `<li>${escape(c.countryCode)}: ${c.lovePct}% love ` +
        `<span data-sample="${c.sample}"></span></li>`,
    )
    .join("");

  /*
   * The link-preview picture.
   *
   * A pasted bi-polar link used to unfurl as bare text. `summary_large_image`
   * was already declared and there was never an image to go with it, which is
   * the worst of both — the card renders, empty. Topics without a picture are
   * left alone: a card with no image beats a card with a broken one.
   */
  const image = topic.imageUrl;
  const imageTags = image
    ? `\n<meta property="og:image" content="${escape(image)}">` +
      `\n<meta name="twitter:image" content="${escape(image)}">`
    : "";

  const html = `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${title} — bi-polar</title>
<meta name="description" content="${description}">
<link rel="canonical" href="${site}/t/${escape(topic.slug)}">
<meta property="og:type" content="website">
<meta property="og:title" content="${title}">
<meta property="og:description" content="${description}">
<meta property="og:url" content="${site}/t/${escape(topic.slug)}">
<meta name="twitter:card" content="${image ? "summary_large_image" : "summary"}">${imageTags}
</head>
<body>
<main>
<h1>${title}</h1>
<p>${description}</p>
<h2>Where people stand</h2>
<ul>${leanLines}</ul>
<p>Vote LOVE or HATE to see the full result.</p>
<p><a href="${site}/t/${escape(topic.slug)}">Open bi-polar</a></p>
</main>
</body>
</html>`;

  return new Response(html, {
    headers: {
      "content-type": "text/html; charset=utf-8",
      // Short, because the counters move. Long enough that a link pasted into
      // a busy chat does not re-render the page for every reader.
      "cache-control": "public, max-age=60",
    },
  });
});

export const robots = httpAction(async () => {
  const site = publicSite();
  const body =
    process.env.NOINDEX === "true"
      ? "User-agent: *\nDisallow: /\n"
      : `User-agent: *\nAllow: /\nSitemap: ${site}/sitemap.xml\n`;
  return new Response(body, { headers: { "content-type": "text/plain" } });
});

export const sitemap = httpAction(async (ctx) => {
  const site = publicSite();
  const topics = await ctx.runQuery(api.topics.list, { limit: 50 });
  const urls = topics
    .map(
      (t) =>
        `<url><loc>${site}/t/${escape(t.slug)}</loc><changefreq>hourly</changefreq></url>`,
    )
    .join("");
  return new Response(
    `<?xml version="1.0" encoding="UTF-8"?>` +
      `<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">` +
      `<url><loc>${site}/</loc></url>${urls}</urlset>`,
    { headers: { "content-type": "application/xml" } },
  );
});
