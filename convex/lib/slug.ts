/** A question becomes an address. Lowercase, hyphenated, ASCII, bounded. */
export function slugify(text: string): string {
  return (
    text
      .toLowerCase()
      .normalize("NFKD")
      .replace(/[̀-ͯ]/g, "")
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "")
      .slice(0, 60)
      .replace(/-+$/g, "") || "topic"
  );
}

/** Four characters of entropy, appended when a slug is already taken. */
export function suffix(): string {
  return Math.random().toString(36).slice(2, 6);
}
