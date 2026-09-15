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
export type Target = { url: string; text: string };
export type Sent = "shared" | "cancelled" | "unsupported";

/** The message body: the line, a blank line, then the link. */
function message({ text, url }: Target): string {
  return `${text}\n\n${url}`;
}

/** Where a channel's compose window is, with this topic already in it. */
export function intentUrl(channel: Channel, target: Target): string {
  const u = encodeURIComponent(target.url);
  const t = encodeURIComponent(target.text);
  const msg = encodeURIComponent(message(target));
  switch (channel) {
    // One free-text field each: the link goes in the body, on its own line.
    case "x":
      return `https://x.com/intent/post?text=${msg}`;
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
