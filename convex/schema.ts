import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

/**
 * Translated from an earlier schema.
 *
 * Three rules survive the move and shape everything below:
 *
 * - **Money is integer cents.** `walletBalanceCents`, `amountCents`, pack
 *   prices. Never a float, never a decimal string. One spark is 50.
 * - **Times are epoch milliseconds**, because that is what Convex stores and
 *   compares. Postgres `timestamptz` becomes `v.number()`.
 * - **Counters are stored running totals.** Nothing counts rows on read.
 *
 * What did *not* survive is the unique constraint. Postgres enforced the
 * product's central rule — one free and one paid vote per person per topic —
 * with `UNIQUE(user_id, topic_id, vote_type)`. Convex has no unique index, so
 * that guarantee now lives in `votes.cast`, which reads `by_user_topic_type`
 * before it writes. A Convex mutation is a serializable transaction, so the
 * check cannot race; but it is code now, and code needs a test. That test is
 * the first one written, not the last.
 */
export default defineSchema({
  /**
   * Identity, wallet and role. Better Auth owns sessions, email verification
   * and OAuth identities, so the three tables that held them in Postgres are
   * gone rather than ported.
   */
  users: defineTable({
    /** Better Auth's subject, the join back to the auth component. */
    authId: v.string(),
    email: v.string(),
    displayName: v.string(),
    avatarUrl: v.optional(v.string()),
    /** ISO 3166-1 alpha-2, uppercase. Stamped from the edge, never the client. */
    countryCode: v.optional(v.string()),
    /** Integer cents. One spark is 50. */
    walletBalanceCents: v.number(),
    /** Quills are a count, not money: one quill buys one comment. */
    quillBalance: v.number(),
    role: v.union(
      v.literal("user"),
      v.literal("creator"),
      v.literal("moderator"),
      v.literal("admin"),
    ),
    isBanned: v.boolean(),
    /**
     * Whether this user's voting analytics are public. Identity — name and
     * avatar — is public regardless, because it already shows wherever the
     * user appears. Everyone starts private and opts in.
     */
    profilePublic: v.boolean(),
    onboardedAt: v.optional(v.number()),
    /**
     * How many distinct topics this account has backed with a spark. A stored
     * running total, bumped inside the vote transaction — the top-backers board
     * ranks on being a regular, not on outspending everyone on one topic, and
     * it must never be a scan over `votes`.
     */
    topicsBacked: v.number(),
    /**
     * The last pack this account took. Absent means never.
     *
     * Presence used to be the whole rule — one claim per account. It is now
     * one *at a time*: a pack can be taken again once the balance it carries
     * has run dry, so this field says what was taken last rather than that
     * nothing more may be. The rule that replaced it reads the wallet.
     */
    claimedPackId: v.optional(v.string()),
    /** Whether the daily hot-topic mail goes out to this address. */
    digestOptIn: v.boolean(),
    /**
     * Straight to the next question after voting, without the result.
     *
     * For the reader who is here to answer forty of these, not to study one.
     * The vote is still cast, still counted and still retractable — the only
     * thing skipped is the screen. Absent means the result is shown, which is
     * what every account did before this existed.
     */
    skipReveal: v.optional(v.boolean()),
    /** When the digest last went out, so a re-run cannot mail twice. */
    lastDigestAt: v.optional(v.number()),
  })
    .index("by_auth", ["authId"])
    .index("by_email", ["email"])
    .index("by_backed", ["topicsBacked"]),

  /**
   * User-initiated country changes. Append-only: the rows *are* the rate limit
   * (two per calendar month, counted at change time) and the audit trail.
   * Geolocation and onboarding never write here.
   */
  countryChanges: defineTable({
    userId: v.id("users"),
    fromCode: v.optional(v.string()),
    toCode: v.string(),
  }).index("by_user", ["userId"]),

  /** What a user picked at onboarding. The feed boosts these categories. */
  userInterests: defineTable({
    userId: v.id("users"),
    categoryId: v.id("categories"),
  })
    .index("by_user", ["userId"])
    .index("by_user_category", ["userId", "categoryId"]),

  /**
   * How a reader themselves leans, per category — the input to the ranker's
   * provocation term ("you love tech; this room does not"). A running total,
   * because deriving it would mean reading every vote the account ever cast.
   */
  userCategoryStats: defineTable({
    userId: v.id("users"),
    categoryId: v.id("categories"),
    love: v.number(),
    hate: v.number(),
  }).index("by_user", ["userId"]).index("by_user_category", ["userId", "categoryId"]),

  /**
   * The feed ranker's taste vector: one weight in [0,1] per user and category,
   * nudged on each vote or skip. A derived cache, rebuildable from votes —
   * never a source of truth.
   */
  userTaste: defineTable({
    userId: v.id("users"),
    categoryId: v.id("categories"),
    weight: v.number(),
  }).index("by_user_category", ["userId", "categoryId"]),

  categories: defineTable({
    name: v.string(),
    slug: v.string(),
  }).index("by_slug", ["slug"]),

  tags: defineTable({
    slug: v.string(),
    name: v.string(),
  }).index("by_slug", ["slug"]),

  topics: defineTable({
    slug: v.string(),
    question: v.string(),
    /**
     * The subject of the question, canonicalised — see `lib/dedupe.ts`.
     *
     * The slug cannot do this job. Two questions about the same argument get
     * two different slugs the moment one word differs, and `freeSlug` will
     * happily append four characters of entropy and mint the second one. This
     * is what discovery reads before it writes, so the feed does not fill up
     * with one argument phrased six ways on a busy news day.
     *
     * Optional because it arrived after the rows did. `maintenance.reindexQuestions`
     * fills it in for everything already here.
     */
    questionKey: v.optional(v.string()),
    /** Convex file storage. Replaces the MinIO object key. */
    imageId: v.optional(v.id("_storage")),
    /** Fallback hero image when nothing has been uploaded. */
    externalImageUrl: v.optional(v.string()),
    /**
     * The English Wikipedia article this topic is about, when it is about
     * something a photograph illustrates. Named by whoever wrote the topic;
     * resolved to `externalImageUrl` by a separate action, because a mutation
     * cannot fetch. Kept after resolution as the image's provenance.
     */
    wikipediaTitle: v.optional(v.string()),
    /**
     * When the named article was last looked up, image or no image.
     *
     * Without this a lookup that correctly finds nothing — an article with no
     * photograph — is retried on every run, and those topics sit at the head of
     * the queue forever, starving the ones never tried.
     */
    imageCheckedAt: v.optional(v.number()),
    categoryId: v.id("categories"),
    status: v.union(
      v.literal("draft"),
      v.literal("active"),
      v.literal("archived"),
    ),
    /** One line of context under the question. Most topics stand alone. */
    description: v.optional(v.string()),
    sourceUrl: v.optional(v.string()),
    /**
     * The country the topic is *about*. Absent means global. Distinct from the
     * per-country breakdown of who voted.
     */
    scopeCountry: v.optional(v.string()),
    isSensitive: v.boolean(),
    /** Voting closes after this. Absent means open-ended. */
    closesAt: v.optional(v.number()),
    /** A freeze on voting without archiving. Checked on every cast. */
    isLocked: v.boolean(),
    isFeatured: v.boolean(),
    /**
     * What the topic is about, finer than its category, as tag slugs.
     *
     * Denormalised from `topicTags` at write time so the ranker can read a
     * candidate's tags without a join per candidate — a feed that joined
     * tags for two hundred candidates on every load would be two hundred
     * reads to learn what one field can carry.
     */
    tagSlugs: v.optional(v.array(v.string())),
    /**
     * The crawling session that minted this, when a crawler did.
     *
     * What makes the review queue triageable: drafts arrive in waves of
     * fifteen, and a wave is the unit a moderator actually works through.
     * Absent on everything a person wrote or an import seeded.
     */
    ingestRunId: v.optional(v.id("ingestRuns")),
    createdBy: v.id("users"),
  })
    .index("by_slug", ["slug"])
    .index("by_run", ["ingestRunId"])
    .index("by_status", ["status"])
    .index("by_category", ["categoryId"])
    .index("by_question_key", ["questionKey"]),

  /**
   * Every act a reader takes on a topic, one row each, append-only.
   *
   * The recommender is only as good as what it can see, and until this
   * existed it could see votes and skips. Pulling a topic out of the room by
   * hand, writing about it, paying to see it, taking a vote back — each says
   * something a tap does not, and none of it was written down. What the topic
   * was made of is stamped on the row, so the learner and the replay never
   * join back to a topic that may since have changed.
   */
  interactions: defineTable({
    userId: v.id("users"),
    topicId: v.id("topics"),
    kind: v.union(
      v.literal("vote"),
      v.literal("spark"),
      v.literal("skip"),
      v.literal("undo"),
      v.literal("pull"),
      v.literal("share"),
      v.literal("comment"),
      v.literal("reply"),
      v.literal("like"),
      v.literal("unlike"),
      v.literal("peek"),
    ),
    choice: v.optional(v.union(v.literal("love"), v.literal("hate"))),
    categoryId: v.id("categories"),
    tagSlugs: v.array(v.string()),
    scopeCountry: v.optional(v.string()),
  })
    .index("by_user", ["userId"])
    .index("by_user_topic", ["userId", "topicId"]),

  /**
   * What the acts add up to: one weight in [0,1] per reader and key, where a
   * key is a tag, a category or a country. A derived cache, rebuildable from
   * `interactions` — never a source of truth.
   */
  userAffinity: defineTable({
    userId: v.id("users"),
    key: v.string(),
    weight: v.number(),
    /** Acts that have moved it. Confidence, for the console. */
    n: v.number(),
  })
    .index("by_user", ["userId"])
    .index("by_user_key", ["userId", "key"]),

  /**
   * The recommender's own report card: a replay of every reader's real acts
   * against the ranker, scored two ways, so "better" is a number on a screen
   * rather than a claim in a document.
   */
  recommendReports: defineTable({
    readers: v.number(),
    acts: v.number(),
    baseline: v.object({ mrr: v.number(), hitAtK: v.number(), medianRank: v.number() }),
    learned: v.object({ mrr: v.number(), hitAtK: v.number(), medianRank: v.number() }),
    /** Mean score gap, learned ranker, between later-engaged and later-skipped topics. */
    separation: v.number(),
    k: v.number(),
  }),

  topicTags: defineTable({
    topicId: v.id("topics"),
    tagId: v.id("tags"),
  })
    .index("by_topic", ["topicId"])
    .index("by_tag", ["tagId"]),

  /**
   * The two-layer aggregate, as running totals. This is the thing the stats
   * gate protects: a reader who has neither voted nor peeked must not receive
   * these numbers in the payload.
   */
  topicStats: defineTable({
    topicId: v.id("topics"),
    freeLove: v.number(),
    freeHate: v.number(),
    paidLove: v.number(),
    paidHate: v.number(),
    /** Total money staked, in cents. Ranks the hottest-topics board. */
    stakedCents: v.number(),
    /** Skips across all users — a disinterest signal for the ranker. */
    skips: v.number(),
    /**
     * Comments posted, soft-deleted ones included — the row survives a removal
     * and so does the quill it spent. Public on every topic, gated on none: a
     * busy argument is worth advertising, and the count says nothing about
     * which way the argument is going.
     */
    comments: v.number(),
  }).index("by_topic", ["topicId"]),

  /** The same four counters, per country. Always public; never gated. */
  countryTopicStats: defineTable({
    topicId: v.id("topics"),
    countryCode: v.string(),
    freeLove: v.number(),
    freeHate: v.number(),
    paidLove: v.number(),
    paidHate: v.number(),
  })
    .index("by_topic", ["topicId"])
    .index("by_topic_country", ["topicId", "countryCode"]),

  /**
   * One row per user and topic skipped. `count` climbs on repeat — the
   * stronger the disinterest. Skips repeat; votes do not.
   */
  topicSkips: defineTable({
    userId: v.id("users"),
    topicId: v.id("topics"),
    count: v.number(),
  })
    .index("by_user_topic", ["userId", "topicId"])
    .index("by_topic", ["topicId"]),

  votes: defineTable({
    userId: v.id("users"),
    topicId: v.id("topics"),
    voteType: v.union(v.literal("free"), v.literal("paid")),
    choice: v.union(v.literal("love"), v.literal("hate")),
    countryCode: v.string(),
    /**
     * Which surface cast it. Stamped server-side from the entry point, never
     * trusted from the client.
     */
    source: v.union(v.literal("web"), v.literal("telegram")),
  })
    // The core rule, now enforced in code. Read this before every write.
    .index("by_user_topic_type", ["userId", "topicId", "voteType"])
    .index("by_user", ["userId"])
    // Velocity for the ranker: votes on a topic in the last few hours.
    .index("by_topic", ["topicId"]),

  /**
   * Paid to see a topic's aggregate without voting on it. Permanent, and not a
   * vote — the user's vote rows are untouched. Voting later does not refund it.
   */
  topicPeeks: defineTable({
    userId: v.id("users"),
    topicId: v.id("topics"),
    /** What it cost, so the history reads correctly if the price ever moves. */
    amountCents: v.number(),
  })
    .index("by_user_topic", ["userId", "topicId"])
    .index("by_user", ["userId"]),

  /**
   * Flat comments. Posting one spends a quill, decremented in the same
   * mutation. Soft-deleted for moderation so the spend record survives.
   */
  comments: defineTable({
    topicId: v.id("topics"),
    userId: v.id("users"),
    body: v.string(),
    /**
     * The line this answers, when it answers one. One level only: a reply to
     * a reply is filed under the same parent, because a thread that nests
     * without limit is a thread nobody can read on a phone.
     */
    parentId: v.optional(v.id("comments")),
    /**
     * Running total of likes. Denormalised because a thread of fifty lines
     * would otherwise be fifty counting queries, and the count is on screen
     * next to every one of them.
     */
    likes: v.optional(v.number()),
    deletedAt: v.optional(v.number()),
  })
    .index("by_topic", ["topicId"])
    .index("by_parent", ["parentId"])
    .index("by_user", ["userId"]),

  /**
   * Who liked what. One row per person per comment — the row *is* the rule,
   * read before every write, so a second tap takes the like back rather than
   * adding another.
   */
  commentLikes: defineTable({
    userId: v.id("users"),
    commentId: v.id("comments"),
    /** Denormalised so the like can teach the ranker without a second read. */
    topicId: v.id("topics"),
  })
    .index("by_user_comment", ["userId", "commentId"])
    .index("by_comment", ["commentId"]),

  /**
   * What happened while you were not looking.
   *
   * The daily mail reaches people who are somewhere else; this reaches the
   * ones who came back. A row is written in the same mutation as the thing it
   * announces, so a notice cannot exist for something that did not happen —
   * and never for your own act, because being told what you just did is noise.
   *
   * `readAt` is the only field that is ever updated. Everything else is a
   * record of a moment.
   */
  /**
   * A Telegram account attached to a bipolar account.
   *
   * Its own table rather than a column on `users`, because it is a join to
   * somewhere else and because the bot's hot path is the reverse lookup —
   * "who is this Telegram id?" — on every single update. A column would make
   * that a scan of the user table.
   *
   * One each way, enforced by the mutation that writes it: a Telegram account
   * reaches exactly one bipolar account, and a bipolar account is reachable
   * from exactly one Telegram account. Neither is a unique index, because
   * Convex has none — same as the vote rule, and tested the same way.
   */
  telegramAccounts: defineTable({
    userId: v.id("users"),
    /** Telegram's numeric user id, kept as a string — it is an identifier. */
    telegramUserId: v.string(),
    username: v.optional(v.string()),
    /** The private chat this account talks to the bot in. */
    chatId: v.number(),
  })
    .index("by_telegram", ["telegramUserId"])
    .index("by_user", ["userId"]),

  /**
   * A one-time code that attaches the two.
   *
   * The bot mints one, bakes it into a web link, and the signed-in browser
   * redeems it. It is a row rather than an in-memory map because there is no
   * single process here to hold one — and a row is better anyway: it survives
   * a deploy, which an in-memory code does not.
   *
   * Short-lived and single-use. A code is a standing credential for as long as
   * it lives, and it lives in somebody's chat history.
   */
  telegramCodes: defineTable({
    code: v.string(),
    telegramUserId: v.string(),
    username: v.optional(v.string()),
    chatId: v.number(),
    expiresAt: v.number(),
    /** Set the moment it is spent, so a replay finds it already used. */
    usedAt: v.optional(v.number()),
    /**
     * The message that carried the button, so it can be taken down once it
     * has been used. A live CONNECT button in a chat that is already
     * connected is the same dead card the bot deletes everywhere else.
     */
    promptMessageId: v.optional(v.number()),
  })
    .index("by_code", ["code"])
    .index("by_telegram", ["telegramUserId"]),

  notifications: defineTable({
    userId: v.id("users"),
    kind: v.union(
      v.literal("reply"),
      v.literal("like"),
      v.literal("mention"),
      v.literal("hot"),
    ),
    /** Who did it. Absent when nobody did — the daily hot topic. */
    actorId: v.optional(v.id("users")),
    topicId: v.optional(v.id("topics")),
    commentId: v.optional(v.id("comments")),
    /** The line quoted back, so the notice means something without a fetch. */
    excerpt: v.optional(v.string()),
    readAt: v.optional(v.number()),
  })
    .index("by_user", ["userId"])
    .index("by_user_read", ["userId", "readAt"]),

  /** Append-only. Never updated, never deleted. */
  creditTransactions: defineTable({
    userId: v.id("users"),
    type: v.union(
      v.literal("purchase"),
      /** Credit given, not bought — the welcome grant. Never a Stripe row. */
      v.literal("grant"),
      v.literal("spend"),
      v.literal("peek"),
      v.literal("refund"),
    ),
    amountCents: v.number(),
    /** The PaymentIntent this funds — the object a refund would target. */
    stripePaymentIntentId: v.optional(v.string()),
    /**
     * Which pack put this credit here. On the ledger rather than in the audit
     * log because it is a fact about the money, not about an act of authority.
     */
    packId: v.optional(v.string()),
    topicId: v.optional(v.id("topics")),
  })
    .index("by_user", ["userId"])
    // Defence in depth on purchase idempotency: a redelivered webhook cannot
    // double-credit even if the event dedupe below somehow misses.
    .index("by_intent", ["stripePaymentIntentId"]),

  /**
   * Stripe webhook idempotency. Insert the event id first; a second insert of
   * the same `evt_…` is a replay and does nothing.
   */
  stripeEvents: defineTable({
    eventId: v.string(),
  }).index("by_event", ["eventId"]),

  /**
   * Honorary lover/hater tiers: fixed bands on the dominant-side percentage.
   * A user's badge is derived at read time from their love share, never stored.
   */
  badgeTiers: defineTable({
    key: v.string(),
    side: v.union(v.literal("lover"), v.literal("hater")),
    minPct: v.number(),
    maxPct: v.number(),
    label: v.string(),
    imageId: v.optional(v.id("_storage")),
    sort: v.number(),
  }).index("by_key", ["key"]),

  /**
   * Runtime switches — the ones a person flips from the console.
   *
   * Distinct from `config.ts`, which holds what is decided at deploy time. A
   * knob that changes behaviour while the app is running cannot live in a
   * constant, and a constant that can be changed from a screen is not a
   * constant.
   */
  settings: defineTable({
    key: v.string(),
    value: v.any(),
  }).index("by_key", ["key"]),

  /** Append-only. Every privileged write lands one row, in the same mutation. */
  auditLog: defineTable({
    actorId: v.id("users"),
    action: v.string(),
    targetType: v.string(),
    targetId: v.optional(v.string()),
    metadata: v.optional(v.any()),
  })
    .index("by_actor", ["actorId"])
    .index("by_target", ["targetType", "targetId"]),

  /* ── Discovery ─────────────────────────────────────────────────────────
     Firecrawl finds what people are arguing about; OpenAI turns one finding
     into a question. These two tables are what keeps that loop honest: what
     has already been seen, and what each topic was made from. */

  /**
   * Every URL discovery has already considered, whether or not it became a
   * topic. Append-only. The `by_url` index is read before every mint, so the
   * same story cannot become the same question twice.
   */
  ingestSeen: defineTable({
    url: v.string(),
    /** Why it did not become a topic, when it did not. */
    outcome: v.union(
      v.literal("minted"),
      v.literal("duplicate"),
      v.literal("rejected"),
      v.literal("failed"),
    ),
    /** The model's own 0-100 read on how two-sided the subject is. */
    score: v.optional(v.number()),
    topicId: v.optional(v.id("topics")),
  })
    .index("by_url", ["url"])
    .index("by_outcome", ["outcome"]),

  /**
   * The material a topic was written from: what Firecrawl returned, kept so
   * the question can be traced to its source on the page and in the log.
   */
  topicSources: defineTable({
    topicId: v.id("topics"),
    url: v.string(),
    title: v.string(),
    snippet: v.optional(v.string()),
  }).index("by_topic", ["topicId"]),

  /**
   * One run of the discovery pipeline. Rows are the operator's view of a loop
   * that runs unattended: what was asked, what came back, what was minted.
   */
  ingestRuns: defineTable({
    /**
     * The session number: 1, 2, 3, counting up forever.
     *
     * A document id is unique and unsayable. A moderator triaging the drafts
     * one session left behind needs to name it — "everything from 47" — and a
     * timestamp is not a name either when six sessions land in a day. Assigned
     * in the same mutation that opens the run, by reading the highest one so
     * far, which two overlapping runs cannot both do.
     *
     * Optional because it arrived after the first runs did.
     */
    seq: v.optional(v.number()),
    query: v.string(),
    found: v.number(),
    minted: v.number(),
    rejected: v.number(),
    /** Dropped because the feed already carries that argument. */
    duplicate: v.optional(v.number()),
    /** Absent on success; the message on failure. */
    error: v.optional(v.string()),
    /** Absent while the session is still out. */
    finishedAt: v.optional(v.number()),
    /** The admin who pressed the button. Absent when the clock did. */
    startedBy: v.optional(v.id("users")),
  })
    .index("by_finished", ["finishedAt"])
    .index("by_seq", ["seq"]),

  /**
   * What a session did, line by line, as it did it.
   *
   * The run row carries the totals; this carries the story — which search,
   * which page, what the model said, why a story was dropped. Written from
   * inside the session so the console can watch one happen rather than read
   * about it afterwards. Append-only, bounded per run, cheap to drop later.
   */
  ingestEvents: defineTable({
    runId: v.id("ingestRuns"),
    kind: v.union(
      v.literal("search"),
      v.literal("read"),
      v.literal("draft"),
      v.literal("minted"),
      v.literal("duplicate"),
      v.literal("rejected"),
      v.literal("failed"),
      v.literal("picture"),
      v.literal("done"),
      v.literal("error"),
    ),
    text: v.string(),
    topicId: v.optional(v.id("topics")),
  }).index("by_run", ["runId"]),

  /**
   * Every notice AgentMail was asked to carry. The dedupe key is the point: a
   * cron that runs twice, or a retried action, finds the row already there and
   * sends nothing. The row is claimed before the send and marked delivered
   * after it, so a crash mid-send leaves a record rather than a silent gap.
   */
  mailLog: defineTable({
    userId: v.id("users"),
    kind: v.union(
      v.literal("welcome"),
      v.literal("digest"),
      v.literal("packLanded"),
    ),
    /** `kind:userId:bucket` — unique per thing-that-should-send-once. */
    dedupeKey: v.string(),
    to: v.string(),
    subject: v.string(),
    /** False when the send failed; the row still stands as the attempt. */
    delivered: v.boolean(),
  })
    .index("by_dedupe", ["dedupeKey"])
    .index("by_user", ["userId"]),


  /* ── Calling the room ──────────────────────────────────────────────────
     The loop the product turns on. Having answered honestly, you predict
     what everybody else said — and then find out. That turns the result
     from a chart about a topic into a verdict about you. */

  /**
   * One prediction of the crowd, per person per topic.
   *
   * Graded against the crowd **as it stood before this voter joined it**, so
   * nobody is marked against a room they just moved, and the verdict is
   * snapshotted rather than recomputed: later votes change the topic, never
   * your result. A call is as final as the vote it rides on.
   */
  calls: defineTable({
    userId: v.id("users"),
    topicId: v.id("topics"),
    /** Which way the caller thinks the free crowd went. */
    crowdSide: v.union(v.literal("love"), v.literal("hate")),
    /** Which way it had actually gone, at the moment of the call. */
    crowdWasLove: v.boolean(),
    correct: v.boolean(),
    /**
     * The caller's streak and best *before* this call was graded.
     *
     * Optional because rows written before retraction existed do not have it.
     * A streak cannot be derived backwards — a wrong call sets it to zero and
     * the number it was is gone — so retracting one restores from here rather
     * than guessing.
     */
    priorStreak: v.optional(v.number()),
    priorBestStreak: v.optional(v.number()),
    /** How big the room was when graded. Below the floor, nothing counts. */
    sampleSize: v.number(),
  })
    .index("by_user_topic", ["userId", "topicId"])
    .index("by_user", ["userId"]),

  /**
   * A caller's record. Its own table rather than fields on `users` because it
   * churns on every single vote, and a counter that moves that often has no
   * business sharing a document with a profile that almost never does.
   */
  callerStats: defineTable({
    userId: v.id("users"),
    /** Calls made on rooms big enough to grade. */
    made: v.number(),
    right: v.number(),
    streak: v.number(),
    bestStreak: v.number(),
    /** Votes cast on gradeable rooms — the denominator for contrariness. */
    graded: v.number(),
    /** Of those, how often the caller's own opinion matched the room's. */
    withCrowd: v.number(),
  })
    .index("by_user", ["userId"])
    // The leaderboard that is not a spend ranking: read by accuracy.
    .index("by_right", ["right"]),

});
