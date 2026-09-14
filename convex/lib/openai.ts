import { CATEGORIES, OPENAI, TOPIC_PROMPT, keys } from "../config";
import { usable } from "./wikipedia";

/**
 * OpenAI: the thing that turns a news story into an argument.
 *
 * Firecrawl brings back a headline and a paragraph. Neither is a question, and
 * neither can be voted on. This module is what stands between "Senate passes
 * spending bill after 14-hour session" and "Government shutdowns as a
 * bargaining tactic?" — a subject, phrased so a stranger can answer it with
 * one tap and mean it.
 *
 * It is also the only judge of whether a story is worth minting at all: the
 * `polarizing` score it returns is what keeps the feed made of disagreements
 * rather than of news.
 *
 * A tool call rather than free text, because the caller needs fields, not
 * prose. Returns null on any failure; the caller drops that finding and moves
 * to the next one.
 */

export type DraftedTopic = {
  question: string;
  description: string;
  category: string;
  tags: string[];
  polarizing: number;
  sensitive: boolean;
  /** ISO 3166-1 alpha-2 of the country the topic is *about*, or null. */
  country: string | null;
  /**
   * The English Wikipedia article to take a picture from, or null.
   *
   * Asked for **here**, in the same call that writes the question, because the
   * model has the story in front of it and knows what the question is actually
   * about. A separate pass later would be a second model call guessing at a
   * sentence, which is what this replaced.
   */
  wikipediaTitle: string | null;
};

const TOOL = {
  type: "function" as const,
  function: {
    name: "record_topic",
    description: "Record the LOVE-or-HATE question this material supports.",
    parameters: {
      type: "object",
      properties: {
        question: {
          type: "string",
          description: "Under 60 characters, ends in a question mark.",
        },
        description: {
          type: "string",
          description: "One sentence of context, under 140 characters.",
        },
        category: {
          type: "string",
          enum: CATEGORIES.map((c) => c.slug),
        },
        tags: {
          type: "array",
          items: { type: "string" },
          description: "Two or three lowercase single words.",
        },
        polarizing: {
          type: "number",
          description: "0-100. How evenly a room would actually split.",
        },
        sensitive: { type: "boolean" },
        wikipediaTitle: {
          type: "string",
          description:
            "Exact English Wikipedia article title for the most " +
            "photographable thing this is about — a person, company, place, " +
            "product or organisation. Prefer the concrete subject over the " +
            "abstract one. Empty string when nothing concrete fits.",
        },
        country: {
          type: "string",
          description:
            "ISO 3166-1 alpha-2 code of the country this is ABOUT, if it is " +
            "clearly about one. Empty string when it is global or unclear. " +
            "Never the country a reader happens to be in.",
        },
      },
      required: [
        "question",
        "description",
        "category",
        "tags",
        "polarizing",
        "sensitive",
      ],
    },
  },
};

/**
 * Draft one topic from one piece of material.
 *
 * `material` is whatever the caller could gather — a title and snippet, or a
 * scraped page. The model is told to invent nothing beyond it.
 */
export async function draftTopic(
  material: string,
): Promise<DraftedTopic | null> {
  const key = keys.openai();
  if (!key) return null;

  try {
    const res = await fetch(OPENAI.endpoint, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${key}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: OPENAI.model(),
        messages: [
          { role: "system", content: TOPIC_PROMPT },
          { role: "user", content: material.slice(0, 6_000) },
        ],
        tools: [TOOL],
        tool_choice: { type: "function", function: { name: "record_topic" } },
      }),
      signal: AbortSignal.timeout(OPENAI.timeoutMs),
    });
    if (!res.ok) return null;

    const body = (await res.json()) as {
      choices?: {
        message?: {
          tool_calls?: { function?: { arguments?: string } }[];
        };
      }[];
    };
    const raw = body.choices?.[0]?.message?.tool_calls?.[0]?.function?.arguments;
    if (!raw) return null;

    return normalise(JSON.parse(raw) as unknown);
  } catch {
    return null;
  }
}

/** Openings that promise an answer LOVE and HATE cannot give. */
const OPEN_ENDED =
  /^(which|what|who|when|where|why|how|top|best|worst|rank|rate|choose|pick)\b/i;

/**
 * The model restating the app's own framing back into the question.
 *
 * "Do you LOVE or HATE New York's Climate Superfund?" is not a topic, it is
 * the interface leaking into the content — the two buttons underneath already
 * ask that, and saying it twice makes the product look like it is explaining
 * itself. The subject alone is the question.
 */
const SELF_REFERENTIAL = /\b(love or hate|do you|would you|should you)\b/i;

/**
 * The model is a stranger sending JSON over the internet, so every field is
 * checked here rather than trusted. A shape that does not survive this is
 * dropped whole — a half-valid topic is worse than no topic.
 */
function normalise(parsed: unknown): DraftedTopic | null {
  const d = parsed as Partial<Record<keyof DraftedTopic, unknown>>;

  const question = typeof d.question === "string" ? d.question.trim() : "";
  if (question.length < 8 || question.length > 100) return null;

  // The prompt already forbids these, and the model still reaches for them
  // roughly one time in ten. A "Top 5 new wave bands?" cannot be answered with
  // LOVE or HATE, so it is not a topic however polarizing the subject is — and
  // one on the feed teaches everybody that the buttons sometimes mean nothing.
  if (OPEN_ENDED.test(question)) return null;
  if (SELF_REFERENTIAL.test(question)) return null;

  const category = CATEGORIES.some((c) => c.slug === d.category)
    ? (d.category as string)
    : "culture";

  const polarizing =
    typeof d.polarizing === "number" && Number.isFinite(d.polarizing)
      ? Math.max(0, Math.min(100, d.polarizing))
      : 0;

  const tags = Array.isArray(d.tags)
    ? d.tags
        .filter((t): t is string => typeof t === "string")
        .map((t) => t.trim().toLowerCase().replace(/[^a-z0-9-]/g, ""))
        .filter(Boolean)
        .slice(0, 3)
    : [];

  const country =
    typeof d.country === "string" && /^[A-Za-z]{2}$/.test(d.country.trim())
      ? d.country.trim().toUpperCase()
      : null;

  /* A title the picture pipeline would refuse anyway is dropped here, so the
     topic is minted without one rather than carrying a name that can never
     resolve and being asked about on every backfill. */
  const article =
    typeof d.wikipediaTitle === "string" && usable(d.wikipediaTitle)
      ? d.wikipediaTitle.trim()
      : null;

  return {
    country,
    wikipediaTitle: article,
    question: question.endsWith("?") ? question : `${question}?`,
    description:
      typeof d.description === "string" ? d.description.trim().slice(0, 200) : "",
    category,
    tags,
    polarizing,
    sensitive: d.sensitive === true,
  };
}

/**
 * The line that makes a result worth pasting into a group chat: one sentence
 * naming what the two layers disagree about. Falls back to "" — a share card
 * without a caption still works.
 */
export async function describeSplit(
  question: string,
  crowd: { love: number; hate: number },
  committed: { love: number; hate: number },
): Promise<string> {
  const key = keys.openai();
  if (!key) return "";

  const material =
    `Question: ${question}\n` +
    `Free votes — LOVE ${crowd.love}, HATE ${crowd.hate}\n` +
    `Paid votes — LOVE ${committed.love}, HATE ${committed.hate}`;

  try {
    const res = await fetch(OPENAI.endpoint, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${key}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: OPENAI.model(),
        messages: [
          {
            role: "system",
            content:
              "One sentence, under 120 characters, contrasting the free vote " +
              "with the paid vote. Say only what the numbers show. No " +
              "preamble, no quotation marks.",
          },
          { role: "user", content: material },
        ],
      }),
      signal: AbortSignal.timeout(OPENAI.timeoutMs),
    });
    if (!res.ok) return "";

    const body = (await res.json()) as {
      choices?: { message?: { content?: string } }[];
    };
    return (body.choices?.[0]?.message?.content ?? "").trim().slice(0, 160);
  } catch {
    return "";
  }
}
