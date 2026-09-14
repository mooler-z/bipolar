/// <reference types="vite/client" />
import { describe, expect, test } from "vitest";

import { alreadyAsked, keyOf, overlap } from "./lib/dedupe";

/**
 * The rule: the feed never carries the same argument twice.
 *
 * Discovery reads the open web, and the open web writes one story twenty times
 * in a morning. The URL ledger stops the same *page* being minted twice and
 * does nothing about twenty pages making the same point — so this is the thing
 * standing between a busy news day and a feed of one question phrased six ways.
 *
 * Both directions matter, and the second is the one that is easy to get wrong:
 * a check so eager that it swallows genuinely different arguments makes the
 * feed quietly stop growing, and nothing in the logs would say so.
 */

describe("the same question, said differently", () => {
  test("punctuation, casing and word order do not make it a new question", () => {
    expect(keyOf("Pineapple on pizza?")).toBe(keyOf("PINEAPPLE ON PIZZA"));
    expect(keyOf("Is pineapple on a pizza good?")).toBe(
      keyOf("Pineapple on pizza — good?"),
    );
    // Order is thrown away on purpose: "Musk's pay package" and "the pay
    // package for Musk" are one argument.
    expect(keyOf("Banning cars in cities?")).toBe(keyOf("Cities banning cars?"));
  });

  test("a question made only of function words still gets a key of its own", () => {
    // Otherwise every one of them would collapse to the empty string and the
    // first would block all the rest.
    expect(keyOf("Should you?")).not.toBe("");
    expect(keyOf("Should you?")).not.toBe(keyOf("Would we?"));
  });

  test("different arguments stay different", () => {
    expect(alreadyAsked(keyOf("Pineapple on pizza?"), [keyOf("Pineapple farming?")])).toBe(
      false,
    );
    expect(
      alreadyAsked(keyOf("Nuclear power in Germany?"), [
        keyOf("Solar power in Germany?"),
        keyOf("Nuclear weapons treaties?"),
      ]),
    ).toBe(false);
  });
});

describe("how much two questions share", () => {
  test("identical is one, unrelated is zero", () => {
    expect(overlap(keyOf("Pineapple on pizza?"), keyOf("Pineapple on pizza?"))).toBe(1);
    expect(overlap(keyOf("Pineapple pizza?"), keyOf("Nuclear power?"))).toBe(0);
    expect(overlap("", "anything")).toBe(0);
  });

  test("a near-rewording lands above the threshold and is refused", () => {
    const asked = [keyOf("Elon Musk's pay package at Tesla?")];
    expect(alreadyAsked(keyOf("Musk's Tesla pay package?"), asked, 0.5)).toBe(true);
    // And the same pair is allowed through at a stricter setting, which is what
    // makes the threshold a knob rather than a coin toss.
    expect(alreadyAsked(keyOf("Musk's Tesla pay package?"), asked, 0.95)).toBe(false);
  });

  test("an empty list of known questions refuses nothing", () => {
    expect(alreadyAsked(keyOf("Anything at all?"), [])).toBe(false);
  });
});
