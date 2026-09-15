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
 * The full hash of a pair of strings.
 *
 * FNV-1a rather than `Math.random`, so everything built on it is
 * reproducible: the same deployment seeded twice has the same opinions, and a
 * board that looked wrong can be looked at again.
 */
export function hash(who: string, what: string): number {
  let h = 2166136261;
  for (const ch of `${who}:${what}`) {
    h ^= ch.charCodeAt(0);
    h = Math.imul(h, 16777619);
  }
  return Math.abs(h);
}

/** A stable number in 0–99, for anything measured as a percentage. */
export function roll(who: string, what: string): number {
  return hash(who, what) % 100;
}

/**
 * A stable index into a list of `n`.
 *
 * Not `roll(...) % n`. `roll` is already capped at a hundred, so using it to
 * index anything longer silently picks only from the first hundred entries —
 * which is exactly what happened: the activity simulator drew its questions
 * from a pool of six hundred and never reached past the newest hundred, all
 * of which the demo accounts had already answered, so every tick produced
 * nothing but comments.
 */
export function pick(who: string, what: string, n: number): number {
  return n <= 0 ? 0 : hash(who, what) % n;
}

/**
 * How this country votes on this question.
 *
 * A question about a rival is one it came to hate; a question about an ally,
 * or about itself, one it came to defend. Everything else falls to mood, which
 * is where most of the volume is — so the boards are driven by the fault lines
 * rather than drowned by them.
 *
 * `pull` is how hard a bloc drags its members together. It keeps the thing
 * from being a lookup table: even a rival gets the occasional nod, which is
 * what stops every pair scoring exactly 0% agreement and looking generated,
 * because it is.
 */
export function votes(
  person: Seed,
  topic: { id: string; about?: string; favour?: number },
  /**
   * Which voter in that country. Several people share a country, so their
   * rolls have to differ — otherwise a country's lean on a question is a coin
   * flip rather than a proportion, and every board reads 0% or 100%.
   */
  voter: string = person.code,
  pull = 1.1,
): "love" | "hate" {
  const about = topic.about;

  /*
   * Reputation sets the centre; the country's stake in the subject moves it.
   *
   * `favour` is roughly how the world sees the subject. The stake is what
   * makes a seeded Netanyahu split Israel from Palestine rather than
   * averaging them into one lukewarm number — a floor and a ceiling, not a
   * nudge, because a sour country nudged upward about its own ally still
   * comes out lukewarm.
   */
  const base = topic.favour ?? person.mood;
  let centre = base;
  if (about) {
    if (about === person.code) centre = Math.min(95, Math.max(base + 30, 84));
    else if (person.allies.includes(about)) centre = Math.min(92, Math.max(base + 20, 72));
    else if (person.rivals.includes(about)) centre = Math.min(Math.max(5, base - 28), 14);
  }

  /*
   * The bloc **shifts the threshold**; it does not decide the vote.
   *
   * Deciding it was the mistake. One shared draw per bloc meant an entire
   * bloc voted identically, so a question's result came down to three coin
   * flips and no amount of reputation could move it — a seeded Messi came out
   * at 15% and Israel came out hating Netanyahu. Shifting the threshold keeps
   * countries that think alike correlated while leaving each voter their own
   * roll, so the average still lands where the reputation says it should.
   */
  const shift = (roll(person.bloc, topic.id) - 50) * pull;
  const threshold = Math.max(3, Math.min(97, centre + shift));
  return roll(voter, topic.id) < threshold ? "love" : "hate";
}
