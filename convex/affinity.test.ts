import { describe, expect, test } from "vitest";

import {
  FATIGUE_WINDOW_MS,
  PRIOR,
  STRENGTH,
  affinityOf,
  fatigueOf,
  keysOf,
  metrics,
  step,
} from "./lib/affinity";

/**
 * The learner is arithmetic, so it is tested as arithmetic. These assert what
 * the acts *mean* — a pull says more than a tap, a skip says the opposite, an
 * undo takes most of it back — not the coefficients, so the strengths can be
 * tuned without rewriting the suite.
 */

describe("what an act is worth", () => {
  test("every positive act lifts, a skip drops, from the same neutral start", () => {
    for (const act of ["vote", "spark", "pull", "comment", "peek"] as const) {
      expect(step(undefined, act)).toBeGreaterThan(PRIOR);
    }
    expect(step(undefined, "skip")).toBeLessThan(PRIOR);
  });

  test("going and getting a topic says more than tapping through it", () => {
    expect(step(undefined, "pull")).toBeGreaterThan(step(undefined, "vote"));
    expect(step(undefined, "comment")).toBeGreaterThan(step(undefined, "vote"));
    expect(step(undefined, "spark")).toBeGreaterThan(step(undefined, "vote"));
  });

  test("an undo takes most of a vote back, but not all of it", () => {
    const afterVote = step(undefined, "vote");
    const afterUndo = step(afterVote, "undo");
    expect(afterUndo).toBeLessThan(afterVote);
    // Not below neutral: they looked twice, which is not disinterest.
    expect(afterUndo).toBeGreaterThan(step(undefined, "skip"));
  });

  test("no single tap can swing a weight to either end", () => {
    for (const act of Object.keys(STRENGTH) as (keyof typeof STRENGTH)[]) {
      const w = step(undefined, act);
      expect(w).toBeGreaterThan(0.05);
      expect(w).toBeLessThan(0.95);
    }
  });
});

describe("what a topic is made of", () => {
  test("tags count double against the drawer they live in", () => {
    const weights = new Map([
      ["cat:food", 0.2],
      ["tag:pizza", 0.9],
    ]);
    const a = affinityOf(weights, { categoryId: "food", tagSlugs: ["pizza"] })!;
    // Plain mean would be 0.55; tags weighted double pulls it toward the tag.
    expect(a).toBeCloseTo((0.2 + 0.9 * 2) / 3, 5);
  });

  test("silence is not indifference", () => {
    expect(affinityOf(new Map(), { categoryId: "food", tagSlugs: ["pizza"] })).toBeUndefined();
  });

  test("the country a topic is about is a key too", () => {
    expect(keysOf({ categoryId: "c", tagSlugs: ["x"], scopeCountry: "ET" })).toEqual([
      "cat:c",
      "tag:x",
      "cc:ET",
    ]);
  });
});

describe("fatigue is about right now", () => {
  const now = 10_000_000;
  test("two fresh skips in a category sink it; an old one does not", () => {
    const fresh = fatigueOf(
      [
        { categoryId: "c", atMs: now - 60_000 },
        { categoryId: "c", atMs: now - 120_000 },
      ],
      "c",
      now,
    );
    expect(fresh).toBeCloseTo(2 / 3, 5);
    const stale = fatigueOf([{ categoryId: "c", atMs: now - FATIGUE_WINDOW_MS - 1 }], "c", now);
    expect(stale).toBe(0);
  });

  test("skips in another category are not this category's problem", () => {
    expect(fatigueOf([{ categoryId: "other", atMs: now }], "c", now)).toBe(0);
  });
});

describe("the yardstick", () => {
  test("a perfect ordering scores one; a bad one scores near nothing", () => {
    expect(metrics([1, 1, 1]).mrr).toBe(1);
    expect(metrics([1, 1, 1]).hitAtK).toBe(1);
    expect(metrics([100, 200, 300]).mrr).toBeLessThan(0.02);
    expect(metrics([100, 200, 300]).hitAtK).toBe(0);
  });

  test("nothing to measure is reported as nothing, not as perfect", () => {
    expect(metrics([])).toEqual({ n: 0, mrr: 0, hitAtK: 0, medianRank: 0 });
  });
});
