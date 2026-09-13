/// <reference types="vite/client" />
import { afterEach, describe, expect, test, vi } from "vitest";

import { WIKI } from "./config";
import { fetchSummaries, queryUrl } from "./lib/wikipedia";

/**
 * The image fetcher.
 *
 * Two rules are guarded here.
 *
 * *"A topic with no picture is the normal case"* — nothing throws, because
 * every one of these paths is reached by real topics daily: an abstract subject
 * with no article, a model naming a page that does not exist, a disambiguation
 * page.
 *
 * *"Never record an answer you did not get"* — `absent` and `unavailable` are
 * kept apart, because stamping a rate-limited lookup as "no picture" marks a
 * topic pictureless forever over a moment of throttling. That one is not
 * hypothetical: it happened on the first live run, and this is the test that
 * would have caught it.
 */

const ok = (body: unknown) =>
  ({ ok: true, json: async () => body }) as unknown as Response;

function pages(...rows: Record<string, unknown>[]) {
  return {
    query: {
      pages: Object.fromEntries(rows.map((r, i) => [String(i), r])),
    },
  };
}

/** One title in, one verdict out — the shape most of these tests want. */
async function lookup(title: string) {
  return (await fetchSummaries([title])).get(title);
}

afterEach(() => vi.unstubAllGlobals());

describe("the query", () => {
  test("asks for the width we actually render at", () => {
    const url = queryUrl(["Tokyo Tower"]);
    expect(url).toContain(`pithumbsize=${WIKI.thumbWidth}`);
    expect(url).toContain("redirects=1");
  });

  test("encodes titles that would otherwise break the URL", () => {
    const url = queryUrl(["Mercury (element) & friends/others"]);
    expect(() => new URL(url)).not.toThrow();
    expect(url).toContain("Mercury+%28element%29+%26+friends%2Fothers");
  });
});

describe("what comes back", () => {
  test("a real article yields the image, the page and the extract", async () => {
    vi.stubGlobal("fetch", async () =>
      ok(
        pages({
          title: "Foo",
          thumbnail: { source: "https://upload.wikimedia.org/x/640px-Foo.jpg" },
          fullurl: "https://en.wikipedia.org/wiki/Foo",
          extract: "Foo is a thing.",
        }),
      ),
    );
    expect(await lookup("Foo")).toEqual({
      status: "found",
      summary: {
        imageUrl: "https://upload.wikimedia.org/x/640px-Foo.jpg",
        pageUrl: "https://en.wikipedia.org/wiki/Foo",
        extract: "Foo is a thing.",
      },
    });
  });

  test("an article with no picture is a result, not a failure", async () => {
    vi.stubGlobal("fetch", async () =>
      ok(
        pages({
          title: "Tipping",
          fullurl: "https://en.wikipedia.org/wiki/Tipping",
          extract: "A gratuity.",
        }),
      ),
    );
    const out = await lookup("Tipping");
    expect(out?.status).toBe("found");
    expect(out?.status === "found" && out.summary.imageUrl).toBeNull();
  });

  test("a disambiguation page is refused", async () => {
    vi.stubGlobal("fetch", async () =>
      ok(
        pages({
          title: "Mercury",
          extract: "Mercury most commonly refers to: the planet, the element.",
        }),
      ),
    );
    expect(await lookup("Mercury")).toEqual({ status: "absent" });
  });

  test("a title the model invented is refused", async () => {
    vi.stubGlobal("fetch", async () =>
      ok(pages({ title: "Not A Real Article 9f2", missing: "" })),
    );
    expect(await lookup("Not A Real Article 9f2")).toEqual({ status: "absent" });
  });
});

describe("an answer we did not get is never recorded", () => {
  test("being rate limited is unavailable, not absent", async () => {
    vi.stubGlobal("fetch", async () => ({ ok: false, status: 429 }) as Response);
    expect(await lookup("Elon Musk")).toEqual({ status: "unavailable" });
  });

  test("a server error is unavailable", async () => {
    vi.stubGlobal("fetch", async () => ({ ok: false, status: 503 }) as Response);
    expect(await lookup("Elon Musk")).toEqual({ status: "unavailable" });
  });

  test("a timeout or dropped connection is unavailable", async () => {
    vi.stubGlobal("fetch", async () => {
      throw new Error("network down");
    });
    expect(await lookup("Foo")).toEqual({ status: "unavailable" });
  });

  test("malformed JSON is unavailable", async () => {
    vi.stubGlobal("fetch", async () =>
      ({
        ok: true,
        json: async () => {
          throw new Error("not json");
        },
      }) as unknown as Response);
    expect(await lookup("Foo")).toEqual({ status: "unavailable" });
  });

  test("a 404 is a real answer — absent", async () => {
    vi.stubGlobal("fetch", async () => ({ ok: false, status: 404 }) as Response);
    expect(await lookup("Foo")).toEqual({ status: "absent" });
  });
});

describe("the whole point: one request, many titles", () => {
  test("fifty titles cost one request, not fifty", async () => {
    const calls = vi.fn(async () =>
      ok(
        pages(
          ...Array.from({ length: 50 }, (_, i) => ({
            title: `T${i}`,
            thumbnail: { source: `https://img/${i}.jpg` },
          })),
        ),
      ),
    );
    vi.stubGlobal("fetch", calls);

    const asked = Array.from({ length: 50 }, (_, i) => `T${i}`);
    const out = await fetchSummaries(asked);

    // Wikipedia's anonymous quota is ten REQUESTS. One-at-a-time would spend
    // it on the first ten topics and be refused for the rest.
    expect(calls).toHaveBeenCalledTimes(1);
    expect(out.size).toBe(50);
    expect(out.get("T49")).toMatchObject({ status: "found" });
  });

  test("a redirected title is mapped back to the one that was asked for", async () => {
    vi.stubGlobal("fetch", async () =>
      ok({
        query: {
          redirects: [{ from: "Elon musk", to: "Elon Musk" }],
          pages: {
            "1": {
              title: "Elon Musk",
              thumbnail: { source: "https://img/musk.jpg" },
            },
          },
        },
      }),
    );
    const out = await fetchSummaries(["Elon musk"]);
    // Filed under the requested spelling, not Wikipedia's corrected one.
    expect(out.get("Elon musk")).toMatchObject({ status: "found" });
  });
});

describe("bad titles cost nothing", () => {
  test("a URL, a fragment, or an absurd title never reaches the network", async () => {
    const calls = vi.fn();
    vi.stubGlobal("fetch", calls);
    for (const bad of [
      "https://en.wikipedia.org/wiki/Foo",
      "Foo#History",
      "",
      "x".repeat(200),
    ]) {
      expect(await lookup(bad)).toEqual({ status: "absent" });
    }
    expect(calls).not.toHaveBeenCalled();
  });
});
