/**
 * Naming somebody in a line.
 *
 * `@` followed by a display name, matched against **the people already in the
 * thread** rather than parsed out of the text. Two reasons, and both matter.
 *
 * A display name can contain spaces — "Tiên Nguyễn" — so there is no character
 * that reliably ends one. Any parser guesses, and guesses wrong on exactly the
 * names least able to complain about it. Matching against a known list never
 * guesses: it asks whether *this* name appears after an `@`, longest first so
 * "@Sam Cole" is not read as "@Sam".
 *
 * And it means you can only name somebody who is already arguing here. A
 * mention that could reach any account in the database is a notification
 * anybody can send to anybody, which is a spam tool with a friendly icon.
 */

export type Named = { id: string; name: string };

/** The `@` has to start a word, or `me@example.test` names somebody. */
function atWordStart(text: string, i: number): boolean {
  return i === 0 || /\s/.test(text[i - 1]!);
}

/** Who this line names, from the people it is allowed to name. */
export function mentioned(body: string, present: Named[]): Named[] {
  const found: Named[] = [];
  const seen = new Set<string>();
  // Longest first: "@Sam Cole" must not be read as "@Sam" plus stray words.
  const order = [...present].sort((a, b) => b.name.length - a.name.length);
  let left = body;

  for (const person of order) {
    if (!person.name.trim() || seen.has(person.id)) continue;
    const at = `@${person.name}`.toLowerCase();

    // Scan past matches that are inside a word — an email address, a handle.
    let i = left.toLowerCase().indexOf(at);
    while (i !== -1 && !atWordStart(left, i)) {
      i = left.toLowerCase().indexOf(at, i + 1);
    }
    if (i === -1) continue;

    seen.add(person.id);
    found.push(person);
    // Blank the match so a shorter name inside it cannot match the same text.
    left = left.slice(0, i) + " ".repeat(at.length) + left.slice(i + at.length);
  }
  return found;
}

/** The `@…` being typed at the caret, for the picker. Null when there is none. */
export function typing(body: string, caret: number): { query: string; from: number } | null {
  const before = body.slice(0, caret);
  const at = before.lastIndexOf("@");
  if (at === -1) return null;
  // An `@` in the middle of a word is an address, not a mention.
  if (at > 0 && !/\s/.test(before[at - 1]!)) return null;
  const query = before.slice(at + 1);
  // A name is short. Past that it is a sentence and the picker should go away.
  if (query.length > 40 || query.includes("\n")) return null;
  return { query, from: at };
}
