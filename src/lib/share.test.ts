import { describe, expect, test } from "vitest";

import { intentUrl } from "./share";
import { cardFor } from "./shareCard";

/**
 * The two rules the share path has that are worth guarding.
 *
 * The link has to survive the channel it is posted to, and the card must not
 * carry what a reader has not earned. Both are quiet failures otherwise: a
 * mangled url still looks like a share, and a card that leaks the Committed
 * layer looks exactly like one that does not.
 */

describe("the link survives the channel", () => {
  const target = { url: "https://bipolar.test/t/pineapple", text: "Pineapple on pizza?" };

  test("a one-field channel gets the link on its own line", () => {
    for (const channel of ["x", "whatsapp"] as const) {
      const body = decodeURIComponent(
        new URL(intentUrl(channel, target)).searchParams.get("text")!,
      );
      // A blank line, so the url is never swallowed by the sentence's full stop.
      expect(body).toBe("Pineapple on pizza?\n\nhttps://bipolar.test/t/pineapple");
    }
  });

  test("a structured channel keeps the link as its own field", () => {
    for (const channel of ["reddit", "telegram"] as const) {
      const q = new URL(intentUrl(channel, target)).searchParams;
      expect(q.get("url")).toBe(target.url);
      // And the caption is the question alone — never the url a second time.
      expect(q.get("title") ?? q.get("text")).toBe("Pineapple on pizza?");
    }
  });

  test("a question with punctuation survives the round trip", () => {
    const tricky = { url: "https://bipolar.test/t/x?a=1&b=2", text: "Tabs & spaces: 100%?" };
    const q = new URL(intentUrl("reddit", tricky)).searchParams;
    expect(q.get("url")).toBe(tricky.url);
    expect(q.get("title")).toBe(tricky.text);
  });
});

describe("the card carries the lean, never the layers", () => {
  /* The Crowd is 90% love; the Committed are the other way and far bigger.
     A card built off the total would read 30% and give away the split that
     voting or paying is what buys. */
  const stats = { freeLove: 90, freeHate: 10, paidLove: 10, paidHate: 190, stakedCents: 9500 };

  test("the percentages are the crowd's, and they add to 100", () => {
    const card = cardFor("Pineapple on pizza?", stats, "bipolar.test")!;
    expect(card.lovePct).toBe(90);
    expect(card.hatePct).toBe(10);
    expect(card.lovePct + card.hatePct).toBe(100);
  });

  test("nothing about the committed layer reaches the card", () => {
    const card = cardFor("Pineapple on pizza?", stats, "bipolar.test")!;
    const drawn = JSON.stringify(card);
    // Assert the absence, not merely the presence of what is expected.
    for (const gated of [10, 190, 9500, 200].map(String)) {
      if (gated === "10") continue; // 10 is legitimately the hate lean.
      expect(drawn).not.toContain(gated);
    }
    expect(Object.keys(card).sort()).toEqual(["hatePct", "lovePct", "question", "site"]);
  });

  test("no result means no card, rather than a card of zeroes", () => {
    expect(cardFor("Pineapple on pizza?", null, "bipolar.test")).toBeNull();
  });
});
