/// <reference types="vite/client" />
import { convexTest } from "convex-test";
import { describe, expect, test } from "vitest";

import { internal } from "./_generated/api";
import type { Id } from "./_generated/dataModel";
import schema from "./schema";

/**
 * The replay is the proof, so the replay is tested against a reader whose
 * taste is known. If the learned ranker cannot beat the old one on somebody
 * who only ever engages with pizza and only ever skips war, it cannot beat it
 * on anyone — and the test says so.
 */

const modules = import.meta.glob("./**/*.ts");

describe("the report card", () => {
  test("a reader with a taste is ranked better by the ranker that learned it", async () => {
    const t = convexTest(schema, modules);

    const { userId, pizza, war } = await t.run(async (ctx) => {
      const userId = await ctx.db.insert("users", {
        authId: "s", email: "s@example.test", displayName: "s",
        walletBalanceCents: 0, quillBalance: 0, role: "user", isBanned: false,
        profilePublic: false, topicsBacked: 0, digestOptIn: false,
      });
      const food = await ctx.db.insert("categories", { slug: "food", name: "Food" });
      const world = await ctx.db.insert("categories", { slug: "world", name: "World" });
      const mk = async (slug: string, categoryId: Id<"categories">, tag: string, love: number, hate: number) => {
        const id = await ctx.db.insert("topics", {
          slug, question: `${slug}?`, categoryId, status: "active",
          isSensitive: false, isLocked: false, isFeatured: false, tagSlugs: [tag], createdBy: userId,
        });
        await ctx.db.insert("topicStats", {
          topicId: id, freeLove: love, freeHate: hate, paidLove: 0, paidHate: 0,
          stakedCents: 0, skips: 0, comments: 0,
        });
        return id;
      };
      // The war topics are the busier, more evenly split argument, so the old
      // ranker — which only knows tension — prefers every one of them.
      const pizza = [] as Id<"topics">[];
      const war = [] as Id<"topics">[];
      for (let i = 0; i < 4; i++) pizza.push(await mk(`pizza-${i}`, food, "pizza", 3, 2));
      for (let i = 0; i < 4; i++) war.push(await mk(`war-${i}`, world, "war", 40, 40));
      return { userId, pizza, war };
    });

    // What this reader did, in order: went for pizza, bounced off war.
    const acts: { topicId: Id<"topics">; kind: "pull" | "vote" | "skip" | "comment" }[] = [
      { topicId: pizza[0]!, kind: "pull" },
      { topicId: war[0]!, kind: "skip" },
      { topicId: pizza[1]!, kind: "vote" },
      { topicId: war[1]!, kind: "skip" },
      { topicId: pizza[2]!, kind: "comment" },
      { topicId: war[2]!, kind: "skip" },
      { topicId: pizza[3]!, kind: "vote" },
    ];
    await t.run(async (ctx) => {
      for (const a of acts) {
        const topic = (await ctx.db.get("topics", a.topicId))!;
        await ctx.db.insert("interactions", {
          userId, topicId: a.topicId, kind: a.kind,
          categoryId: topic.categoryId, tagSlugs: topic.tagSlugs ?? [],
        });
      }
    });

    const report = await t.action(internal.recommend.evaluate, {});
    expect(report.readers).toBe(1);
    expect(report.acts).toBeGreaterThan(0);

    // The old ranker put the pizza this reader went on to choose behind the
    // four war topics every time. The one that learned did not.
    expect(report.learned.mrr).toBeGreaterThan(report.baseline.mrr);
    expect(report.learned.medianRank).toBeLessThan(report.baseline.medianRank);
    expect(report.separation).toBeGreaterThan(0);

    const kept = await t.run(async (ctx) => await ctx.db.query("recommendReports").collect());
    expect(kept).toHaveLength(1);
  });
});
