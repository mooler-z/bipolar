import { CATEGORIES, OPENAI, keys } from "../config";
import { FACET_NAMES } from "./facets";
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
  | "facet_split"
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
            "facet_split",
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
export async function plan(question: string, known: string[]): Promise<Plan | null> {
  const chosen = await route(
    `Countries with votes: ${known.join(", ") || "none yet"}\n\nQuestion: ${question}`,
  );
  return chosen ? steer(chosen, question) : null;
}

/** Words that mean a human being is the subject. */
const HUMAN =
  /\b(who|whom|person|people|persons|man|men|woman|women|celebrity|celebrities|figure|figures|politician|politicians|leader|leaders|human)\b/i;
/** Words that mean the question wants a winner rather than a description. */
const SUPERLATIVE = /\b(most|least|worst|best|top|biggest|greatest)\b/i;

/**
 * The countries people name in a sentence, and the codes they stand for.
 *
 * Only the ones that actually turn up after "in" in a superlative — this is a
 * net under a model that already knows every code, not a gazetteer. A name
 * that is not here leaves the plan alone.
 */
const NAMED: Record<string, string> = {
  america: "US", american: "US", americans: "US", usa: "US", us: "US",
  britain: "GB", british: "GB", uk: "GB", england: "GB", english: "GB",
  france: "FR", french: "FR", germany: "DE", german: "DE",
  italy: "IT", italian: "IT", spain: "ES", spanish: "ES",
  russia: "RU", russian: "RU", china: "CN", chinese: "CN",
  india: "IN", indian: "IN", japan: "JP", japanese: "JP",
  korea: "KR", korean: "KR", israel: "IL", israeli: "IL",
  palestine: "PS", palestinian: "PS", turkey: "TR", turkish: "TR",
  brazil: "BR", brazilian: "BR", argentina: "AR", argentine: "AR",
  ethiopia: "ET", ethiopian: "ET", canada: "CA", canadian: "CA",
  australia: "AU", australian: "AU", pakistan: "PK", pakistani: "PK",
  iran: "IR", iranian: "IR", ukraine: "UA", ukrainian: "UA",
  greece: "GR", greek: "GR", egypt: "EG", egyptian: "EG",
  taiwan: "TW", nigeria: "NG", mexico: "MX", sweden: "SE",
};

/** The country a question names after "in" or "from", if it names one. */
function namedCountry(question: string): string | null {
  const words = question.toLowerCase().match(/[a-z]+/g) ?? [];
  for (let i = 0; i < words.length; i += 1) {
    if (words[i] !== "in" && words[i] !== "from") continue;
    // "in the us" and "in america" both land on the word after the article.
    const next = words[i + 1] === "the" ? words[i + 2] : words[i + 1];
    const code = next ? NAMED[next] : undefined;
    if (code) return code;
  }
  return null;
}

/**
 * Two corrections the words can make and the model keeps getting wrong.
 *
 * Asked "who is the most loved person in the US" it answers correctly about
 * half the time and otherwise either drops the word "person" — which ranks the
 * whole catalogue and crowns a pop song — or reaches for the country profile,
 * which describes how America votes and names nobody. Both are decidable from
 * the question itself, without a model and without a guess, so they are
 * decided here rather than asked for more politely in the prompt.
 *
 * Narrow on purpose. It only ever *adds* the kind the question already said
 * out loud, and only ever turns a profile into a ranking when the question
 * asked for a superlative about a person. Everything else the model chose is
 * left exactly as it chose it.
 */
export function steer(chosen: Plan, question: string): Plan {
  const human = HUMAN.test(question);
  const superlative = SUPERLATIVE.test(question);

  // "Who is the most loved person in the US" is a league table narrowed to
  // Americans, not a portrait of how America votes.
  if (chosen.lens === "nation_profile" && human && superlative) {
    return {
      ...chosen,
      lens: "topic_ranking",
      subject: "person",
      other: chosen.subject ? `nationality:${chosen.subject.toLowerCase()}` : chosen.other,
    };
  }

  // The question said "person". The plan forgot to.
  const named =
    chosen.lens === "topic_ranking" && !chosen.other ? namedCountry(question) : null;
  if (chosen.lens === "topic_ranking" && (!chosen.subject || named) && (human || named)) {
    return {
      ...chosen,
      subject: chosen.subject ?? (human ? "person" : null),
      other: chosen.other ?? (named ? `nationality:${named.toLowerCase()}` : null),
    };
  }

  return chosen;
}

/**
 * How long the router is given, and how many goes it gets.
 *
 * Thirty seconds was the shared default and it was the bug the reader saw as
 * "the model did not answer": routing usually takes a few seconds, the
 * instructions are long, and once in a while the call runs past thirty and is
 * aborted. A router that fails outright on its slowest day is a router that
 * fails in front of somebody. Twice the budget, and one more attempt, because
 * the second is nearly always instant.
 */
const ROUTE_TIMEOUT_MS = 60_000;
const ROUTE_TRIES = 2;

async function route(user: string): Promise<Plan | null> {
  for (let attempt = 1; attempt <= ROUTE_TRIES; attempt += 1) {
    const out = await attemptRoute(user, attempt);
    if (out) return out;
  }
  return null;
}

async function attemptRoute(user: string, attempt: number): Promise<Plan | null> {
  const key = keys.openai();
  if (!key) {
    console.error("insight: no OPENAI_API_KEY on this deployment");
    return null;
  }

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
      signal: AbortSignal.timeout(ROUTE_TIMEOUT_MS),
    });
    /* Say why. A silent catch here reaches the reader as "the model did not
       answer", which is true and useless: a missing key, a rate limit and a
       malformed reply all look identical from the panel, and only the logs
       can tell them apart. */
    if (!res.ok) {
      console.error(`insight: model returned ${res.status} ${await res.text().catch(() => "")}`.slice(0, 400));
      return null;
    }

    const body = (await res.json()) as {
      choices?: { message?: { tool_calls?: { function?: { arguments?: string } }[] } }[];
    };
    const raw = body.choices?.[0]?.message?.tool_calls?.[0]?.function?.arguments;
    if (!raw) {
      console.error(`insight: no tool call in reply ${JSON.stringify(body).slice(0, 300)}`);
      return null;
    }
    return clean(JSON.parse(raw) as Record<string, unknown>);
  } catch (e) {
    console.error(
      `insight: attempt ${attempt} ${e instanceof Error ? e.message : String(e)}`,
    );
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
    "facet_split",
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
  /* An attribute and one of its values, as `lean:right`. It narrows the
     league table, so a wrong half is worse than no half: either both survive
     or neither does. */
  const pair = (v: unknown): string | null => {
    const s = typeof v === "string" ? v.trim() : "";
    const [key, ...rest] = s.split(":");
    const value = rest.join(":").trim();
    const found = FACET_NAMES.find((f) => f.toLowerCase() === key.trim().toLowerCase());
    if (!found || value.length < 1 || value.length > 24) return null;
    return `${found}:${value.toLowerCase()}`;
  };
  /* One of the attributes a question carries. Checked against the list for
     the same reason a category is: an invented facet is a board of nothing. */
  const facet = (v: unknown): string | null => {
    const s = typeof v === "string" ? v.trim() : "";
    const found = FACET_NAMES.find((f) => f.toLowerCase() === s.toLowerCase());
    return found ?? null;
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
        : lens === "facet_split"
          ? facet(raw.subject)
        : lens === "topic_ranking"
          ? category(raw.subject)
        : lens === "subject_leans"
          ? (code(raw.subject) ?? slug(raw.subject))
          : code(raw.subject),
    other: lens === "topic_ranking" ? pair(raw.other) : code(raw.other),
    direction: raw.direction === "love" ? "love" : "hate",
    title: text(raw.title, 60, "What the numbers say"),
    note: text(raw.note, 180, ""),
  };
}
