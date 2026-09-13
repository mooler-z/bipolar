import { WIKI } from "../config";

/**
 * One Wikipedia article, reduced to the three things a topic wants.
 *
 * The pipeline never *searches* for a picture. Whoever wrote the topic already
 * knew what it was about and named the article; this does one deterministic
 * lookup against that name. No image search, no relevance ranking, no key —
 * relevance ranking over a stock corpus is how a topic about Gaza ends up
 * illustrated with a photograph of a handshake.
 */
export type WikiSummary = {
  /** A rendered thumbnail at `WIKI.thumbWidth`, or null when the page has none. */
  imageUrl: string | null;
  /** The canonical article URL — the image's attribution, and a source link. */
  pageUrl: string | null;
  /** The opening sentences, used only when a topic has no description. */
  extract: string | null;
};

/**
 * The three possible answers, kept apart on purpose.
 *
 * `absent` and `unavailable` both mean "no picture right now", but they must
 * never be confused: `absent` is a real answer — this subject has no article,
 * or its article has no photograph — and the topic should be recorded and never
 * asked about again. `unavailable` means we could not ask, and recording that
 * would permanently mark a topic pictureless because Wikipedia was briefly
 * busy.
 */
export type WikiLookup =
  | { status: "found"; summary: WikiSummary }
  | { status: "absent" }
  | { status: "unavailable" };

/**
 * How many titles go in one request.
 *
 * **This is the whole design.** Wikipedia's anonymous quota is measured in
 * *requests*, not titles — measured live, it is exactly ten before a hard 429
 * that arrives in five milliseconds. Asking one title at a time burns the
 * entire quota on ten topics no matter how slowly it is paced. Asking fifty at
 * once resolves the whole backlog in two.
 */
const PER_REQUEST = 50;

/** Build the query for a batch of titles. */
export function queryUrl(titles: string[]): string {
  const params = new URLSearchParams({
    action: "query",
    format: "json",
    redirects: "1",
    titles: titles.join("|"),
    prop: "pageimages|extracts|info",
    piprop: "thumbnail",
    pithumbsize: String(WIKI.thumbWidth),
    exintro: "1",
    explaintext: "1",
    exlimit: "max",
    inprop: "url",
  });
  return `${WIKI.api}?${params.toString()}`;
}

/**
 * A disambiguation page would attach a photograph of the planet Mercury to a
 * topic about the element. These are the openings Wikipedia actually uses.
 */
const DISAMBIGUATION = /\b(may|can|commonly|usually) refers? to\b/i;

/** A title worth spending a slot on. */
export function usable(title: string): boolean {
  const clean = title.trim();
  if (!clean || clean.length > 120) return false;
  return !/^https?:\/\//i.test(clean) && !clean.includes("#");
}

/**
 * Look up many articles at once.
 *
 * Returns a verdict per **requested** title, which is not the same as the title
 * Wikipedia answers with: `redirects` and `normalized` rewrite them on the way
 * through, so "Elon musk" comes back as "Elon Musk" and has to be mapped home.
 *
 * Nothing here throws. A topic with no picture is the normal case — two thirds
 * of this feed is abstract, and none of it should carry a photograph.
 */
export async function fetchSummaries(
  titles: string[],
): Promise<Map<string, WikiLookup>> {
  const out = new Map<string, WikiLookup>();

  const asking: string[] = [];
  for (const t of titles) {
    if (usable(t)) asking.push(t.trim());
    else out.set(t, { status: "absent" });
  }
  if (asking.length === 0) return out;

  for (let i = 0; i < asking.length; i += PER_REQUEST) {
    const slice = asking.slice(i, i + PER_REQUEST);
    const answers = await askOnce(slice);
    for (const t of slice) out.set(t, answers.get(t) ?? { status: "unavailable" });
  }
  return out;
}

async function askOnce(titles: string[]): Promise<Map<string, WikiLookup>> {
  const out = new Map<string, WikiLookup>();
  try {
    const res = await fetch(queryUrl(titles), {
      headers: { "User-Agent": WIKI.userAgent, Accept: "application/json" },
      signal: AbortSignal.timeout(WIKI.timeoutMs),
    });
    /* 429 and 5xx are Wikipedia saying "not now", not "no such thing". */
    if (!res.ok) {
      if (res.status === 429 || res.status >= 500) return out;
      for (const t of titles) out.set(t, { status: "absent" });
      return out;
    }

    const body = (await res.json()) as {
      query?: {
        normalized?: { from: string; to: string }[];
        redirects?: { from: string; to: string }[];
        pages?: Record<
          string,
          {
            title?: string;
            missing?: string;
            thumbnail?: { source?: string };
            fullurl?: string;
            extract?: string;
          }
        >;
      };
    };
    const query = body.query;
    if (!query?.pages) return out;

    /* Walk the rewrites backwards: requested → normalised → redirected → the
       title the answer is filed under. */
    const landedAt = new Map<string, string>();
    for (const t of titles) landedAt.set(t, t);
    for (const step of [...(query.normalized ?? []), ...(query.redirects ?? [])]) {
      for (const [asked, current] of landedAt) {
        if (current === step.from) landedAt.set(asked, step.to);
      }
    }

    const byTitle = new Map<string, (typeof query.pages)[string]>();
    for (const page of Object.values(query.pages)) {
      if (page.title) byTitle.set(page.title, page);
    }

    for (const asked of titles) {
      const page = byTitle.get(landedAt.get(asked) ?? asked);
      if (!page || page.missing !== undefined) {
        out.set(asked, { status: "absent" });
        continue;
      }
      const extract = page.extract?.trim() || null;
      if (extract && DISAMBIGUATION.test(extract.slice(0, 200))) {
        out.set(asked, { status: "absent" });
        continue;
      }
      out.set(asked, {
        status: "found",
        summary: {
          imageUrl: page.thumbnail?.source ?? null,
          pageUrl: page.fullurl ?? null,
          extract,
        },
      });
    }
    return out;
  } catch {
    // A timeout or a dropped connection is also "could not ask".
    return out;
  }
}
