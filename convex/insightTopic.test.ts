import { describe, expect, test } from "vitest";

import { clean, type Plan } from "./lib/insight";
import { buildTopic, relevant } from "./insightTopic";
import type { Block, TopicBoard } from "./insightBlocks";

/**
 * The router's shape rules and the one-question board.
 *
 * Neither needs a network: `clean` is what a model's answer has to survive
 * before anything is drawn from it, and `buildTopic` is arithmetic over rows
 * that were already public. The model call between them is the part that
 * cannot be tested here and is also the part that can do no damage — it names
 * a lens, and a lens is a number-free choice.
 */

const plan = (over: Partial<Plan> = {}): Plan => ({
  lens: "topic_world",
  subject: "Donald Trump",
  other: null,
  direction: "hate",
  title: "Who hates Donald Trump",
  note: "",
  ...over,
});

const board: TopicBoard = {
  slug: "donald-trump",
  question: "Donald Trump?",
  about: "US",
  rows: [
    { code: "ET", lovePct: 8, sample: "some" },
    { code: "FR", lovePct: 22, sample: "some" },
    { code: "TR", lovePct: 40, sample: "few" },
    { code: "US", lovePct: 71, sample: "many" },
  ],
};

const kinds = (blocks: Block[]) => blocks.map((b) => b.kind);
const headline = (blocks: Block[]) =>
  blocks.find((b) => b.kind === "headline") as Extract<Block, { kind: "headline" }>;
const ranking = (blocks: Block[]) =>
  blocks.find((b) => b.kind === "ranking") as Extract<Block, { kind: "ranking" }>;

describe("a question about a named thing is routed to the thing", () => {
  test("topic_world keeps the name it was given", () => {
    expect(clean({ lens: "topic_world", subject: "Donald Trump", direction: "hate" })?.subject)
      .toBe("Donald Trump");
    expect(clean({ lens: "topic_world", subject: "  the   iPhone " })?.subject)
      .toBe("the iPhone");
  });

  test("a name that is really an instruction is refused", () => {
    // Anything that is not a thing somebody could have typed as a name: a
    // sentence, a URL, a prompt. It becomes a search over live questions.
    expect(clean({ lens: "topic_world", subject: "a".repeat(80) })?.subject).toBeNull();
    expect(clean({ lens: "topic_world", subject: "https://example.com" })?.subject).toBeNull();
    expect(clean({ lens: "topic_world", subject: "x" })?.subject).toBeNull();
  });

  test("every other lens still gets a country code and nothing else", () => {
    expect(clean({ lens: "verdict_ranking", subject: "cn" })?.subject).toBe("CN");
    expect(clean({ lens: "verdict_ranking", subject: "Donald Trump" })?.subject).toBeNull();
    expect(clean({ lens: "nonsense" })?.lens).toBe("extremes");
  });
});

describe("one question, and what each country made of it", () => {
  test("who hates it leads with the country that hates it most", () => {
    const out = buildTopic(plan(), board);
    expect(headline(out).flag).toBe("ET");
    expect(headline(out).label).toBe("Thinks least of it");
    expect(kinds(out)).toContain("map");
  });

  test("who loves it leads with the other end", () => {
    const out = buildTopic(plan({ direction: "love" }), board);
    expect(headline(out).flag).toBe("US");
    expect(headline(out).label).toBe("Thinks most of it");
  });

  /* The line the topic page has always drawn: a country's lean on one question
     is public, and the counts behind it are what a vote or a peek buys. Assert
     the absence, not the presence — a count that leaks here is the gate open
     one row at a time. */
  test("it publishes leans and never counts", () => {
    const out = buildTopic(plan(), board);
    for (const r of ranking(out).rows) {
      expect(r.votes).toBeUndefined();
      expect(r.sample).toMatch(/^(few|some|many)$/);
    }
    const drawn = JSON.stringify(out);
    for (const leaked of ["votes", "freeLove", "paidLove", "total"]) {
      expect(drawn).not.toContain(leaked);
    }
  });

  test("a board with almost nobody on it says so", () => {
    const thin: TopicBoard = { ...board, rows: board.rows.slice(0, 2) };
    const text = JSON.stringify(buildTopic(plan(), thin));
    expect(text).toContain("early rather than settled");
  });
});

/* ── the near miss ────────────────────────────────────────────────────────
   A search that walks down its results looking for one with votes will answer
   a different question rather than admit it has nothing. */

describe("it answers the question that was asked, or none", () => {
  test("one real word in common is the bar", () => {
    expect(relevant("Donald Trump", "Donald Trump?")).toBe(true);
    expect(relevant("trump", "Donald Trump?")).toBe(true);
    expect(relevant("the switch", "Nintendo Switch?")).toBe(true);
  });

  test("a shared small word is not a match", () => {
    /* The live failure: "pineapple on pizza" came back as "Marmite on toast?",
       which shares `on` and nothing else — and it had votes, so it stood in
       for a question nobody had voted on. A near miss is worse than a miss. */
    expect(relevant("pineapple on pizza", "Marmite on toast?")).toBe(false);
    expect(relevant("the iPhone", "The death penalty?")).toBe(false);
  });

  test("a name with nothing long in it still matches anything", () => {
    // Nothing to compare on, so the search's own ordering is all there is.
    expect(relevant("BMW", "Cars?")).toBe(true);
  });
});
