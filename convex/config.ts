/**
 * THE ONE FILE TO EDIT.
 *
 * Every tunable in bi-polar lives here: prices, pack catalogue, model names,
 * third-party endpoints, ingestion prompts and cadence. Nothing else in the
 * backend hard-codes a number or a URL, so changing how the product behaves is
 * a change to this file and nothing else.
 *
 * Secrets are NOT here. They live in the Convex deployment's environment and
 * are read through the accessors at the bottom, which return `undefined` when
 * a key is unset so every integration degrades to "skipped" rather than
 * "crashed". `npx convex env set KEY value` is the only place a secret exists.
 *
 * Rule 3: money is integer cents, always, and the client never sends a price.
 */

/* ── Money ──────────────────────────────────────────────────────────────── */

/** One spark. The unit of a paid vote and the price of a peek. 50¢. */
export const SPARK_CENTS = 50;

/** Paying to see a topic's two-layer aggregate without voting on it. */
export const PEEK_CENTS = SPARK_CENTS;

/**
 * The pack catalogue. Server-side and authoritative: a checkout request names
 * a pack by `id` and never carries a price. Quills are a count, not money.
 */
export const PACKS = [
  { id: "starter", label: "Starter", priceCents: 500, sparks: 10, quills: 2 },
  { id: "regular", label: "Regular", priceCents: 1000, sparks: 22, quills: 5 },
  { id: "heavy", label: "Heavy", priceCents: 2500, sparks: 60, quills: 15 },
  { id: "quills", label: "Quill pack", priceCents: 300, sparks: 0, quills: 10 },
] as const;

export type PackId = (typeof PACKS)[number]["id"];

export function packById(id: string) {
  return PACKS.find((p) => p.id === id);
}

/**
 * Credit handed to a brand-new account so a first-time visitor can feel the
 * paid layer once without reaching for a card. Set to 0 to turn it off.
 */
export const SIGNUP_GRANT_CENTS = 100;
export const SIGNUP_GRANT_QUILLS = 3;

/* ── OpenAI ─────────────────────────────────────────────────────────────── */

export const OPENAI = {
  endpoint: "https://api.openai.com/v1/chat/completions",
  /** Overridable per deployment without a code change. */
  model: () => process.env.OPENAI_MODEL ?? "gpt-5-mini",
  timeoutMs: 30_000,
} as const;

/* ── Firecrawl ──────────────────────────────────────────────────────────── */

export const FIRECRAWL = {
  search: "https://api.firecrawl.dev/v2/search",
  scrape: "https://api.firecrawl.dev/v2/scrape",
  timeoutMs: 20_000,
  /** Results asked for per query. Kept small; most are discarded. */
  resultsPerQuery: 8,
} as const;

/* ── AgentMail ──────────────────────────────────────────────────────────── */

export const AGENTMAIL = {
  base: "https://api.agentmail.to/v0/inboxes",
  timeoutMs: 8_000,
} as const;

/* ── Topic discovery ────────────────────────────────────────────────────── */

/**
 * What Firecrawl is asked to find. One query is used per run, rotating by the
 * run's index, so a day's runs sweep different ground instead of re-reading
 * the same front page. Add a line to widen the net.
 */
export const DISCOVERY_QUERIES = [
  "most debated news story this week",
  "internet argument dividing people right now",
  "controversial food opinion trending",
  "celebrity people either love or hate",
  "polarizing technology debate this month",
  "sports take fans are split on",
  "divisive policy people are arguing about",
  "trending pop culture opinion split",
  "breaking world news this week controversy",
  "political scandal people are arguing about now",
  "court case dividing public opinion",
  "middle east conflict news public reaction",
  "government decision people are angry about",
  "billionaire in the news this week reaction",
  "music artist controversy this week",
  "film or television backlash this week",
  "public health policy argument this week",
  "climate decision people disagree on",
  "immigration policy debate in the news",
  "artificial intelligence controversy this week",
] as const;

/** Topics minted per discovery run, at most. Keeps a bad run cheap. */
export const TOPICS_PER_RUN = 3;

/**
 * The model's own score, 0–100, for how genuinely two-sided a subject is.
 * Below this it is dropped rather than published — a question everyone agrees
 * on is dead weight in a feed built on disagreement.
 */
export const MIN_POLARIZING_SCORE = 55;

/**
 * Category slugs a topic may be filed under.
 *
 * Fifteen, because seven collapsed a war, an election and a tariff into
 * "politics" — and a feed that cannot tell those apart cannot learn that
 * somebody reads one and skips the others, which is the whole basis of the
 * affinity term in the ranker.
 */
export const CATEGORIES = [
  { slug: "politics", name: "Politics" },
  { slug: "world", name: "World" },
  { slug: "conflict", name: "Conflict" },
  { slug: "business", name: "Business" },
  { slug: "money", name: "Money" },
  { slug: "tech", name: "Technology" },
  { slug: "ai", name: "AI" },
  { slug: "science", name: "Science" },
  { slug: "health", name: "Health" },
  { slug: "climate", name: "Climate" },
  { slug: "culture", name: "Culture" },
  { slug: "entertainment", name: "Entertainment" },
  { slug: "sport", name: "Sport" },
  { slug: "food", name: "Food" },
  { slug: "life", name: "Life" },
  { slug: "history", name: "History" },
  { slug: "religion", name: "Religion" },
  { slug: "education", name: "Education" },
  { slug: "work", name: "Work" },
  { slug: "law", name: "Law & crime" },
  { slug: "internet", name: "Internet" },
  { slug: "music", name: "Music" },
  { slug: "gaming", name: "Gaming" },
  { slug: "travel", name: "Travel" },
] as const;

export type CategorySlug = (typeof CATEGORIES)[number]["slug"];

/**
 * What the model is told it is for. The rules are the product: a question
 * short enough to read on a phone, two-sided enough to split a room, and
 * answerable with nothing but LOVE or HATE.
 */
export const TOPIC_PROMPT =
  "You turn a news item into one polarizing LOVE-or-HATE question for a " +
  "voting app.\n\n" +
  "Rules:\n" +
  "1. The question names a specific subject — a person, a thing, a practice, " +
  "a decision. Under 60 characters. It ends in a question mark.\n" +
  "2. It must be answerable with LOVE or HATE and nothing else. Never a " +
  "question of fact, never one with a correct answer, never 'which'.\n" +
  "3. Take no side. The wording must not hint at the answer you expect.\n" +
  "4. The description is ONE sentence of context, under 140 characters, " +
  "drawn only from the material shown. Invent nothing.\n" +
  "5. polarizing is 0-100: how evenly a room would actually split. A subject " +
  "almost everyone agrees on scores under 30 however loud it is.\n" +
  "6. sensitive is true for violence, death, active conflict or a private " +
  "individual's tragedy — subjects a vote button trivialises.";

/* ── Notifications ──────────────────────────────────────────────────────── */

export const DIGEST = {
  /** Topics named in the daily mail. */
  topics: 3,
  /** Recipients per run. A ceiling, so one cron cannot mail the world. */
  maxRecipients: 200,
} as const;

/* ── Cadence ────────────────────────────────────────────────────────────── */

/** Every schedule in the product, in one table. Hours, UTC. */
export const CADENCE = {
  /** How often Firecrawl goes looking for something to argue about. */
  discoverHours: 6,
  /** The daily mail, at this UTC hour. */
  digestHourUtc: 14,
} as const;

/* ── Limits ─────────────────────────────────────────────────────────────── */

export const LIMITS = {
  /**
   * Packs an emptied account may take back in a day.
   *
   * A pack returns when the balance it carries has run dry, so credit is a
   * budget rather than a one-time gift. The daily ceiling is what keeps it a
   * budget: without it the catalogue is an unlimited wallet and a paid vote
   * stops meaning anything, which is the only thing the paid layer is for.
   */
  reclaimsPerDay: 3,
  /** Votes one account may cast in a minute, across all topics. */
  votesPerMinute: 30,
  /** Comment posts per hour. A quill is spent either way; this stops floods. */
  commentsPerHour: 20,
  /** Country changes per calendar month, counted from `countryChanges`. */
  countryChangesPerMonth: 2,
} as const;

/* ── Secrets, read through accessors ────────────────────────────────────── */

/**
 * Each returns `undefined` when unset. Callers are expected to check and skip:
 * a missing key must make one feature quiet, never take the app down.
 */
export const keys = {
  openai: () => process.env.OPENAI_API_KEY,
  firecrawl: () => process.env.FIRECRAWL_API_KEY,
  agentmail: () => process.env.AGENTMAIL_API_KEY,
  agentmailInbox: () => process.env.AGENTMAIL_INBOX,
  stripe: () => process.env.STRIPE_SECRET_KEY,
  stripeWebhook: () => process.env.STRIPE_WEBHOOK_SECRET,
};

/** Where an emailed or pasted link must land: the public address, not the dev one. */
export function publicSite(): string {
  return process.env.PUBLIC_SITE_URL ?? process.env.SITE_URL ?? "";
}

/**
 * Wikipedia, for topic pictures.
 *
 * Keyless and rate-limited by etiquette rather than by contract, which is why
 * the user agent is descriptive: an anonymous fetcher gets throttled, and a
 * named one that behaves does not.
 */
export const WIKI = {
  api: "https://en.wikipedia.org/w/api.php",
  userAgent: "bi-polar/1.0 (hackathon build; topic enrichment)",
  timeoutMs: 10_000,
  /** Wikipedia renders the thumbnail server-side at whatever width we ask. */
  thumbWidth: 640,
  /** Topics resolved per invocation. One request covers fifty of them. */
  batch: 100,
} as const;

/** Comma-separated addresses that hold the admin role on sign-in. */
export function adminEmails(): string[] {
  return (process.env.ADMIN_EMAILS ?? "")
    .split(",")
    .map((e) => e.trim().toLowerCase())
    .filter(Boolean);
}
