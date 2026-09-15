import { describe, expect, test } from "vitest";

import { agreeWord, heat, leanWord, moodWord, sideOf, strengthOf } from "./words";

/**
 * The atlas says words rather than numbers, so the words have to be right.
 *
 * A scale with an off-by-one at a boundary calls a country a hater for liking
 * something — invisible in review, obvious on screen, and the sort of thing
 * nobody reports because it just reads as the site being wrong about them.
 */

describe("which side a lean is on", () => {
  test("fifty is love's, by the same convention the reveal uses", () => {
    expect(sideOf(50)).toBe("love");
    expect(sideOf(49.9)).toBe("hate");
  });

  test("the number beside a word agrees with the word", () => {
    // A country at 8% love is not "8%" of anything — it is 92% against, and
    // printing the 8 next to the word "despises" reads as a contradiction.
    expect(strengthOf(8)).toBe(92);
    expect(strengthOf(84)).toBe(84);
    expect(strengthOf(50)).toBe(50);
  });
});

describe("what a country makes of something", () => {
  test("the scale runs all the way to both ends", () => {
    expect(leanWord(100)).toBe("worships");
    expect(leanWord(0)).toBe("despises");
  });

  test("the middle is split, not a lean", () => {
    for (const pct of [45, 48, 50, 52, 55]) {
      expect(leanWord(pct), `${pct}%`).toBe("is split on");
    }
    // And the bands either side of it are not.
    expect(leanWord(56)).toBe("warms to");
    expect(leanWord(44)).toBe("cools on");
  });

  test("every band is reachable, and none overlaps", () => {
    const seen = new Set<string>();
    for (let pct = 0; pct <= 100; pct++) seen.add(leanWord(pct));
    expect(seen.size).toBe(11);
  });

  test("it never gets warmer as the number falls", () => {
    /* The bug this catches is a band written out of order, which produces a
       scale that reads fine at a glance and is nonsense at one boundary. */
    const order = [
      "despises", "can't stand", "hates", "dislikes", "cools on",
      "is split on", "warms to", "likes", "loves", "adores", "worships",
    ];
    let last = -1;
    for (let pct = 0; pct <= 100; pct++) {
      const rank = order.indexOf(leanWord(pct));
      expect(rank, `${pct}% gave "${leanWord(pct)}"`).toBeGreaterThanOrEqual(last);
      last = rank;
    }
  });
});

describe("what a country is like", () => {
  test("both ends are named, and the middle sits on the fence", () => {
    expect(moodWord(100)).toBe("a devotee");
    expect(moodWord(50)).toBe("a fence-sitter");
    expect(moodWord(0)).toBe("impossible");
  });

  test("every band is reachable", () => {
    const seen = new Set<string>();
    for (let pct = 0; pct <= 100; pct++) seen.add(moodWord(pct));
    expect(seen.size).toBe(11);
  });
});

describe("how two countries get on", () => {
  test("agreement runs from sworn enemies to inseparable", () => {
    expect(agreeWord(100)).toBe("inseparable");
    expect(agreeWord(50)).toBe("indifferent");
    expect(agreeWord(0)).toBe("sworn enemies");
  });

  test("it never gets friendlier as agreement falls", () => {
    const order = [
      "sworn enemies", "hostile", "at odds", "wary", "indifferent",
      "civil", "friendly", "kindred", "inseparable",
    ];
    let last = -1;
    for (let n = 0; n <= 100; n++) {
      const rank = order.indexOf(agreeWord(n));
      expect(rank, `${n}% gave "${agreeWord(n)}"`).toBeGreaterThanOrEqual(last);
      last = rank;
    }
  });
});

describe("how loud a word is allowed to be", () => {
  test("the middle is quiet and both ends are loud", () => {
    expect(heat(50)).toBe(0);
    expect(heat(95)).toBe(1);
    expect(heat(5)).toBe(1);
    expect(heat(70)).toBeGreaterThan(heat(60));
  });
});
