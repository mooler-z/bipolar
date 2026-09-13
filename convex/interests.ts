import { v } from "convex/values";

import { CATEGORIES } from "./config";
import { mutation, query, type MutationCtx } from "./_generated/server";
import type { Id } from "./_generated/dataModel";
import { ALPHA, SIGNAL, TASTE_PRIOR, ema } from "./lib/rank";
import { currentUser, ensureUser } from "./users";

/**
 * What a reader says they want, and what they turn out to want.
 *
 * Onboarding asks two questions — where you are, and what you care about —
 * because both feed the ranker and neither can be guessed well. Country drives
 * the "your country disagrees with the world" term and the per-country boards;
 * interests seed affinity before there is any behaviour to learn from.
 *
 * After that the answers stop mattering much: every vote and skip nudges a live
 * taste weight, and affinity blends the two so a stated interest decays into a
 * demonstrated one.
 */

export const categories = query({
  args: {},
  returns: v.array(
    v.object({ _id: v.id("categories"), slug: v.string(), name: v.string() }),
  ),
  handler: async (ctx) => {
    const rows = await ctx.db.query("categories").take(50);
    // Ordered by the catalogue rather than by insertion, so the picker reads
    // the same on every deployment regardless of what discovery minted first.
    const order = new Map<string, number>(
      CATEGORIES.map((c, i) => [c.slug as string, i]),
    );
    return rows
      .sort((a, b) => (order.get(a.slug) ?? 99) - (order.get(b.slug) ?? 99))
      .map((c) => ({ _id: c._id, slug: c.slug, name: c.name }));
  },
});

export const mine = query({
  args: {},
  returns: v.object({
    onboarded: v.boolean(),
    countryCode: v.union(v.null(), v.string()),
    categorySlugs: v.array(v.string()),
  }),
  handler: async (ctx) => {
    const user = await currentUser(ctx);
    if (!user) {
      return { onboarded: false, countryCode: null, categorySlugs: [] };
    }
    const rows = await ctx.db
      .query("userInterests")
      .withIndex("by_user", (q) => q.eq("userId", user._id))
      .take(50);

    const slugs: string[] = [];
    for (const row of rows) {
      const category = await ctx.db.get("categories", row.categoryId);
      if (category) slugs.push(category.slug);
    }
    return {
      onboarded: user.onboardedAt !== undefined,
      countryCode: user.countryCode ?? null,
      categorySlugs: slugs,
    };
  },
});

/**
 * Both onboarding answers, saved together.
 *
 * One mutation because they are one decision as far as the reader is concerned,
 * and because marking the account onboarded halfway through would strand anyone
 * who closed the tab between the two steps.
 */
export const save = mutation({
  args: {
    countryCode: v.optional(v.string()),
    categorySlugs: v.array(v.string()),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    // Creates the account row if it is missing rather than refusing. A signed-in
    // reader whose row does not exist yet is the *normal* first-run case, and it
    // is also what a wiped deployment leaves behind.
    const userId = await ensureUser(ctx);
    const user = (await ctx.db.get("users", userId))!;

    if (args.countryCode) {
      const code = args.countryCode.trim().toUpperCase();
      if (!/^[A-Z]{2}$/.test(code)) throw new Error("Two letters, ISO 3166-1.");
      // Onboarding is not a country *change*: it fills a blank, so it does not
      // spend one of the two changes a month `users.setCountry` rations.
      await ctx.db.patch("users", user._id, { countryCode: code });
    }

    const existing = await ctx.db
      .query("userInterests")
      .withIndex("by_user", (q) => q.eq("userId", user._id))
      .take(50);
    for (const row of existing) await ctx.db.delete("userInterests", row._id);

    const wanted = args.categorySlugs.slice(0, 12);
    for (const slug of wanted) {
      if (!CATEGORIES.some((c) => c.slug === slug)) continue;
      const category = await ctx.db
        .query("categories")
        .withIndex("by_slug", (q) => q.eq("slug", slug))
        .unique();
      if (!category) continue;
      await ctx.db.insert("userInterests", {
        userId: user._id,
        categoryId: category._id,
      });
    }

    await ctx.db.patch("users", user._id, { onboardedAt: Date.now() });
    return null;
  },
});

/* ── The live half ──────────────────────────────────────────────────────── */

/**
 * Nudge a category's taste weight.
 *
 * A vote pulls the weight towards 1, a skip towards 0, both by an exponential
 * moving average — so the feed reflects the last few taps rather than needing
 * a hundred before it moves, and no single tap can swing it.
 *
 * Taste is a derived cache, rebuildable from votes, so this must never be the
 * reason a vote fails. It is called inside the vote transaction and does only
 * indexed reads and one write.
 */
export async function nudgeTaste(
  ctx: MutationCtx,
  userId: Id<"users">,
  categoryId: Id<"categories">,
  kind: "vote" | "skip",
): Promise<void> {
  const alpha = ALPHA[kind];
  const signal = SIGNAL[kind];

  const row = await ctx.db
    .query("userTaste")
    .withIndex("by_user_category", (q) =>
      q.eq("userId", userId).eq("categoryId", categoryId),
    )
    .unique();

  if (row) {
    await ctx.db.patch("userTaste", row._id, {
      weight: ema(row.weight, signal, alpha),
    });
  } else {
    await ctx.db.insert("userTaste", {
      userId,
      categoryId,
      weight: ema(TASTE_PRIOR, signal, alpha),
    });
  }
}

/** Record which way this reader leans in a category, for the provocation term. */
export async function noteCategoryLean(
  ctx: MutationCtx,
  userId: Id<"users">,
  categoryId: Id<"categories">,
  choice: "love" | "hate",
): Promise<void> {
  const row = await ctx.db
    .query("userCategoryStats")
    .withIndex("by_user_category", (q) =>
      q.eq("userId", userId).eq("categoryId", categoryId),
    )
    .unique();

  if (row) {
    await ctx.db.patch("userCategoryStats", row._id, {
      love: row.love + (choice === "love" ? 1 : 0),
      hate: row.hate + (choice === "hate" ? 1 : 0),
    });
  } else {
    await ctx.db.insert("userCategoryStats", {
      userId,
      categoryId,
      love: choice === "love" ? 1 : 0,
      hate: choice === "hate" ? 1 : 0,
    });
  }
}
