import { DISCOVERY, FIRECRAWL, keys } from "../config";

/**
 * Firecrawl: what the world is arguing about right now.
 *
 * bipolar has no editorial staff and no topic queue. Every question in the
 * feed starts as a page somebody published in the last day or two, and this is
 * the only thing that goes and finds them. Remove it and the feed stops
 * refilling — the app still runs, on whatever was minted before.
 *
 * Both calls return empty rather than throwing when the key is unset or the
 * service is unhappy. A discovery run that finds nothing is a quiet no-op; a
 * discovery run that throws would take the cron down with it.
 */

export type Finding = {
  title: string;
  url: string;
  snippet?: string;
};

/** Search the live web. Returns [] on any failure, including no key. */
export async function search(
  query: string,
  limit: number = DISCOVERY.resultsPerQuery,
): Promise<Finding[]> {
  const key = keys.firecrawl();
  if (!key) return [];

  try {
    const res = await fetch(FIRECRAWL.search, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${key}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        query,
        limit,
        // The last week only. A polarizing question about a year-old story
        // reads as a museum piece next to one from this morning.
        tbs: "qdr:w",
      }),
      signal: AbortSignal.timeout(FIRECRAWL.timeoutMs),
    });
    if (!res.ok) return [];

    const body = (await res.json()) as {
      data?: { web?: unknown[] } | unknown[];
    };
    const rows = Array.isArray(body.data)
      ? body.data
      : ((body.data?.web ?? []) as unknown[]);

    return rows.flatMap((row): Finding[] => {
      const r = row as { title?: string; url?: string; description?: string };
      if (!r.url) return [];
      return [
        {
          title: (r.title ?? r.url).trim(),
          url: r.url,
          snippet: r.description?.trim() || undefined,
        },
      ];
    });
  } catch {
    return [];
  }
}

/**
 * Read one page as markdown, for when a search snippet is too thin to write a
 * question from. Returns "" on any failure.
 */
export async function read(url: string): Promise<string> {
  const key = keys.firecrawl();
  if (!key) return "";

  try {
    const res = await fetch(FIRECRAWL.scrape, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${key}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ url, formats: ["markdown"], onlyMainContent: true }),
      signal: AbortSignal.timeout(FIRECRAWL.timeoutMs),
    });
    if (!res.ok) return "";

    const body = (await res.json()) as {
      data?: { markdown?: string };
      markdown?: string;
    };
    // Enough to characterise the argument; not enough to fill a prompt with
    // navigation and cookie banners.
    return (body.data?.markdown ?? body.markdown ?? "").slice(0, 6_000);
  } catch {
    return "";
  }
}
