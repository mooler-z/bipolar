import { OPENAI, keys } from "../config";

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
  | "verdict_ranking"
  | "nation_profile"
  | "pair_agreement"
  | "subject_leans"
  | "world_map"
  | "extremes";

export type Plan = {
  lens: Lens;
  /** A country code or a subject slug, depending on the lens. */
  subject: string | null;
  /** The second country, for a head-to-head. */
  other: string | null;
  /** Which end of the ranking the question asked for. */
  direction: "love" | "hate";
  title: string;
  note: string;
};

const PROMPT = `You route questions about a live voting leaderboard to one of six
views. The product is bipolar: people vote LOVE or HATE on polarizing topics,
and topics are often *about* a particular country.

Pick the ONE view that best answers the question:

- verdict_ranking — which countries love or hate questions about a given
  country. Use for "who hates China", "who likes America most". Set subject to
  that country's ISO 3166-1 alpha-2 code, and direction to love or hate.
- nation_profile — one country's own temperament, its friends and enemies.
  Use for "what is Brazil like", "tell me about Japan". subject = its code.
- pair_agreement — two countries against each other. Use for "India vs
  Pakistan". subject and other = the two codes.
- subject_leans — how the world feels about subjects (politics, food, sport).
  Use for "what does the world hate most", "which topics are divisive".
  subject may be a country code to narrow it to that country, or null.
- world_map — the whole world coloured. Use for "show me the map", or any
  question best answered by geography. subject may be a country code to colour
  by feelings *about* that country, or null for each country's own mood.
- extremes — the superlatives: most loving, most hating, most divided, biggest
  feud. Use for "what is the most interesting thing here", "surprise me".

Rules:
- Countries are always ISO 3166-1 alpha-2, uppercase. China is CN, America is
  US, Britain is GB, UAE is AE. If a country is named that is not in the data
  you are shown, still return its code.
- title: at most 6 words, naming what is being shown. No punctuation at the end.
- note: ONE sentence of at most 20 words saying what to look for. Never state a
  figure — you do not have the numbers and must not guess at them.
- If the question is not about this data at all, use extremes and say so in the
  note.
- British spelling. No emoji.`;

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
          { role: "system", content: PROMPT },
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

/** Trust nothing the model said about shape. A code is two letters or it is
    not a code, and a title that runs on is a title that breaks the layout. */
function clean(raw: Record<string, unknown>): Plan | null {
  const lenses: Lens[] = [
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
  const text = (v: unknown, max: number, fallback: string): string => {
    const s = typeof v === "string" ? v.trim() : "";
    return s.length > 0 && s.length <= max ? s : fallback;
  };

  return {
    lens,
    // A subject is a country everywhere except the subject board, where it may
    // also be a category slug.
    subject: lens === "subject_leans" ? (code(raw.subject) ?? slug(raw.subject)) : code(raw.subject),
    other: code(raw.other),
    direction: raw.direction === "love" ? "love" : "hate",
    title: text(raw.title, 60, "What the numbers say"),
    note: text(raw.note, 180, ""),
  };
}
