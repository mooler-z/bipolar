import { paginationOptsValidator } from "convex/server";
import { v } from "convex/values";

import { CATEGORIES } from "./config";
import { mutation, query } from "./_generated/server";
import type { Doc, Id } from "./_generated/dataModel";
import { canManageAllContent, type Role } from "./lib/rbac";
import { audit, requirePermission } from "./admin";
import { pageOf } from "./lib/page";

/**
 * The topic console.
 *
 * This exists because discovery mints topics on a six-hour cron and nobody was
 * watching. Before this, pulling a bad one meant a CLI call — which is fine at
 * three in the afternoon and useless at any other time.
 *
 * Three rules hold in every mutation here:
 *
 * 1. **Capability, then ownership.** `requirePermission` says what a role may
 *    do; `mine()` says what a *creator* may do it to. A permission check cannot
 *    see who wrote the row, so ownership is enforced where the document is.
 * 2. **Archive, never delete.** A topic is the record of what discovery did and
 *    what people voted on. Archiving takes it out of every feed and every board
 *    without pretending it never existed.
 * 3. **Every write audits in the same mutation.** Rule 8. There is no path
 *    through this file that changes a topic and leaves no row.
 */

const SCAN = 600;

const row = v.object({
  _id: v.id("topics"),
  slug: v.string(),
  question: v.string(),
  categorySlug: v.string(),
  status: v.string(),
  isFeatured: v.boolean(),
  isLocked: v.boolean(),
  isSensitive: v.boolean(),
  scopeCountry: v.optional(v.string()),
  imageUrl: v.optional(v.string()),
  wikipediaTitle: v.optional(v.string()),
  votes: v.number(),
  comments: v.number(),
  postedAt: v.number(),
  /** The crawling session that minted it, when a crawler did. */
  runSeq: v.union(v.null(), v.number()),
  mine: v.boolean(),
});

/**
 * A creator may only act on what it wrote. Moderators and above act on all of
 * it — the one place `canManageAllContent` is load-bearing rather than decorative.
 */
function mine(user: Doc<"users">, topic: Doc<"topics">): boolean {
  return canManageAllContent(user.role as Role) || topic.createdBy === user._id;
}

async function ownedOrRefuse(
  ctx: Parameters<typeof requirePermission>[0],
  user: Doc<"users">,
  topicId: Id<"topics">,
): Promise<Doc<"topics">> {
  const topic = await ctx.db.get("topics", topicId);
  if (!topic) throw new Error("That topic is gone.");
  if (!mine(user, topic)) {
    throw new Error("Creators can only change topics they wrote.");
  }
  return topic;
}

export const list = query({
  args: {
    paginationOpts: paginationOptsValidator,
    search: v.optional(v.string()),
    status: v.optional(v.string()),
  },
  returns: pageOf(row),
  handler: async (ctx, args) => {
    const user = await requirePermission(ctx, "topics:update");

    const result = await ctx.db.query("topics").order("desc").paginate(args.paginationOpts);
    const needle = args.search?.trim().toLowerCase() ?? "";

    /* Filtered after the page is read: `topics` carries no search index, and
       neither filter here is one. A page can therefore come back short and
       the next scroll fetches another — short pages, never missing rows. */
    const wanted = result.page.filter((t) => {
      if (args.status && t.status !== args.status) return false;
      if (!needle) return true;
      return (
        t.question.toLowerCase().includes(needle) ||
        t.slug.includes(needle) ||
        (t.wikipediaTitle?.toLowerCase().includes(needle) ?? false)
      );
    });

    /* One read per distinct session rather than one per row: a wave of fifteen
       drafts would otherwise fetch the same run fifteen times. */
    const seqOf = new Map<string, number | null>();
    for (const t of wanted) {
      if (!t.ingestRunId || seqOf.has(t.ingestRunId)) continue;
      const run = await ctx.db.get("ingestRuns", t.ingestRunId);
      seqOf.set(t.ingestRunId, run?.seq ?? null);
    }

    const rows = [];
    for (const t of wanted) {
      const category = await ctx.db.get("categories", t.categoryId);
      const stats = await ctx.db
        .query("topicStats")
        .withIndex("by_topic", (q) => q.eq("topicId", t._id))
        .unique();
      rows.push({
        _id: t._id,
        slug: t.slug,
        question: t.question,
        categorySlug: category?.slug ?? "uncategorised",
        status: t.status,
        isFeatured: t.isFeatured,
        isLocked: t.isLocked,
        isSensitive: t.isSensitive,
        scopeCountry: t.scopeCountry,
        imageUrl: t.externalImageUrl,
        wikipediaTitle: t.wikipediaTitle,
        votes: stats
          ? stats.freeLove + stats.freeHate + stats.paidLove + stats.paidHate
          : 0,
        comments: stats?.comments ?? 0,
        postedAt: t._creationTime,
        runSeq: t.ingestRunId ? (seqOf.get(t.ingestRunId) ?? null) : null,
        mine: mine(user, t),
      });
    }

    return { ...result, page: rows };
  },
});

/**
 * Take a topic out of circulation, or put it back.
 *
 * The one control this console exists for. Archiving removes a topic from every
 * feed and every board immediately; the row, its votes and its audit trail all
 * survive.
 */
export const setStatus = mutation({
  args: {
    topicId: v.id("topics"),
    status: v.union(
      v.literal("draft"),
      v.literal("active"),
      v.literal("archived"),
    ),
  },
  returns: v.object({ status: v.string() }),
  handler: async (ctx, args) => {
    /* Approving is the act this console exists to gate. Creators write topics;
       moderators decide what the public sees. */
    const need =
      args.status === "archived"
        ? "topics:archive"
        : args.status === "active"
          ? "topics:publish"
          : "topics:update";
    const user = await requirePermission(ctx, need);
    const topic = await ownedOrRefuse(ctx, user, args.topicId);
    if (topic.status === args.status) return { status: topic.status };

    await ctx.db.patch(args.topicId, { status: args.status });
    /* A featured topic that leaves circulation must not stay featured — the
       ranker weights `isFeatured` and would keep promoting a dead row. */
    if (args.status !== "active" && topic.isFeatured) {
      await ctx.db.patch(args.topicId, { isFeatured: false });
    }
    await audit(ctx, user._id, "topic.status", "topic", args.topicId, {
      was: topic.status,
      now: args.status,
      question: topic.question,
    });
    return { status: args.status };
  },
});

/** Freeze voting without taking the topic down. Checked on every cast. */
export const setLocked = mutation({
  args: { topicId: v.id("topics"), locked: v.boolean() },
  returns: v.object({ locked: v.boolean() }),
  handler: async (ctx, args) => {
    const user = await requirePermission(ctx, "topics:lock");
    const topic = await ownedOrRefuse(ctx, user, args.topicId);
    await ctx.db.patch(args.topicId, { isLocked: args.locked });
    await audit(ctx, user._id, "topic.lock", "topic", args.topicId, {
      locked: args.locked,
      question: topic.question,
    });
    return { locked: args.locked };
  },
});

/**
 * Feature one topic.
 *
 * Featuring is **exclusive**: the ranker gives a featured topic a weight that
 * only means anything if one topic has it, so promoting a second silently
 * demotes the first. Doing that in one mutation is the difference between a
 * rule and a hope.
 */
export const setFeatured = mutation({
  args: { topicId: v.id("topics"), featured: v.boolean() },
  returns: v.object({ featured: v.boolean(), demoted: v.number() }),
  handler: async (ctx, args) => {
    const user = await requirePermission(ctx, "topics:feature");
    const topic = await ownedOrRefuse(ctx, user, args.topicId);

    if (args.featured && topic.status !== "active") {
      throw new Error("Only a published topic can be featured.");
    }

    let demoted = 0;
    if (args.featured) {
      const others = await ctx.db.query("topics").take(SCAN);
      for (const other of others) {
        if (other._id === args.topicId || !other.isFeatured) continue;
        await ctx.db.patch(other._id, { isFeatured: false });
        demoted += 1;
      }
    }

    await ctx.db.patch(args.topicId, { isFeatured: args.featured });
    await audit(ctx, user._id, "topic.feature", "topic", args.topicId, {
      featured: args.featured,
      demoted,
      question: topic.question,
    });
    return { featured: args.featured, demoted };
  },
});

/** Rewrite the words. The question, its context, and how spicy it is. */
export const edit = mutation({
  args: {
    topicId: v.id("topics"),
    question: v.optional(v.string()),
    description: v.optional(v.string()),
    category: v.optional(v.string()),
    sensitive: v.optional(v.boolean()),
  },
  returns: v.object({ question: v.string() }),
  handler: async (ctx, args) => {
    const user = await requirePermission(ctx, "topics:update");
    const topic = await ownedOrRefuse(ctx, user, args.topicId);

    const patch: Partial<Doc<"topics">> = {};
    const changed: Record<string, unknown> = {};

    if (args.question !== undefined) {
      const q = args.question.trim();
      // The same floor the importer holds every other path to.
      if (q.length < 8 || q.length > 70 || !q.endsWith("?")) {
        throw new Error("A question is 8-70 characters and ends in a '?'.");
      }
      if (q !== topic.question) {
        patch.question = q;
        changed.question = { was: topic.question, now: q };
      }
    }
    if (args.description !== undefined) {
      patch.description = args.description.trim().slice(0, 200) || undefined;
      changed.description = true;
    }
    if (args.sensitive !== undefined && args.sensitive !== topic.isSensitive) {
      patch.isSensitive = args.sensitive;
      changed.sensitive = args.sensitive;
    }
    if (args.category) {
      if (!CATEGORIES.some((c) => c.slug === args.category)) {
        throw new Error(`Unknown category "${args.category}".`);
      }
      const cat = await ctx.db
        .query("categories")
        .withIndex("by_slug", (q) => q.eq("slug", args.category!))
        .unique();
      if (cat && cat._id !== topic.categoryId) {
        patch.categoryId = cat._id;
        changed.category = args.category;
      }
    }

    if (Object.keys(patch).length > 0) {
      await ctx.db.patch(args.topicId, patch);
      await audit(ctx, user._id, "topic.edit", "topic", args.topicId, changed);
    }
    return { question: patch.question ?? topic.question };
  },
});
