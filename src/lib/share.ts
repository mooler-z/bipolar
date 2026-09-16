/**
 * Sending a topic somewhere else.
 *
 * Pure plumbing — URL builders and the Web Share calls — with no React in it,
 * because the sheet that drives this is a component and the rules about what
 * a shared message looks like are not.
 *
 * **The link always lands on its own line.** X and WhatsApp take one free-text
 * field, and a url jammed onto the end of a sentence is a url that gets eaten
 * by punctuation. Reddit and Telegram take the link as its own structured
 * field, so those stay separate.
 *
 * Every call that can fail returns the same three words rather than throwing.
 * A share sheet the reader dismissed is not an error, and it must not read as
 * one — `cancelled` means they changed their mind, `unsupported` means the
 * browser cannot do it and the caller should fall back to a link.
 */

export type Channel = "x" | "whatsapp" | "reddit" | "telegram";
export type Target = {
  url: string;
  text: string;
  /** The topic's own tags. The house ones are added to them. */
  tags?: string[];
};

/**
 * The tags every post carries, and the shape the rest are beaten into.
 *
 * Two of ours, because a post has to be findable by the product's name and by
 * the thing the product is: somebody searching either should land on the same
 * pile. Then up to three of the topic's own, which is where the reach actually
 * comes from — `#Israel` and `#AI` are searched; `#bipolar` is not, yet.
 *
 * Camel-cased and stripped to letters and digits: a hashtag ends at the first
 * character that is not one, so `#far-right` is the tag `#far` with three
 * characters of litter after it.
 */
const HOUSE = ["bipolar", "LoveOrHate"];

export function hashtags(tags: string[] | undefined): string[] {
  const own = (tags ?? [])
    .map((t) =>
      t
        .split(/[^a-zA-Z0-9]+/)
        .filter(Boolean)
        .map((w) => w[0].toUpperCase() + w.slice(1))
        .join(""),
    )
    .filter((t) => t.length > 1 && t.length <= 24);
  // The house tags last: a reader's eye stops at the first one, and the
  // topic's own is the one worth stopping on.
  return [...new Set([...own.slice(0, 3), ...HOUSE])];
}
export type Sent = "shared" | "cancelled" | "unsupported";

/** The message body: the line, the tags, a blank line, then the link. */
function message(target: Target): string {
  const tags = hashtags(target.tags).map((t) => `#${t}`).join(" ");
  return `${target.text}\n${tags}\n\n${target.url}`;
}

/** Where a channel's compose window is, with this topic already in it. */
export function intentUrl(channel: Channel, target: Target): string {
  const u = encodeURIComponent(target.url);
  const t = encodeURIComponent(target.text);
  const msg = encodeURIComponent(message(target));
  switch (channel) {
    // One free-text field each: the link goes in the body, on its own line.
    /* X has fields for all three, and using them beats jamming a url and a
       row of hashes into one line: the link becomes a card rather than text,
       and the tags are attached rather than typed. */
    case "x":
      return (
        `https://x.com/intent/post?text=${t}` +
        `&url=${u}` +
        `&hashtags=${encodeURIComponent(hashtags(target.tags).join(","))}`
      );
    case "whatsapp":
      return `https://wa.me/?text=${msg}`;
    // These two render the link as its own block, so it stays its own field.
    case "reddit":
      return `https://www.reddit.com/submit?url=${u}&title=${t}`;
    case "telegram":
      return `https://t.me/share/url?url=${u}&text=${t}`;
  }
}

/**
 * Can this browser share an actual file? Web Share Level 2 — iOS Safari and
 * Android Chrome; a desktop almost never.
 *
 * Probed with an empty file rather than the real card, because drawing a
 * 1200×630 picture to decide whether to show a button is a picture drawn for
 * nothing on every desktop that will never use it.
 */
export function canShareFile(): boolean {
  if (typeof navigator === "undefined" || !navigator.canShare) return false;
  try {
    return navigator.canShare({ files: [new File([], "probe.png", { type: "image/png" })] });
  } catch {
    return false;
  }
}

/** The card itself, into whatever the phone offers. */
export async function shareFile(file: File, target: Target): Promise<Sent> {
  if (typeof navigator === "undefined" || !navigator.canShare?.({ files: [file] })) {
    return "unsupported";
  }
  try {
    /* The url goes inside `text`, not in `url`. Passing both lets the OS
       decide, and what it decides is to jam the link onto the caption. */
    await navigator.share({ files: [file], text: message(target) });
    return "shared";
  } catch {
    return "cancelled";
  }
}

/** The link and the line, with no picture. */
export async function shareText(target: Target): Promise<Sent> {
  if (typeof navigator === "undefined" || !navigator.share) return "unsupported";
  try {
    await navigator.share({ text: message(target) });
    return "shared";
  } catch {
    return "cancelled";
  }
}

export async function copyLink(url: string): Promise<boolean> {
  try {
    await navigator.clipboard.writeText(url);
    return true;
  } catch {
    return false;
  }
}
