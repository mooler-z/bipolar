import { httpAction, type ActionCtx } from "./_generated/server";
import { api, components } from "./_generated/api";
import { publicSite } from "./config";

/**
 * Addresses a machine reads.
 *
 * The whole growth mechanic is a pasted topic link showing something real. A
 * static bundle cannot do that — a crawler gets an empty shell — so these
 * routes are registered ahead of the site in `http.ts` and answer with markup
 * built from the live counters.
 *
 * **And then a person clicks it.** For a while this route answered everybody
 * with the crawler's markup: a link out of the daily mail opened four lines of
 * Times New Roman with a blue "Open bipolar" underneath that led back to the
 * page you were already on. The address was a dead end for the only audience
 * that matters.
 *
 * So it is one page for both now. The app's own shell is fetched from the
 * static-hosting component, the live tags are spliced into its head, and the
 * readable summary goes inside `#root` where React replaces it the moment the
 * bundle boots. A crawler reads the tags and the summary; a person gets the
 * app, at the address they were sent.
 *
 * What may be shown is exactly the public half: the question, its context, and
 * the country lean. The two-layer aggregate is gated in the payload, and that
 * gate does not stop at the API — a preview that leaked the split would be the
 * same leak with a nicer font.
 */

function escape(text: string): string {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

/**
 * The deployed `index.html`, with its hashed script and stylesheet.
 *
 * Read from the hosting component rather than rebuilt here: the asset names
 * change on every deploy, and a hand-written shell would go stale the first
 * time the bundle was rebuilt and start serving a blank page.
 */
async function appShell(ctx: ActionCtx): Promise<string | null> {
  try {
    const asset = await ctx.runQuery(
      components.staticHosting.lib.resolveAssetForHttp,
      { path: "/index.html", spaFallback: true },
    );
    if (!asset?.storageUrl) return null;
    const res = await fetch(asset.storageUrl);
    return res.ok ? await res.text() : null;
  } catch {
    // The site not being deployed yet is a normal state, not a failure worth
    // taking the link preview down for.
    return null;
  }
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
   * A pasted bipolar link used to unfurl as bare text. `summary_large_image`
   * was already declared and there was never an image to go with it, which is
   * the worst of both — the card renders, empty. Topics without a picture are
   * left alone: a card with no image beats a card with a broken one.
   */
  const image = topic.imageUrl;
  const imageTags = image
    ? `\n<meta property="og:image" content="${escape(image)}">` +
      `\n<meta name="twitter:image" content="${escape(image)}">`
    : "";

  const head =
    `<meta name="description" content="${description}">` +
    `<link rel="canonical" href="${site}/t/${escape(topic.slug)}">` +
    `<meta property="og:type" content="website">` +
    `<meta property="og:title" content="${title}">` +
    `<meta property="og:description" content="${description}">` +
    `<meta property="og:url" content="${site}/t/${escape(topic.slug)}">` +
    `<meta name="twitter:card" content="${image ? "summary_large_image" : "summary"}">` +
    imageTags;

  /* What a machine reads, and what a person sees for the half second before
     the bundle boots. React clears `#root` on its first render, so this is a
     summary with a shelf life rather than markup two things fight over. */
  const summary =
    `<main style="max-width:44rem;margin:0 auto;padding:14vh 1.5rem;font:500 16px/1.5 Inter,system-ui,sans-serif">` +
    `<h1 style="font-size:clamp(1.8rem,5vw,3rem);letter-spacing:-0.03em;line-height:1.05">${title}</h1>` +
    `<p style="opacity:0.7">${description}</p>` +
    `<h2 style="font-size:0.8rem;letter-spacing:0.1em;text-transform:uppercase;opacity:0.5">Where people stand</h2>` +
    `<ul style="opacity:0.7">${leanLines}</ul>` +
    `<p style="opacity:0.5">Vote LOVE or HATE to see the full result.</p>` +
    `</main>`;

  const shell = await appShell(ctx);
  const html = shell
    ? shell
        // The shell's own title and description describe the whole product;
        // at this address the topic is the subject.
        .replace(/<title>[\s\S]*?<\/title>/i, `<title>${title} — bipolar</title>`)
        .replace(/<meta\s+name="description"[^>]*>/i, "")
        .replace("</head>", `${head}</head>`)
        .replace(/<div id="root">\s*<\/div>/, `<div id="root">${summary}</div>`)
    : /* No site deployed: the preview still has to work. */
      `<!doctype html><html lang="en"><head><meta charset="utf-8">` +
      `<meta name="viewport" content="width=device-width, initial-scale=1">` +
      `<title>${title} — bipolar</title>${head}</head><body>${summary}</body></html>`;

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
