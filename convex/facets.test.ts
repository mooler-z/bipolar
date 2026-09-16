import { describe, expect, test } from "vitest";

import {
  AXES, FACET_NAMES, GENDERS, KINDS, LEANS, PRICE_BANDS, REGIONS, ROLES,
  ageBandOf, ageOf, eraOf, regionOf,
} from "./lib/facets";
import { buildFacets, type FacetGroup } from "./insightFacets";
import { marksOf } from "./insightTopic";
import { clean, type Plan } from "./lib/insight";
import type { Block } from "./insightBlocks";
import { PEOPLE_FACETS } from "./seedPeopleFacets";
import { PRODUCT_FACETS } from "./seedProductFacets";

/**
 * What a question is about, and the cuts that fact makes possible.
 *
 * The derivations are arithmetic and the vocabularies are lists, so both are
 * tested as themselves. What is worth holding still is not the coefficients
 * but the promises: that a facet's values are a closed set, that the hand
 * data never says something the vocabulary has no word for, and that a group
 * of one question is never published as a finding.
 */

describe("the derived facets", () => {
  test("a country lands in a region, and an unknown one lands nowhere", () => {
    expect(regionOf("ET")).toBe("africa");
    expect(regionOf("us")).toBe("north-america");
    expect(regionOf("IL")).toBe("middle-east");
    expect(regionOf("ZZ")).toBeNull();
    expect(regionOf(null)).toBeNull();
  });

  test("a year becomes the decade it belongs to", () => {
    expect(eraOf(1985)).toBe("1980s");
    expect(eraOf(2007)).toBe("2000s");
    expect(eraOf(1774)).toBe("pre-1900");
    expect(eraOf(undefined)).toBeNull();
    expect(eraOf(3000)).toBeNull();
  });

  test("an age band is a band and not a number", () => {
    const now = Date.UTC(2026, 0, 1);
    expect(ageOf(1989, now)).toBe(37);
    expect(ageBandOf(ageOf(1989, now))).toBe("30s-40s");
    expect(ageBandOf(ageOf(1946, now))).toBe("75-plus");
    expect(ageBandOf(ageOf(2003, now))).toBe("under-30");
    expect(ageBandOf(null)).toBeNull();
  });
});

describe("the hand-written facets stay inside their vocabulary", () => {
  /* A free-text facet is a facet nobody can group by, so every word in the two
     seed files has to be a word the validator knows. A typo here is a group of
     one that quietly never joins its own kind. */
  test("every person's gender, role and lean is a known word", () => {
    for (const [q, f] of Object.entries(PEOPLE_FACETS)) {
      expect(GENDERS, q).toContain(f.g);
      expect(ROLES, q).toContain(f.r);
      expect(LEANS, q).toContain(f.l);
      expect(f.b, q).toBeGreaterThan(1900);
      expect(f.b, q).toBeLessThan(2020);
    }
  });

  test("every product's price band is a known word and its year is a year", () => {
    for (const [q, f] of Object.entries(PRODUCT_FACETS)) {
      expect(PRICE_BANDS, q).toContain(f.p);
      expect(f.f.length, q).toBeGreaterThan(2);
      if (f.y !== undefined) {
        expect(f.y, q).toBeGreaterThan(1700);
        expect(f.y, q).toBeLessThan(2030);
      }
    }
  });

  test("the vocabularies are all reachable from the names", () => {
    for (const list of [KINDS, REGIONS, GENDERS, ROLES, LEANS, PRICE_BANDS, AXES]) {
      expect(new Set(list).size).toBe(list.length);
    }
    expect(FACET_NAMES).toContain("gender");
    expect(FACET_NAMES).toContain("priceBand");
    expect(new Set(FACET_NAMES).size).toBe(FACET_NAMES.length);
  });
});

describe("the cut across the catalogue", () => {
  const plan = (over: Partial<Plan> = {}): Plan => ({
    lens: "facet_split",
    subject: "gender",
    other: null,
    direction: "hate",
    title: "By gender",
    note: "",
    ...over,
  });
  const rows: FacetGroup[] = [
    { value: "female", lovePct: 44, topics: 17 },
    { value: "male", lovePct: 45, topics: 86 },
  ];

  test("it names the group at the asked-for end", () => {
    const out = buildFacets(plan(), rows);
    const head = out.find((b) => b.kind === "headline") as Extract<Block, { kind: "headline" }>;
    expect(head.word).toContain("female");
    expect(head.label).toBe("Worst thought of");
  });

  test("each bar says how many questions are behind it", () => {
    const bars = buildFacets(plan(), rows).find((b) => b.kind === "bars") as Extract<
      Block,
      { kind: "bars" }
    >;
    expect(bars.rows.map((r) => r.votes)).toEqual([17, 86]);
    expect(JSON.stringify(buildFacets(plan(), rows))).toContain("read the gaps");
  });

  test("one group is not a comparison", () => {
    /* Two bars is the minimum claim. A single group rendered as a chart is a
       finding about nothing, and it is exactly what a thinly answered facet
       would produce. */
    const out = buildFacets(plan(), rows.slice(0, 1));
    expect(out).toHaveLength(1);
    expect(out[0].kind).toBe("note");
  });
});

describe("the router names an attribute, never a value of one", () => {
  test("a facet name survives, in any case", () => {
    expect(clean({ lens: "facet_split", subject: "gender" })?.subject).toBe("gender");
    expect(clean({ lens: "facet_split", subject: "PriceBand" })?.subject).toBe("priceBand");
  });

  test("a value of a facet is not a facet", () => {
    // "women" is an answer, not a question to ask of the data.
    expect(clean({ lens: "facet_split", subject: "women" })?.subject).toBeNull();
    expect(clean({ lens: "facet_split", subject: "right wing" })?.subject).toBeNull();
  });
});

describe("what a thing is, said rather than listed", () => {
  test("the marks read like speech", () => {
    expect(marksOf({ role: "head-of-state", ageBand: "75-plus", lean: "right" })).toEqual([
      "head of state",
      "75 and over",
      "right wing",
    ]);
    // "left wing" and "right wing" are things people say; "centre wing" is not.
    expect(marksOf({ lean: "centre" })).toEqual(["centrist"]);
    expect(marksOf({ lean: "none" })).toEqual([]);
  });

  test("five at most, because a schema dump is not a caption", () => {
    const many = marksOf({
      role: "founder", ageBand: "45-59", lean: "right", form: "phone",
      priceBand: "luxury", brand: "Apple", era: "2000s",
    });
    expect(many).toHaveLength(5);
  });

  test("a question with no facets says nothing rather than something empty", () => {
    expect(marksOf(undefined)).toEqual([]);
    expect(marksOf({})).toEqual([]);
  });
});
