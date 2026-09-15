import { v } from "convex/values";

import { CATEGORIES } from "./config";
import { internalMutation, type MutationCtx } from "./_generated/server";
import type { Id } from "./_generated/dataModel";
import { slugify, suffix } from "./lib/slug";

/**
 * Bulk import of topics written elsewhere.
 *
 * Discovery mints a trickle from the live web; this takes a prepared batch. It
 * applies exactly the same rules the model is held to — every check in
 * `lib/openai.ts` runs again here — because a topic arriving through a side
 * door is still a topic, and "it came from a file" is not a reason to trust it.
 *
 * The prepared batches that ship with the repository live in `seedBatches.ts`
 * and come back through `ingest` below, so every rule here applies to them too.
 *
 * Idempotent by slug, so the same batch can be re-run after a partial failure
 * without doubling anything. Rejections are returned with a reason rather than
 * swallowed: a batch that silently drops forty rows is worse than one that
 * fails.
 */

/** Questions that promise an answer LOVE and HATE cannot give. */
const OPEN_ENDED =
  /^(which|what|who|when|where|why|how|top|best|worst|rank|rate|choose|pick)\b/i;
/** The interface leaking into the content — the buttons already ask this. */
const SELF_REFERENTIAL = /\b(love or hate|do you|would you|should you)\b/i;

const incoming = v.object({
  q: v.string(),
  category: v.string(),
  country: v.optional(v.union(v.string(), v.null())),
  description: v.optional(v.string()),
  tags: v.optional(v.array(v.string())),
  sourceUrl: v.optional(v.string()),
  sourceTitle: v.optional(v.string()),
  polarizing: v.optional(v.number()),
  sensitive: v.optional(v.boolean()),
  /** An English Wikipedia article title, when a photo would illustrate this. */
  wikipediaTitle: v.optional(v.union(v.string(), v.null())),
});

/**
 * A usable Wikipedia article title, or nothing.
 *
 * The same shape of guard as the question rules above: a title that is a URL,
 * carries a fragment, or runs long is a model guessing rather than naming, and
 * a guess costs a wasted fetch and an image of the wrong thing.
 */
function wikiTitle(raw: string | null | undefined): string | undefined {
  const title = raw?.trim();
  if (!title || title.length > 120) return undefined;
  if (/^https?:\/\//i.test(title) || title.includes("#")) return undefined;
  return title;
}

async function author(ctx: MutationCtx): Promise<Id<"users">> {
  const existing = await ctx.db
    .query("users")
    .withIndex("by_auth", (q) => q.eq("authId", "system:import"))
    .unique();
  if (existing) return existing._id;

  // Its own account, so imported topics stay tellable apart from crawled ones.
  return await ctx.db.insert("users", {
    authId: "system:import",
    email: "",
    displayName: "Newsroom",
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

type Incoming = typeof incoming.type;
type Outcome = {
  added: number;
  skipped: number;
  rejected: { q: string; why: string }[];
};

/** The import itself, so the batch endpoint and the seeder cannot drift. */
export async function ingest(ctx: MutationCtx, topics: Incoming[]): Promise<Outcome> {
  const args = { topics };
  {
    const by = await author(ctx);
    let added = 0;
    let skipped = 0;
    const rejected: { q: string; why: string }[] = [];

    for (const row of args.topics) {
      const question = row.q.trim();

      if (question.length < 8 || question.length > 70) {
        rejected.push({ q: question, why: "length" });
        continue;
      }
      if (!question.endsWith("?")) {
        rejected.push({ q: question, why: "not a question" });
        continue;
      }
      if (OPEN_ENDED.test(question)) {
        rejected.push({ q: question, why: "open-ended" });
        continue;
      }
      if (SELF_REFERENTIAL.test(question)) {
        rejected.push({ q: question, why: "restates the buttons" });
        continue;
      }
      if (!CATEGORIES.some((c) => c.slug === row.category)) {
        rejected.push({ q: question, why: `unknown category ${row.category}` });
        continue;
      }
      if ((row.polarizing ?? 100) < 55) {
        rejected.push({ q: question, why: "not polarizing enough" });
        continue;
      }

      const base = slugify(question);
      const taken = await ctx.db
        .query("topics")
        .withIndex("by_slug", (q) => q.eq("slug", base))
        .unique();
      if (taken) {
        skipped += 1;
        continue;
      }

      const country =
        typeof row.country === "string" && /^[A-Za-z]{2}$/.test(row.country)
          ? row.country.toUpperCase()
          : undefined;

      const topicId = await ctx.db.insert("topics", {
        slug: base || `topic-${suffix()}`,
        question,
        categoryId: await categoryId(ctx, row.category),
        status: "active",
        description: row.description?.trim().slice(0, 200) || undefined,
        sourceUrl: row.sourceUrl?.trim() || undefined,
        scopeCountry: country,
        isSensitive: row.sensitive === true,
        isLocked: false,
        isFeatured: false,
        wikipediaTitle: wikiTitle(row.wikipediaTitle),
        createdBy: by,
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

      if (row.sourceUrl) {
        await ctx.db.insert("topicSources", {
          topicId,
          url: row.sourceUrl,
          title: row.sourceTitle?.trim() || question,
        });
      }

      await ctx.db.patch("topics", topicId, {
        tagSlugs: (row.tags ?? []).slice(0, 4).map((t) => slugify(t)).filter(Boolean),
      });
      for (const raw of (row.tags ?? []).slice(0, 4)) {
        const slug = raw.trim().toLowerCase().replace(/[^a-z0-9-]/g, "");
        if (!slug) continue;
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

      await ctx.db.insert("auditLog", {
        actorId: by,
        action: "topic.imported",
        targetType: "topics",
        targetId: topicId,
        metadata: { category: row.category, country: country ?? null },
      });
      added += 1;
    }

    return { added, skipped, rejected };
  }
}

export const batch = internalMutation({
  args: { topics: v.array(incoming) },
  returns: v.object({
    added: v.number(),
    skipped: v.number(),
    rejected: v.array(v.object({ q: v.string(), why: v.string() })),
  }),
  handler: async (ctx, args) => await ingest(ctx, args.topics),
});
