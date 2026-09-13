import { v } from "convex/values";

import { CATEGORIES } from "./config";
import { internalMutation, type MutationCtx } from "./_generated/server";
import type { Id } from "./_generated/dataModel";
import { SEED_TOPICS } from "./seedTopics";
import { slugify } from "./lib/slug";

/**
 * Planting the hundred written topics.
 *
 * Idempotent by slug: running it twice adds nothing, so it is safe on a
 * deployment that already has rounds. Each topic gets its counters and an
 * `auditLog` row saying a person wrote it rather than a crawler finding it —
 * provenance stays traceable, which is the point of the log.
 *
 * These are topics, not fabricated activity. No votes, no comments and no money
 * are invented anywhere: every counter starts at zero and only real play moves
 * it.
 */

async function seedAuthor(ctx: MutationCtx): Promise<Id<"users">> {
  const existing = await ctx.db
    .query("users")
    .withIndex("by_auth", (q) => q.eq("authId", "system:seed"))
    .unique();
  if (existing) return existing._id;

  // Its own account, distinct from discovery's, so the two kinds of topic can
  // always be told apart later.
  return await ctx.db.insert("users", {
    authId: "system:seed",
    email: "",
    displayName: "House",
    walletBalanceCents: 0,
    quillBalance: 0,
    role: "creator",
    isBanned: false,
    profilePublic: false,
    topicsBacked: 0,
    digestOptIn: false,
  });
}

async function categoryId(
  ctx: MutationCtx,
  slug: string,
): Promise<Id<"categories">> {
  const found = await ctx.db
    .query("categories")
    .withIndex("by_slug", (q) => q.eq("slug", slug))
    .unique();
  if (found) return found._id;

  const known = CATEGORIES.find((c) => c.slug === slug);
  return await ctx.db.insert("categories", { slug, name: known?.name ?? slug });
}

export const topics = internalMutation({
  args: {
    /** Where to resume. The work is split so no one mutation runs long. */
    from: v.optional(v.number()),
    batch: v.optional(v.number()),
  },
  returns: v.object({
    planted: v.number(),
    skipped: v.number(),
    nextFrom: v.union(v.null(), v.number()),
  }),
  handler: async (ctx, args) => {
    const from = args.from ?? 0;
    const batch = Math.min(args.batch ?? 25, 40);
    const slice = SEED_TOPICS.slice(from, from + batch);
    if (slice.length === 0) return { planted: 0, skipped: 0, nextFrom: null };

    const author = await seedAuthor(ctx);
    let planted = 0;
    let skipped = 0;

    for (const seed of slice) {
      const slug = slugify(seed.q);
      const taken = await ctx.db
        .query("topics")
        .withIndex("by_slug", (q) => q.eq("slug", slug))
        .unique();
      if (taken) {
        skipped += 1;
        continue;
      }

      const topicId = await ctx.db.insert("topics", {
        slug,
        question: seed.q,
        categoryId: await categoryId(ctx, seed.c),
        status: "active",
        isSensitive: false,
        isLocked: false,
        isFeatured: false,
        createdBy: author,
      });

      await ctx.db.insert("topicStats", {
        topicId,
        freeLove: 0,
        freeHate: 0,
        paidLove: 0,
        paidHate: 0,
        stakedCents: 0,
        skips: 0,
        comments: 0,
      });

      await ctx.db.insert("auditLog", {
        actorId: author,
        action: "topic.seeded",
        targetType: "topics",
        targetId: topicId,
        metadata: { category: seed.c },
      });
      planted += 1;
    }

    const next = from + batch;
    return {
      planted,
      skipped,
      nextFrom: next < SEED_TOPICS.length ? next : null,
    };
  },
});
