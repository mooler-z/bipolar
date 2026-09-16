import { CATEGORIES, OPENAI, keys } from "../config";
import { ROUTER_PROMPT } from "./insightPrompt";

/**
 * Turning a typed question into a view of the boards.
 *
 * **The model never returns a number.** It is a router: it reads the question,
 * picks one of a fixed set of lenses, and names what the lens is about. The
 * server then fills that lens from the real board. A model that emitted
 * figures would eventually emit a wrong one, and a wrong figure on a page of
 * charts is indistinguishable from a right one.
 *
 * So the worst a bad answer can be is *the wrong chart of true numbers*, which
 * a reader can see and correct by asking again. It can never be a convincing
 * chart of numbers nobody voted for.
 */

export type Lens =
  | "topic_world"
  | "topic_ranking"
  | "verdict_ranking"
  | "nation_profile"
  | "pair_agreement"
  | "subject_leans"
  | "world_map"
  | "extremes";

export type Plan = {
  lens: Lens;
  /**
   * What the lens is about: a country code, a category slug, or — for
   * `topic_world` — the name of the thing itself, as the reader would say it.
   */
  subject: string | null;
  /** The second country, for a head-to-head. */
  other: string | null;
  /** Which end of the ranking the question asked for. */
  direction: "love" | "hate";
  title: string;
  note: string;
};

const TOOL = {
  type: "function" as const,
  function: {
    name: "choose_view",
    description: "Pick the view that answers the question.",
    parameters: {
      type: "object",
      properties: {
        lens: {
          type: "string",
          enum: [
            "topic_world",
            "topic_ranking",
            "verdict_ranking",
            "nation_profile",
            "pair_agreement",
            "subject_leans",
            "world_map",
            "extremes",
          ],
        },
        subject: { type: ["string", "null"] },
        other: { type: ["string", "null"] },
        direction: { type: "string", enum: ["love", "hate"] },
        title: { type: "string" },
        note: { type: "string" },
      },
      required: ["lens", "subject", "other", "direction", "title", "note"],
      additionalProperties: false,
    },
  },
};

/** What the board holds, so the model does not name a country nobody voted in. */
export function plan(question: string, known: string[]): Promise<Plan | null> {
  return route(
    `Countries with votes: ${known.join(", ") || "none yet"}\n\nQuestion: ${question}`,
  );
}

async function route(user: string): Promise<Plan | null> {
  const key = keys.openai();
  if (!key) return null;

  try {
    const res = await fetch(OPENAI.endpoint, {
      method: "POST",
      headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        model: OPENAI.model(),
        messages: [
          { role: "system", content: ROUTER_PROMPT },
          { role: "user", content: user.slice(0, 2_000) },
        ],
        tools: [TOOL],
        tool_choice: { type: "function", function: { name: "choose_view" } },
      }),
      signal: AbortSignal.timeout(OPENAI.timeoutMs),
    });
    if (!res.ok) return null;

    const body = (await res.json()) as {
      choices?: { message?: { tool_calls?: { function?: { arguments?: string } }[] } }[];
    };
    const raw = body.choices?.[0]?.message?.tool_calls?.[0]?.function?.arguments;
    if (!raw) return null;
    return clean(JSON.parse(raw) as Record<string, unknown>);
  } catch {
    return null;
  }
}

/**
 * Trust nothing the model said about shape. A code is two letters or it is not
 * a code, and a title that runs on is a title that breaks the layout.
 *
 * Exported for its tests. Everything else about this module needs a network,
 * and the part worth holding still is the part that decides what a plan is
 * allowed to contain.
 */
export function clean(raw: Record<string, unknown>): Plan | null {
  const lenses: Lens[] = [
    "topic_world",
    "topic_ranking",
    "verdict_ranking",
    "nation_profile",
    "pair_agreement",
    "subject_leans",
    "world_map",
    "extremes",
  ];
  const lens = lenses.includes(raw.lens as Lens) ? (raw.lens as Lens) : "extremes";
  const code = (v: unknown): string | null => {
    const s = typeof v === "string" ? v.trim().toUpperCase() : "";
    return /^[A-Z]{2}$/.test(s) ? s : null;
  };
  const slug = (v: unknown): string | null => {
    const s = typeof v === "string" ? v.trim().toLowerCase() : "";
    return /^[a-z][a-z-]{1,24}$/.test(s) ? s : null;
  };
  /* A real category, for the boards that narrow by one. Checked against the
     list rather than against a shape, because `slug()` lowercases and would
     happily turn the country code US into the category "us". */
  const category = (v: unknown): string | null => {
    const s = typeof v === "string" ? v.trim().toLowerCase() : "";
    // `person` and `product` are kinds rather than categories, and they are
    // the two narrowings the league table is asked for most.

    if (s === "person" || s === "people") return "person";
    if (s === "product" || s === "products") return "product";
    return CATEGORIES.some((c) => c.slug === s) ? s : null;
  };
  /* A thing's own name, for the topic board. Wider than a slug and narrower
     than free text: what goes in here becomes a search over the questions, so
     it has to be a name somebody could have typed and not a sentence, a URL
     or an instruction. */
  const name = (v: unknown): string | null => {
    const s = typeof v === "string" ? v.trim().replace(/\s+/g, " ") : "";
    if (s.length < 2 || s.length > 60) return null;
    // A slash is in AC/DC and in every URL ever written, so the slash stays
    // and the two together do not.
    if (s.includes("//")) return null;
    return /^[\p{L}\p{N} .,'’&+/-]+$/u.test(s) ? s : null;
  };
  const text = (v: unknown, max: number, fallback: string): string => {
    const s = typeof v === "string" ? v.trim() : "";
    return s.length > 0 && s.length <= max ? s : fallback;
  };

  return {
    lens,
    // A subject is a country everywhere except the subject board, where it may
    // also be a category slug.
    subject:
      lens === "topic_world"
        ? name(raw.subject)
        : lens === "topic_ranking"
          ? category(raw.subject)
        : lens === "subject_leans"
          ? (code(raw.subject) ?? slug(raw.subject))
          : code(raw.subject),
    other: code(raw.other),
    direction: raw.direction === "love" ? "love" : "hate",
    title: text(raw.title, 60, "What the numbers say"),
    note: text(raw.note, 180, ""),
  };
}
