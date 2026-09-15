/**
 * A world with opinions, for a database that has almost none.
 *
 * The world page is only interesting once enough countries have argued, and a
 * fresh deployment has two. This is the demo population: twenty countries
 * chosen in pairs that actually disagree, and a rule for how each one votes,
 * so the boards show the shape they are built to show instead of one row.
 *
 * **It is fabricated, and it says so.** Every account it creates is stamped
 * `seed:` and carries the flag in its name, so a seeded room can never be
 * mistaken for a real one and can be taken back out by the id it was given.
 *
 * The opinion rule is deterministic — the same person and the same question
 * always produce the same vote — so running the seed twice does not reshuffle
 * the world, and a board can be reasoned about rather than merely looked at.
 */

export type Seed = {
  code: string;
  name: string;
  /**
   * Who this country tends to think like about everything else.
   *
   * Most questions are not about any country at all, and without this those
   * votes are independent noise — which makes every pair land in the same
   * middling band and leaves the agreement board with no ends on it. A bloc
   * is what gives "same mind" something to be.
   */
  bloc: string;
  /** Countries this one tends to side with on questions about them. */
  allies: string[];
  /** Countries it does not. */
  rivals: string[];
  /**
   * How agreeable it is about everything else, 0–100. The room as a whole is
   * a hard crowd — this is a product about hating things — so these sit low.
   */
  mood: number;
};

/**
 * Twenty, in ten pairs that have something to disagree about.
 *
 * Picked so the rivalry board has something real in it on the first day: each
 * pair is a genuine fault line, and the alliances are the ones that make those
 * lines interesting rather than symmetrical.
 */
export const WORLD: Seed[] = [
  { code: "IL", name: "Israel", bloc: "west", allies: ["US", "IN"], rivals: ["PS", "IR", "TR"], mood: 46 },
  { code: "PS", name: "Palestine", bloc: "east", allies: ["IR", "TR", "EG"], rivals: ["IL", "US"], mood: 32 },
  { code: "US", name: "United States", bloc: "west", allies: ["IL", "GB", "KR", "TW"], rivals: ["IR", "RU", "KP"], mood: 44 },
  { code: "IR", name: "Iran", bloc: "east", allies: ["PS", "RU", "CN"], rivals: ["US", "IL"], mood: 30 },
  { code: "IN", name: "India", bloc: "west", allies: ["IL", "US"], rivals: ["PK", "CN"], mood: 48 },
  { code: "PK", name: "Pakistan", bloc: "east", allies: ["CN", "TR"], rivals: ["IN", "IL"], mood: 36 },
  { code: "UA", name: "Ukraine", bloc: "west", allies: ["GB", "US", "GR"], rivals: ["RU", "KP"], mood: 40 },
  { code: "RU", name: "Russia", bloc: "east", allies: ["IR", "CN", "KP"], rivals: ["UA", "US", "GB"], mood: 28 },
  { code: "KR", name: "South Korea", bloc: "west", allies: ["US", "TW"], rivals: ["KP"], mood: 52 },
  { code: "KP", name: "North Korea", bloc: "east", allies: ["RU", "CN"], rivals: ["KR", "US"], mood: 22 },
  { code: "CN", name: "China", bloc: "east", allies: ["RU", "PK", "KP"], rivals: ["TW", "US", "IN"], mood: 38 },
  { code: "TW", name: "Taiwan", bloc: "west", allies: ["US", "KR"], rivals: ["CN"], mood: 50 },
  { code: "GR", name: "Greece", bloc: "west", allies: ["FR", "UA"], rivals: ["TR"], mood: 45 },
  { code: "TR", name: "Turkey", bloc: "east", allies: ["PS", "PK"], rivals: ["GR", "IL"], mood: 34 },
  { code: "ET", name: "Ethiopia", bloc: "south", allies: ["CN", "BR"], rivals: ["EG"], mood: 42 },
  { code: "EG", name: "Egypt", bloc: "south", allies: ["PS", "TR"], rivals: ["ET", "IL"], mood: 35 },
  { code: "GB", name: "United Kingdom", bloc: "west", allies: ["US", "UA"], rivals: ["RU", "AR"], mood: 43 },
  { code: "FR", name: "France", bloc: "west", allies: ["GR", "GB"], rivals: ["GB"], mood: 41 },
  { code: "BR", name: "Brazil", bloc: "south", allies: ["ET", "FR"], rivals: ["AR"], mood: 55 },
  { code: "AR", name: "Argentina", bloc: "south", allies: ["BR"], rivals: ["GB", "BR"], mood: 49 },
];

/**
 * A stable number in 0–99 for a person and a question.
 *
 * A hash rather than `Math.random`, so the seed is reproducible: the same
 * deployment seeded twice has the same opinions, and a board that looked wrong
 * can be looked at again.
 */
export function roll(who: string, what: string): number {
  let h = 2166136261;
  for (const ch of `${who}:${what}`) {
    h ^= ch.charCodeAt(0);
    h = Math.imul(h, 16777619);
  }
  return Math.abs(h) % 100;
}

/**
 * How this country votes on this question.
 *
 * A question about a rival is one it came to hate; a question about an ally,
 * or about itself, one it came to defend. Everything else falls to mood, which
 * is where most of the volume is — so the boards are driven by the fault lines
 * rather than drowned by them.
 *
 * `swing` keeps it from being a lookup table: even a rival gets the occasional
 * nod, which is what stops every pair scoring exactly 0% agreement and looking
 * generated, because it is.
 */
export function votes(
  person: Seed,
  topic: { id: string; about?: string },
  swing = 16,
): "love" | "hate" {
  const about = topic.about;

  /* A question about somewhere this country has a stake in is decided by that
     stake: it is the fault line, and two countries on opposite sides of one
     should land on opposite sides of the question.
     
     **Only where there is a stake.** Deciding every scoped question this way
     was the mistake in the first version: most questions here are about
     somewhere, so nearly every vote took this branch, and for a country with
     no relationship to the place it is an independent coin. Every pair came
     out near fifty and the agreement board was flat between 37 and 46 — a
     country with no interest in a question about Japan does not flip a coin,
     it votes the way its side votes. */
  if (about) {
    const stake =
      about === person.code
        ? 84
        : person.allies.includes(about)
          ? 74
          : person.rivals.includes(about)
            ? 12
            : null;
    if (stake !== null) {
      const r = roll(person.code, topic.id);
      // The roll is the noise and the stake is the centre: a country with an 84
      // still hates one in six questions about itself, which is about right.
      return r < stake + ((r % swing) - swing / 2) ? "love" : "hate";
    }
  }

  /* Everything else — no stake, or about nowhere — follows the **bloc's line**.
     The first attempt merely nudged each country's own roll toward its bloc,
     which changed nothing: two countries rolling separately are independent
     however you tilt them, and every pair came out at the same middling
     agreement with no ends on the board. So the bloc decides, and each country
     breaks ranks on its own — which is what a bloc actually is.

     A sour country breaks ranks more often on a line it is asked to love, so
     mood still shows through without deciding anything by itself. */
  const line: "love" | "hate" = roll(person.bloc, topic.id) < 50 ? "love" : "hate";
  const dissent = ((line === "love" ? 100 - person.mood : person.mood) * swing) / 40;
  return roll(person.code, topic.id) < dissent
    ? line === "love"
      ? "hate"
      : "love"
    : line;
}
