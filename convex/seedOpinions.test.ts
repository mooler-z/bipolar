import { describe, expect, test } from "vitest";

import { WORLD, pick, roll, votes } from "./lib/seedOpinions";

/**
 * A demo world is only worth having if it actually argues.
 *
 * The whole point of seeding twenty countries is that the boards show the
 * shape they were built for — so "Israel and Palestine disagree about each
 * other" has to be a property of the data, not a hope about it. These assert
 * the fault lines, and also the thing that keeps it from looking generated:
 * nobody agrees with their own side every single time.
 */

const find = (code: string) => WORLD.find((p) => p.code === code)!;

/** How often a country loves questions about a given place. */
function lovePct(code: string, about: string, n = 300): number {
  const person = find(code);
  let love = 0;
  for (let i = 0; i < n; i++) {
    if (votes(person, { id: `t${i}`, about }) === "love") love += 1;
  }
  return Math.round((love / n) * 100);
}

describe("the population", () => {
  test("is twenty countries, each named once", () => {
    expect(WORLD).toHaveLength(20);
    expect(new Set(WORLD.map((p) => p.code)).size).toBe(20);
  });

  test("every rivalry and alliance names a country that is here", () => {
    const here = new Set(WORLD.map((p) => p.code));
    for (const person of WORLD) {
      for (const other of [...person.allies, ...person.rivals]) {
        // A rival nobody can vote for is a fault line with one side.
        expect(here.has(other), `${person.code} → ${other}`).toBe(true);
      }
    }
  });

  test("nobody is their own rival by accident", () => {
    for (const person of WORLD) {
      expect(person.rivals).not.toContain(person.code);
      expect(person.allies).not.toContain(person.code);
    }
  });
});

describe("the fault lines are real", () => {
  test("the pairs the world was built around actually disagree", () => {
    for (const [a, b] of [
      ["IL", "PS"],
      ["US", "IR"],
      ["IN", "PK"],
      ["UA", "RU"],
      ["CN", "TW"],
      ["GR", "TR"],
      ["ET", "EG"],
    ] as const) {
      // Each thinks little of questions about the other, both ways round.
      expect(lovePct(a, b), `${a} on ${b}`).toBeLessThan(30);
      expect(lovePct(b, a), `${b} on ${a}`).toBeLessThan(30);
    }
  });

  test("a country defends itself, and its friends", () => {
    expect(lovePct("IL", "IL")).toBeGreaterThan(70);
    expect(lovePct("US", "IL")).toBeGreaterThan(60);
    expect(lovePct("IR", "PS")).toBeGreaterThan(60);
  });

  test("a question about nowhere falls to mood, and moods differ", () => {
    // Most of the volume is here, so the boards are driven by the fault lines
    // rather than drowned by them.
    const kp = lovePct("KP", "");
    const br = lovePct("BR", "");
    expect(br).toBeGreaterThan(kp + 15);
  });

  test("nobody agrees with their own side every time", () => {
    /* A lookup table would score every rivalry at exactly 0% and read as
       generated, because it would be. */
    const own = lovePct("IL", "IL");
    expect(own).toBeLessThan(100);
    const enemy = lovePct("IL", "PS");
    expect(enemy).toBeGreaterThan(0);
  });
});

describe("the same world twice", () => {
  test("a vote is decided by who and what, never by when", () => {
    const il = find("IL");
    const first = votes(il, { id: "abc", about: "PS" });
    for (let i = 0; i < 50; i++) {
      // Re-running the seed must not reshuffle the world.
      expect(votes(il, { id: "abc", about: "PS" })).toBe(first);
    }
    expect(roll("IL", "abc")).toBe(roll("IL", "abc"));
    expect(roll("IL", "abc")).not.toBe(roll("IL", "abd"));
  });
});

describe("countries that think alike, vote alike", () => {
  /** How often two countries land the same way on questions about nowhere. */
  function together(a: string, b: string, n = 400): number {
    const x = find(a);
    const y = find(b);
    let same = 0;
    for (let i = 0; i < n; i++) {
      const topic = { id: `n${i}` };
      if (votes(x, topic) === votes(y, topic)) same += 1;
    }
    return Math.round((same / n) * 100);
  }

  test("a bloc agrees with itself more than it agrees with the other side", () => {
    /* Most questions are about nowhere, so without this every pair lands in
       the same middling band and the agreement board has no ends on it. */
    const withinWest = together("US", "GB");
    const acrossBlocs = together("US", "RU");
    expect(withinWest).toBeGreaterThan(acrossBlocs + 10);
  });

  test("a bloc is not one country copied five times", () => {
    // Allies still differ, or every western row would be identical.
    expect(together("US", "GB")).toBeLessThan(97);
  });
});

describe("a country with no stake still has a side", () => {
  /** Agreement over questions about a country neither of them cares about. */
  function onNeutral(a: string, b: string, about: string, n = 400): number {
    const x = find(a);
    const y = find(b);
    let same = 0;
    for (let i = 0; i < n; i++) {
      const topic = { id: `s${i}`, about };
      if (votes(x, topic) === votes(y, topic)) same += 1;
    }
    return Math.round((same / n) * 100);
  }

  test("bloc-mates agree on questions about places neither has a stake in", () => {
    /* Most questions here are about somewhere. Rolling independently whenever
       a country had no relationship to the place left every pair near fifty
       and the agreement board flat. */
    expect(onNeutral("US", "GB", "JP")).toBeGreaterThan(onNeutral("US", "RU", "JP") + 10);
  });

  test("a stake still overrides the side", () => {
    // Ally and rival must survive the change, or the fault lines go with it.
    const il = find("IL");
    let love = 0;
    for (let i = 0; i < 200; i++) {
      if (votes(il, { id: `x${i}`, about: "PS" }) === "love") love += 1;
    }
    expect(Math.round((love / 200) * 100)).toBeLessThan(30);
  });
});

describe("picking an index out of a list", () => {
  test("it reaches every entry, however long the list", () => {
    /* `roll` is capped at a hundred, so `roll(...) % n` on anything longer
       only ever returns the first hundred indices. The activity simulator did
       exactly that over six hundred questions and never reached past the
       newest hundred — all of which had already been answered — so every tick
       produced nothing but comments. */
    const n = 600;
    const seen = new Set<number>();
    for (let i = 0; i < 20000; i++) seen.add(pick(`s${i}`, "topic", n));
    expect(seen.size).toBeGreaterThan(n * 0.9);
    expect(Math.max(...seen)).toBeGreaterThan(500);
  });

  test("it stays inside the list, and survives an empty one", () => {
    for (let i = 0; i < 500; i++) {
      const at = pick(`s${i}`, "x", 7);
      expect(at).toBeGreaterThanOrEqual(0);
      expect(at).toBeLessThan(7);
    }
    expect(pick("a", "b", 0)).toBe(0);
  });

  test("it is stable, like everything else here", () => {
    expect(pick("a", "b", 999)).toBe(pick("a", "b", 999));
  });
});
