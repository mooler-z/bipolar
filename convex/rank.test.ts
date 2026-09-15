import { describe, expect, test } from "vitest";

import {
  MIN_VOLUME,
  TASTE_PRIOR,
  ema,
  score,
  type Candidate,
  type Context,
} from "./lib/rank";
import { JITTER, hashSeed, interleave, jitter, noveltyOf, seededShuffle } from "./lib/serve";

/**
 * The ranker is pure arithmetic, so it is tested as arithmetic — no database,
 * no mocks, no fixtures. These assert the behaviours the feed is *for*, not the
 * coefficients, so the weights can be tuned without rewriting the suite.
 */

const NOW = 1_700_000_000_000;

function topic(over: Partial<Candidate> = {}): Candidate {
  return {
    id: "t1",
    categoryId: "c1",
    createdAtMs: NOW,
    isFeatured: false,
    isLocked: false,
    closesAtMs: null,
    scopeCountry: null,
    tagSlugs: [],
    freeLove: 0,
    freeHate: 0,
    paidLove: 0,
    paidHate: 0,
    skips: 0,
    ...over,
  };
}

function context(over: Partial<Context> = {}): Context {
  return {
    nowMs: NOW,
    userCountry: null,
    interests: new Set(),
    taste: new Map(),
    velocity: new Map(),
    countryLean: new Map(),
    categoryLean: new Map(),
    skips: new Map(),
    learned: new Map(),
    recentSkips: [],
    ...over,
  };
}

describe("tension is what the feed is for", () => {
  test("a dead split outranks a landslide of the same size", () => {
    const split = score(topic({ freeLove: 50, freeHate: 50 }), context());
    const landslide = score(topic({ freeLove: 95, freeHate: 5 }), context());
    expect(split.score).toBeGreaterThan(landslide.score);
    expect(split.terms.tension).toBeCloseTo(1, 5);
  });

  test("three votes cannot fake an argument", () => {
    // Perfectly split, but on nothing: the volume gate holds it down.
    const thin = score(topic({ freeLove: 1, freeHate: 2 }), context());
    const thick = score(
      topic({ freeLove: MIN_VOLUME / 2, freeHate: MIN_VOLUME / 2 }),
      context(),
    );
    expect(thin.terms.tension).toBeLessThan(0.2);
    expect(thick.terms.tension).toBeCloseTo(1, 5);
  });
});

describe("affinity blends what you said with what you did", () => {
  test("a stated interest counts on its own until you act", () => {
    const said = score(topic(), context({ interests: new Set(["c1"]) }));
    expect(said.terms.affinity).toBe(1);
  });

  test("once you have acted, behaviour gets equal say", () => {
    // Said yes, then skipped the category into the ground.
    const cooled = score(
      topic(),
      context({ interests: new Set(["c1"]), taste: new Map([["c1", 0]]) }),
    );
    expect(cooled.terms.affinity).toBe(0.5);

    // Never said it, but keeps voting on it.
    const warmed = score(topic(), context({ taste: new Map([["c1", 1]]) }));
    expect(warmed.terms.affinity).toBe(0.5);
  });
});

describe("local heat finds the country out of step", () => {
  test("a country against the world scores; one agreeing does not", () => {
    const world = topic({ freeLove: 80, freeHate: 20 });
    const against = score(
      world,
      context({
        userCountry: "ET",
        countryLean: new Map([["t1", { love: 2, hate: 18 }]]),
      }),
    );
    const along = score(
      world,
      context({
        userCountry: "ET",
        countryLean: new Map([["t1", { love: 16, hate: 4 }]]),
      }),
    );
    expect(against.terms.country).toBeGreaterThan(0.9);
    expect(along.terms.country).toBeLessThan(0.1);
  });

  test("one voter in a country is not that country", () => {
    const out = score(
      topic({ freeLove: 80, freeHate: 20 }),
      context({
        userCountry: "ET",
        countryLean: new Map([["t1", { love: 0, hate: 1 }]]),
      }),
    );
    expect(out.terms.country).toBe(0);
  });
});

describe("provocation needs a stance to provoke", () => {
  test("a single vote does not brand you", () => {
    const out = score(
      topic({ freeLove: 10, freeHate: 90 }),
      context({ categoryLean: new Map([["c1", { love: 1, total: 1 }]]) }),
    );
    expect(out.terms.provocation).toBe(0);
  });

  test("a settled stance against an opposed room scores", () => {
    const out = score(
      topic({ freeLove: 5, freeHate: 95 }),
      context({ categoryLean: new Map([["c1", { love: 10, total: 10 }]]) }),
    );
    expect(out.terms.provocation).toBeGreaterThan(0.85);
  });
});

describe("what you cannot act on sinks but does not vanish", () => {
  test("a locked topic keeps a score, an order of magnitude down", () => {
    const open = score(topic({ freeLove: 50, freeHate: 50 }), context());
    const locked = score(
      topic({ freeLove: 50, freeHate: 50, isLocked: true }),
      context(),
    );
    expect(locked.score).toBeGreaterThan(0);
    expect(locked.score).toBeCloseTo(open.score * 0.1, 5);
  });

  test("a topic scoped to somewhere else sinks further than one merely stale", () => {
    const mine = score(topic({ freeLove: 50, freeHate: 50 }), context({ userCountry: "ET" }));
    const theirs = score(
      topic({ freeLove: 50, freeHate: 50, scopeCountry: "JP" }),
      context({ userCountry: "ET" }),
    );
    expect(theirs.score).toBeCloseTo(mine.score * 0.3, 5);
  });
});

describe("skipping is heard", () => {
  test("a topic this reader keeps skipping falls behind an identical one", () => {
    const fresh = score(topic({ freeLove: 50, freeHate: 50 }), context());
    const tired = score(
      topic({ freeLove: 50, freeHate: 50 }),
      context({ skips: new Map([["t1", 3]]) }),
    );
    expect(tired.score).toBeLessThan(fresh.score);
  });
});

describe("serve order is not score order", () => {
  const items = Array.from({ length: 9 }, (_, i) => ({
    id: `t${i}`,
    // All one category except two, so a naive sort would run six deep.
    categoryId: i === 4 || i === 7 ? "other" : "food",
    score: 1 - i * 0.01,
  }));

  /** Categories in serve order, for asserting against runs. */
  const catsOf = (pool: typeof items, seed: number) =>
    interleave(pool, { seed, epsilon: 0 }).map(
      (id) => pool.find((i) => i.id === id)!.categoryId,
    );

  const longestRun = (cats: string[]) => {
    let best = 0;
    let run = 0;
    for (let i = 0; i < cats.length; i += 1) {
      run = i > 0 && cats[i] === cats[i - 1] ? run + 1 : 1;
      best = Math.max(best, run);
    }
    return best;
  };

  test("never three in a row while another category is still available", () => {
    const mixed = [
      ...Array.from({ length: 5 }, (_, i) => ({
        id: `f${i}`,
        categoryId: "food",
        score: 1 - i * 0.01,
      })),
      ...Array.from({ length: 4 }, (_, i) => ({
        id: `o${i}`,
        categoryId: "other",
        score: 0.9 - i * 0.01,
      })),
    ];
    expect(longestRun(catsOf(mixed, hashSeed("reader:2026-09-14")))).toBeLessThanOrEqual(2);
  });

  test("a run is taken only once nothing else is left to serve", () => {
    // Seven of one category among two cannot be interleaved under a cap of
    // two; the rule is "skip ahead to a different category *if one exists*",
    // and the leftovers land at the end rather than being dropped.
    const cats = catsOf(items, hashSeed("reader:2026-09-14"));
    const firstRunOfThree = cats.findIndex(
      (c, i) => i >= 2 && c === cats[i - 1] && c === cats[i - 2],
    );
    // Both minority cards have been served before any run of three forms.
    expect(cats.slice(0, firstRunOfThree).filter((c) => c === "other")).toHaveLength(2);
  });

  /* ── the discovery pick ─────────────────────────────────────────────────
     A reader who answers a few questions about famous people used to be served
     famous people until they stopped coming: the explore slot reached into the
     bottom half of the score order, and the bottom half of a board that has
     learned one taste is the same taste, scored worse. It goes to whatever the
     reader has said least about now. */

  test("novelty is one for a stranger and falls away as evidence arrives", () => {
    expect(noveltyOf(0, 0)).toBe(1);
    expect(noveltyOf(9, 0)).toBeLessThan(noveltyOf(3, 0));
    // A tag counts double: a category is coarse, and the tags are what the
    // reader has actually been answering.
    expect(noveltyOf(0, 1)).toBeLessThan(noveltyOf(1, 0));
  });

  test("an exploring slot takes the least known question, not the worst one", () => {
    const known = Array.from({ length: 8 }, (_, i) => ({
      id: `famous${i}`,
      categoryId: "culture",
      score: 1 - i * 0.01,
      novelty: noveltyOf(40, 3),
    }));
    const stranger = { id: "cities", categoryId: "urbanism", score: 0.1, novelty: 1 };

    // Every slot explores, so the order is novelty order and the one thing
    // nobody has asked this reader about comes first.
    const order = interleave([...known, stranger], { seed: 7, epsilon: 1 });
    expect(order[0]).toBe("cities");

    /* And with no exploring at all the best score leads. The stranger still
       arrives third rather than last, because the run cap breaks a third
       culture card in a row — that is the *other* correction, and the point
       here is that novelty is what puts the stranger at the front rather than
       in the middle. */
    const greedy = interleave([...known, stranger], { seed: 7, epsilon: 0 });
    expect(greedy[0]).toBe("famous0");
    expect(greedy.indexOf("cities")).toBeGreaterThan(0);
  });

  test("a reader with no history still gets a mixed serve", () => {
    /* The case that mattered and was missed: on a first visit nobody has said
       anything about anything, so every candidate ties on the reader's own
       evidence — and the catalogue is three-quarters one kind of question, so
       a coin toss over it serves thirteen famous people. Strangeness is
       measured against *this serve* as well, which is what breaks that. */
    const people = Array.from({ length: 12 }, (_, i) => ({
      id: `p${i}`,
      categoryId: `c${(i % 4) + 1}`,
      tags: ["leader"],
      score: 1 - i * 0.01,
    }));
    const others = [
      { id: "food", categoryId: "c5", tags: ["food"], score: 0.1 },
      { id: "space", categoryId: "c6", tags: ["space"], score: 0.09 },
      { id: "sport", categoryId: "c7", tags: ["sport"], score: 0.08 },
    ];

    const order = interleave([...people, ...others], { seed: 11, epsilon: 1 });
    const kind = (id: string) => (id.startsWith("p") ? "leader" : id);

    // No two leaders back to back while something else is still unserved.
    const left = new Set(others.map((o) => o.id));
    for (let i = 1; i < order.length; i += 1) {
      left.delete(order[i - 1]);
      if (left.size === 0) break;
      expect([kind(order[i - 1]), kind(order[i])]).not.toEqual(["leader", "leader"]);
    }
  });

  test("nothing is ever dropped", () => {
    const order = interleave(items, { seed: 123 });
    expect(order).toHaveLength(items.length);
    expect(new Set(order).size).toBe(items.length);
  });

  test("the same reader gets the same order on the same day", () => {
    const seed = hashSeed("reader:2026-09-14");
    expect(interleave(items, { seed })).toEqual(interleave(items, { seed }));
    expect(interleave(items, { seed })).not.toEqual(
      interleave(items, { seed: hashSeed("reader:2026-09-15") }),
    );
  });
});

describe("taste moves on the last few taps, not the last hundred", () => {
  test("a first vote lifts a neutral category, a first skip drops it", () => {
    expect(ema(TASTE_PRIOR, 1, 0.2)).toBeCloseTo(0.6, 5);
    expect(ema(TASTE_PRIOR, 0, 0.15)).toBeCloseTo(0.425, 5);
  });

  test("it converges without ever overshooting", () => {
    let w = TASTE_PRIOR;
    for (let i = 0; i < 40; i += 1) w = ema(w, 1, 0.2);
    expect(w).toBeGreaterThan(0.99);
    expect(w).toBeLessThanOrEqual(1);
  });
});

describe("a reload opens on a different question", () => {
  const ids = Array.from({ length: 30 }, (_, i) => `t${i}`);

  test("a shuffle is deterministic per seed and different across seeds", () => {
    expect(seededShuffle(ids, hashSeed("a"))).toEqual(
      seededShuffle(ids, hashSeed("a")),
    );
    expect(seededShuffle(ids, hashSeed("a"))).not.toEqual(
      seededShuffle(ids, hashSeed("b")),
    );
  });

  test("a shuffle never drops or duplicates", () => {
    const out = seededShuffle(ids, hashSeed("x"));
    expect(out).toHaveLength(ids.length);
    expect(new Set(out).size).toBe(ids.length);
  });

  test("jitter reorders near-ties without overturning real differences", () => {
    // Two topics a hair apart: the noise may swap them.
    const near = ["a", "b"].map((id) => ({
      id,
      score: 0.5 + jitter("session-1", id) * JITTER,
    }));
    expect(Math.abs(near[0].score - near[1].score)).toBeLessThanOrEqual(JITTER);

    // A genuinely better topic cannot be pushed under a worse one, whatever
    // seed comes up — that would make the ranker decorative.
    for (const seed of ["s1", "s2", "s3", "s4", "s5"]) {
      const strong = 0.9 + jitter(seed, "strong") * JITTER;
      const weak = 0.9 - JITTER - 0.001 + jitter(seed, "weak") * JITTER;
      expect(strong).toBeGreaterThan(weak);
    }
  });
});

