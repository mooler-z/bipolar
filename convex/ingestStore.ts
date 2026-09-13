import { v } from "convex/values";

import { CATEGORIES } from "./config";
import {
  internalMutation,
  internalQuery,
  type MutationCtx,
} from "./_generated/server";
import type { Id } from "./_generated/dataModel";
import { slugify, suffix } from "./lib/slug";
import { discoveryMode } from "./settings";

/**
 * The database half of topic discovery. The action in `ingest.ts` talks to
 * Firecrawl and OpenAI; everything that touches a table happens here, in
 * transactions, because an action can be retried and a half-written topic
 * would be worse than no topic.
 */

/** Which of these URLs has discovery not already considered? */
export const unseen = internalQuery({
  args: { urls: v.array(v.string()) },
  returns: v.array(v.string()),
  handler: async (ctx, args) => {
    const fresh: string[] = [];
    for (const url of args.urls) {
      const seen = await ctx.db
        .query("ingestSeen")
        .withIndex("by_url", (q) => q.eq("url", url))
        .first();
      if (!seen) fresh.push(url);
    }
    return fresh;
  },
});

export const markSeen = internalMutation({
  args: {
    url: v.string(),
    outcome: v.union(
      v.literal("minted"),
      v.literal("duplicate"),
      v.literal("rejected"),
      v.literal("failed"),
    ),
    score: v.optional(v.number()),
    topicId: v.optional(v.id("topics")),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    await ctx.db.insert("ingestSeen", args);
    return null;
  },
});

/**
 * The account topics are posted under when nobody posted them.
 *
 * Every topic needs an author, and these have none: a cron found a story and a
 * model wrote the question. Rather than leave `createdBy` nullable and teach
 * every reader to handle it, discovery owns one account of its own. It can
 * never sign in — no auth subject will ever equal this string.
 */
async function systemUser(ctx: MutationCtx): Promise<Id<"users">> {
  const existing = await ctx.db
    .query("users")
    .withIndex("by_auth", (q) => q.eq("authId", "system:discovery"))
    .unique();
  if (existing) return existing._id;

  return await ctx.db.insert("users", {
    authId: "system:discovery",
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
}

async function categoryId(ctx: MutationCtx, slug: string): Promise<Id<"categories">> {
  const found = await ctx.db
    .query("categories")
    .withIndex("by_slug", (q) => q.eq("slug", slug))
    .unique();
  if (found) return found._id;

  const known = CATEGORIES.find((c) => c.slug === slug);
  return await ctx.db.insert("categories", {
    slug,
    name: known?.name ?? slug,
  });
}

async function freeSlug(ctx: MutationCtx, question: string): Promise<string> {
  const base = slugify(question);
  const taken = await ctx.db
    .query("topics")
    .withIndex("by_slug", (q) => q.eq("slug", base))
    .unique();
  return taken ? `${base}-${suffix()}` : base;
}

/**
 * Write one discovered topic: the topic, its zeroed counters, the material it
 * came from, its tags, and the audit row that says a machine made it.
 *
 * One mutation. A topic without its `topicStats` row would read as a topic
 * with no votes and take its first vote down a path that has to invent one.
 */
export const mint = internalMutation({
  args: {
    question: v.string(),
    description: v.string(),
    category: v.string(),
    tags: v.array(v.string()),
    polarizing: v.number(),
    sensitive: v.boolean(),
    sourceUrl: v.string(),
    sourceTitle: v.string(),
    sourceSnippet: v.optional(v.string()),
    /** The country the topic is *about*. Absent means global. */
    scopeCountry: v.optional(v.string()),
  },
  returns: v.id("topics"),
  handler: async (ctx, args) => {
    const author = await systemUser(ctx);

    const topicId = await ctx.db.insert("topics", {
      slug: await freeSlug(ctx, args.question),
      question: args.question,
      categoryId: await categoryId(ctx, args.category),
      // `review` holds everything as a draft until a moderator says otherwise.
      status: (await discoveryMode(ctx)) === "review" ? "draft" : "active",
      description: args.description || undefined,
      sourceUrl: args.sourceUrl,
      scopeCountry: args.scopeCountry,
      isSensitive: args.sensitive,
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

    await ctx.db.insert("topicSources", {
      topicId,
      url: args.sourceUrl,
      title: args.sourceTitle,
      snippet: args.sourceSnippet,
    });

    for (const slug of args.tags) {
      const tag =
        (await ctx.db
          .query("tags")
          .withIndex("by_slug", (q) => q.eq("slug", slug))
          .unique()) ??
        (await ctx.db.get(
          "tags",
          await ctx.db.insert("tags", { slug, name: slug }),
        ));
      if (tag) await ctx.db.insert("topicTags", { topicId, tagId: tag._id });
    }

    // Rule 8: the privileged write and the record of it, same transaction.
    await ctx.db.insert("auditLog", {
      actorId: author,
      action: "topic.minted",
      targetType: "topics",
      targetId: topicId,
      metadata: {
        sourceUrl: args.sourceUrl,
        polarizing: args.polarizing,
      },
    });

    return topicId;
  },
});

export const startRun = internalMutation({
  args: { query: v.string() },
  returns: v.id("ingestRuns"),
  handler: async (ctx, args) =>
    await ctx.db.insert("ingestRuns", {
      query: args.query,
      found: 0,
      minted: 0,
      rejected: 0,
    }),
});

export const finishRun = internalMutation({
  args: {
    runId: v.id("ingestRuns"),
    found: v.number(),
    minted: v.number(),
    rejected: v.number(),
    error: v.optional(v.string()),
    finishedAt: v.number(),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const { runId, ...rest } = args;
    await ctx.db.patch("ingestRuns", runId, rest);
    return null;
  },
});
