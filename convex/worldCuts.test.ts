import { describe, expect, test } from "vitest";

import { byCategory, byCountry, lean, pairs, verdicts, type StatRow, type TopicRow } from "./lib/worldCuts";

/**
 * A page of superlatives is the hardest kind of page to check by eye.
 *
 * "Which country hates which country most" is one row. If the arithmetic is
 * wrong it still renders, still looks authoritative, and nobody ever finds
 * out — so every board is asserted against rows whose answer is known in
 * advance, including the awkward ones: the unknown-country sentinel, a nation
 * of one voter, and a pair that has only ever met once.
 */

const stat = (
  topicId: string,
  countryCode: string,
  freeLove: number,
  freeHate: number,
  paid: [number, number] = [0, 0],
): StatRow => ({
  topicId,
  countryCode,
  freeLove,
  freeHate,
  paidLove: paid[0],
  paidHate: paid[1],
});

const topic = (id: string, about?: string, categorySlug = "news"): TopicRow => ({
  _id: id,
  slug: id,
  question: `${id}?`,
  scopeCountry: about,
  categorySlug,
});

const map = (...rows: TopicRow[]) => new Map(rows.map((t) => [t._id, t]));

describe("a lean", () => {
  test("rounds to whole numbers and survives an empty room", () => {
    expect(lean(61, 39)).toEqual({ lovePct: 61, votes: 100 });
    expect(lean(1, 2)).toEqual({ lovePct: 33, votes: 3 });
    // Nobody has spoken: neither side is winning, and it is not a divide-by-zero.
    expect(lean(0, 0)).toEqual({ lovePct: 50, votes: 0 });
  });
});

describe("what a country thinks, across everything", () => {
  test("paid and free both count, and topics are counted once", () => {
    const rows = [
      stat("t1", "ET", 3, 1, [1, 0]),
      stat("t2", "ET", 0, 4),
      stat("t1", "US", 1, 0),
    ];
    const [et, us] = byCountry(rows);
    expect(et).toMatchObject({ code: "ET", love: 4, hate: 5, votes: 9, topics: 2 });
    expect(us).toMatchObject({ code: "US", votes: 1, topics: 1 });
    // Ordered by how much a country has actually said.
    expect(et!.votes).toBeGreaterThan(us!.votes);
  });

  test("the unknown-country sentinel is not a country", () => {
    // Left in, ZZ wins every board by volume and means nothing.
    const rows = [stat("t1", "ZZ", 99, 99), stat("t1", "ET", 1, 0)];
    expect(byCountry(rows).map((c) => c.code)).toEqual(["ET"]);
  });

  test("a row nobody voted in is not a row", () => {
    expect(byCountry([stat("t1", "ET", 0, 0)])).toEqual([]);
  });
});

describe("which country hates which country", () => {
  const topics = map(topic("t1", "US"), topic("t2", "US"), topic("t3", "FR"), topic("t4"));

  test("it sums a country's lean over every topic about the other", () => {
    const rows = [
      stat("t1", "ET", 1, 3),
      stat("t2", "ET", 0, 4),
      stat("t3", "ET", 4, 0),
      // A topic about nowhere cannot be an opinion about anywhere.
      stat("t4", "ET", 9, 0),
    ];
    const out = verdicts(rows, topics, 1);
    const aboutUs = out.find((v) => v.from === "ET" && v.about === "US")!;
    expect(aboutUs).toMatchObject({ votes: 8, lovePct: 13, topics: 2 });
    const aboutFr = out.find((v) => v.about === "FR")!;
    expect(aboutFr.lovePct).toBe(100);
    expect(out.some((v) => v.about === null || v.about === undefined)).toBe(false);
  });

  test("the harshest verdict sorts first", () => {
    const rows = [stat("t1", "ET", 0, 4), stat("t3", "ET", 4, 0)];
    expect(verdicts(rows, topics, 1)[0]).toMatchObject({ about: "US", lovePct: 0 });
  });

  test("one person's opinion is not a nation's", () => {
    /* The strongest-looking rows are always the ones with least behind them —
       a single 0% is a person having a bad day, not a country. */
    const rows = [stat("t1", "ET", 0, 1), stat("t3", "ET", 5, 0)];
    const out = verdicts(rows, topics, 3);
    expect(out.map((v) => v.about)).toEqual(["FR"]);
  });

  test("a country judging itself is kept, because it is the better story", () => {
    const rows = [stat("t1", "US", 0, 5)];
    expect(verdicts(rows, topics, 1)[0]).toMatchObject({ from: "US", about: "US", lovePct: 0 });
  });
});

describe("who argues with whom", () => {
  test("agreement averages closeness over the topics two countries share", () => {
    const rows = [
      // Both adore it.
      stat("t1", "ET", 10, 0),
      stat("t1", "US", 10, 0),
      // Dead opposite.
      stat("t2", "ET", 10, 0),
      stat("t2", "US", 0, 10),
      // Both hate it.
      stat("t3", "ET", 0, 10),
      stat("t3", "US", 0, 10),
    ];
    const [p] = pairs(rows, 3);
    // 100, 0, 100 → 67, and they landed the same side twice in three.
    expect(p).toMatchObject({ a: "ET", b: "US", agreement: 67, shared: 3, sameSide: 2 });
  });

  test("two countries that met once are a coincidence, not a rivalry", () => {
    const rows = [stat("t1", "ET", 5, 0), stat("t1", "US", 0, 5)];
    expect(pairs(rows, 3)).toEqual([]);
    expect(pairs(rows, 1)).toHaveLength(1);
  });

  test("the pair that agrees least sorts first, and each pair appears once", () => {
    const rows = [
      stat("t1", "AA", 10, 0), stat("t1", "BB", 0, 10), stat("t1", "CC", 9, 1),
      stat("t2", "AA", 10, 0), stat("t2", "BB", 0, 10), stat("t2", "CC", 9, 1),
      stat("t3", "AA", 10, 0), stat("t3", "BB", 0, 10), stat("t3", "CC", 9, 1),
    ];
    const out = pairs(rows, 3);
    expect(out).toHaveLength(3);
    expect(out[0]).toMatchObject({ a: "AA", b: "BB", agreement: 0 });
    // Never both AA|BB and BB|AA.
    expect(new Set(out.map((p) => [p.a, p.b].sort().join()))).toHaveProperty("size", 3);
  });
});

describe("which subjects the world came to argue about", () => {
  test("leans are summed per category and topics counted once", () => {
    const topics = map(topic("t1", undefined, "sport"), topic("t2", undefined, "sport"), topic("t3", undefined, "food"));
    const rows = [
      stat("t1", "ET", 3, 1),
      stat("t1", "US", 1, 3),
      stat("t2", "ET", 0, 4),
      stat("t3", "ET", 4, 0),
    ];
    const [sport, food] = byCategory(rows, topics);
    expect(sport).toMatchObject({ slug: "sport", votes: 12, lovePct: 33, topics: 2 });
    expect(food).toMatchObject({ slug: "food", lovePct: 100, topics: 1 });
  });

  test("a row for a topic that is gone counts towards nothing", () => {
    expect(byCategory([stat("ghost", "ET", 5, 0)], map())).toEqual([]);
  });
});

/* ── the gate, on a page that has no sign-in ──────────────────────────── */

import { convexTest } from "convex-test";
import { api } from "./_generated/api";
import schema from "./schema";

const modules = import.meta.glob("./**/*.ts");

describe("the world page is public, so it carries no answers", () => {
  async function room() {
    const t = convexTest(schema, modules);
    const topicId = await t.run(async (ctx) => {
      const author = await ctx.db.insert("users", {
        authId: "system:test",
        email: "",
        displayName: "Discovery",
        walletBalanceCents: 0,
        quillBalance: 0,
        role: "creator",
        isBanned: false,
        profilePublic: false,
        topicsBacked: 0,
        digestOptIn: false,
      });
      const categoryId = await ctx.db.insert("categories", { slug: "food", name: "Food" });
      const id = await ctx.db.insert("topics", {
        slug: "pineapple",
        question: "Pineapple on pizza?",
        categoryId,
        status: "active",
        isSensitive: false,
        isLocked: false,
        isFeatured: false,
        scopeCountry: "IT",
        createdBy: author,
      });
      await ctx.db.insert("countryTopicStats", {
        topicId: id,
        countryCode: "ET",
        freeLove: 3,
        freeHate: 9,
        paidLove: 0,
        paidHate: 0,
      });
      return id;
    });
    return { t, topicId };
  }

  test("a signed-out reader gets the boards", async () => {
    const { t } = await room();
    const board = await t.query(api.world.board, {});
    expect(board.totals.votes).toBe(12);
    expect(board.totals.countries).toBe(1);
    // The headline board: what Ethiopia makes of Italy.
    expect(board.verdicts[0]).toMatchObject({ from: "ET", about: "IT", lovePct: 25 });
  });

  test("a named question carries its volume and never its answer", async () => {
    const { t } = await room();
    const board = await t.query(api.world.board, {});
    const [loudest] = board.loudest;

    expect(loudest).toMatchObject({ slug: "pineapple", votes: 12 });
    /* Assert the absence, not the presence. A topic's own split is what a vote
       or a peek buys, and this page has neither behind it — so no shape of
       arithmetic over one row here may reach it. */
    expect(Object.keys(loudest!).sort()).toEqual(["about", "question", "slug", "votes"]);
    const drawn = JSON.stringify(loudest);
    for (const gated of ["lovePct", "love", "hate", "freeLove", "stats"]) {
      expect(drawn).not.toContain(gated);
    }
  });

  test("an archived question counts towards nothing", async () => {
    const { t, topicId } = await room();
    await t.run(async (ctx) => {
      await ctx.db.patch("topics", topicId, { status: "archived" });
    });
    const board = await t.query(api.world.board, {});
    // A board built on questions nobody can open is a board of dead ends.
    expect(board.totals.votes).toBe(0);
    expect(board.loudest).toEqual([]);
  });
});

describe("a board with two ends keeps both of them", () => {
  test("trimming a sorted list of pairs does not throw the friendships away", async () => {
    const t = convexTest(schema, modules);
    /* Twelve countries make sixty-six pairs, which is more than the board
       shows — so the trim has to take from both ends. A plain slice kept the
       worst forty and left the "same mind" board showing the least-bad feuds. */
    const codes = ["AA","BB","CC","DD","EE","FF","GG","HH","II","JJ","KK","LL"];
    await t.run(async (ctx) => {
      const author = await ctx.db.insert("users", {
        authId: "system:test", email: "", displayName: "Discovery",
        walletBalanceCents: 0, quillBalance: 0, role: "creator",
        isBanned: false, profilePublic: false, topicsBacked: 0, digestOptIn: false,
      });
      const categoryId = await ctx.db.insert("categories", { slug: "news", name: "News" });
      for (let i = 0; i < 5; i++) {
        const topicId = await ctx.db.insert("topics", {
          slug: `t${i}`, question: `t${i}?`, categoryId, status: "active",
          isSensitive: false, isLocked: false, isFeatured: false, createdBy: author,
        });
        await ctx.db.insert("topicStats", {
          topicId, freeLove: 0, freeHate: 0, paidLove: 0, paidHate: 0,
          stakedCents: 0, skips: 0, comments: 0,
        });
        // Half the alphabet always loves, half always hates: the pairs within
        // a half agree completely, and across the halves never.
        for (const [n, code] of codes.entries()) {
          const loves = n < 6;
          await ctx.db.insert("countryTopicStats", {
            topicId, countryCode: code,
            freeLove: loves ? 1 : 0, freeHate: loves ? 0 : 1,
            paidLove: 0, paidHate: 0,
          });
        }
      }
    });

    const board = await t.query(api.world.board, {});
    const best = Math.max(...board.pairs.map((p) => p.agreement));
    const worst = Math.min(...board.pairs.map((p) => p.agreement));
    expect(worst).toBe(0);
    expect(best).toBe(100);
  });
});
