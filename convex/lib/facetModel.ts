import { OPENAI, keys } from "../config";
import {
  AUDIENCES, AXES, GENDERS, KINDS, LEANS, PRICE_BANDS, REGIONS, ROLES, SCALES,
  type Facets,
} from "./facets";

/**
 * Asking the model what a question is about.
 *
 * The hand-written batches cover two hundred and ten topics. The other six
 * hundred came off the live web — "Cream in carbonara?", "Syria's fuel price
 * protests?", "Open-plan offices?" — and nothing about them says whether they
 * are an event, an idea or a thing, let alone which decade they belong to.
 * Writing that by hand does not scale past one afternoon, and deriving it from
 * the words is a heuristic that will be wrong in exactly the interesting cases.
 *
 * So the model reads the question and names the attributes, and **every answer
 * is checked against the closed vocabularies before it is stored.** That is
 * the same arrangement as the router: the model chooses from a list it is
 * shown, the server decides whether the choice is on the list, and a value it
 * invents is dropped rather than written. The worst a bad answer can be is a
 * missing facet.
 *
 * Nothing here can emit a percentage or a vote. Facets describe the subject of
 * a question, never what anybody said about it.
 */

export type Suggested = { slug: string; facets: Facets };

const PROMPT = `You label questions from a voting product with what they are ABOUT.

For each question return a label object. Use only the values listed. Leave a
field out when you do not know it or it does not apply — an absent field is
correct and a guessed one is not.

kind: person product event idea place org media
  person — a named human being. product — a thing people buy. event — a thing
  that happened. idea — a policy, a practice, a belief, a way of doing things.
  place — a country, city or region as the subject. org — a company, party,
  team or institution. media — a film, show, book, album or game.
region: africa asia europe middle-east north-america south-america oceania global
  Where the subject belongs. Use global when it belongs everywhere.
nationality: ISO 3166-1 alpha-2, uppercase, only when the subject is clearly of
  one country.
year: the year the subject was born, launched or happened. Omit unless you are
  confident.
gender: female male nonbinary — only for kind=person, as publicly stated.
bornYear: only for kind=person.
role: head-of-state politician official founder executive investor economist
  athlete musician actor author journalist commentator academic activist royal
  religious criminal — only for kind=person.
lean: left centre right none — only for kind=person, and only where their
  politics is public. Use none for people with no public political position.
priceBand: free budget mid premium luxury — only for kind=product, relative to
  its own shelf rather than in money.
form: one or two words for what a product physically is: phone, car, console,
  shoe, appliance.
brand: the name on a product, where one name is on it.
platform: the ecosystem a product belongs to, where belonging is the point.
axis: money power speech war identity environment technology health faith taste
  safety privacy — what the argument is actually about.
scale: global regional national niche — how far the argument reaches.
audience: everyone enthusiast expert — who is in the room for it.

British spelling. Never explain, never add fields, never invent a value.`;

const TOOL = {
  type: "function" as const,
  function: {
    name: "label_questions",
    description: "Label each question with what it is about.",
    parameters: {
      type: "object",
      properties: {
        labels: {
          type: "array",
          items: {
            type: "object",
            properties: {
              slug: { type: "string" },
              kind: { type: "string" },
              region: { type: "string" },
              nationality: { type: "string" },
              year: { type: "number" },
              gender: { type: "string" },
              bornYear: { type: "number" },
              role: { type: "string" },
              lean: { type: "string" },
              priceBand: { type: "string" },
              form: { type: "string" },
              brand: { type: "string" },
              platform: { type: "string" },
              axis: { type: "string" },
              scale: { type: "string" },
              audience: { type: "string" },
            },
            required: ["slug"],
          },
        },
      },
      required: ["labels"],
    },
  },
};

/** On the list, or not stored. */
const pick = <T extends readonly string[]>(list: T, raw: unknown): T[number] | undefined => {
  const s = typeof raw === "string" ? raw.trim().toLowerCase() : "";
  return (list as readonly string[]).includes(s) ? (s as T[number]) : undefined;
};

const year = (raw: unknown): number | undefined => {
  const n = typeof raw === "number" ? Math.round(raw) : NaN;
  return n >= 1500 && n <= 2100 ? n : undefined;
};

const short = (raw: unknown, max: number): string | undefined => {
  const s = typeof raw === "string" ? raw.trim() : "";
  return s.length > 0 && s.length <= max ? s : undefined;
};

const code = (raw: unknown): string | undefined => {
  const s = typeof raw === "string" ? raw.trim().toUpperCase() : "";
  return /^[A-Z]{2}$/.test(s) ? s : undefined;
};

/** Everything the model said, with everything it invented removed. */
export function clean(raw: Record<string, unknown>): Suggested | null {
  const slug = short(raw.slug, 120);
  if (!slug) return null;
  const kind = pick(KINDS, raw.kind);
  const person = kind === "person";
  const product = kind === "product";

  const facets: Facets = {
    kind,
    region: pick(REGIONS, raw.region),
    nationality: code(raw.nationality),
    year: year(raw.year),
    gender: person ? pick(GENDERS, raw.gender) : undefined,
    bornYear: person ? year(raw.bornYear) : undefined,
    role: person ? pick(ROLES, raw.role) : undefined,
    lean: person ? pick(LEANS, raw.lean) : undefined,
    priceBand: product ? pick(PRICE_BANDS, raw.priceBand) : undefined,
    form: product ? short(raw.form, 24)?.toLowerCase() : undefined,
    brand: product ? short(raw.brand, 40) : undefined,
    platform: product ? short(raw.platform, 24)?.toLowerCase() : undefined,
    axis: pick(AXES, raw.axis),
    scale: pick(SCALES, raw.scale),
    audience: pick(AUDIENCES, raw.audience),
  };
  return { slug, facets };
}

/** One batch of questions, labelled. Empty when there is no key or no answer. */
export async function label(
  rows: { slug: string; question: string; description: string; category: string }[],
): Promise<Suggested[]> {
  const key = keys.openai();
  if (!key || rows.length === 0) return [];

  const user = rows
    .map((r) => `${r.slug} | ${r.category} | ${r.question} | ${r.description}`.slice(0, 400))
    .join("\n");

  try {
    const res = await fetch(OPENAI.endpoint, {
      method: "POST",
      headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        model: OPENAI.model(),
        messages: [
          { role: "system", content: PROMPT },
          { role: "user", content: user.slice(0, 12_000) },
        ],
        tools: [TOOL],
        tool_choice: { type: "function", function: { name: "label_questions" } },
      }),
      signal: AbortSignal.timeout(OPENAI.timeoutMs * 3),
    });
    if (!res.ok) return [];
    const body = (await res.json()) as {
      choices?: { message?: { tool_calls?: { function?: { arguments?: string } }[] } }[];
    };
    const text = body.choices?.[0]?.message?.tool_calls?.[0]?.function?.arguments;
    if (!text) return [];
    const parsed = JSON.parse(text) as { labels?: Record<string, unknown>[] };
    return (parsed.labels ?? [])
      .map((row) => clean(row))
      .filter((row): row is Suggested => row !== null);
  } catch {
    return [];
  }
}
