/**
 * The picture that gets pasted.
 *
 * The reference renders this server-side, which needs a server that renders —
 * a Node runtime with a font pipeline and an SVG rasteriser behind it. This
 * front end is a static bundle over Convex and has neither, so the card is
 * drawn **in the browser that is sharing it**. That turns out to be the better
 * trade rather than a concession: no round trip, no cold start, no image
 * service to keep alive, and the numbers are the ones already on screen.
 *
 * **The lean, never the counts**, which is the same line `convex/seo.ts` draws
 * for the link preview: enough to be worth pasting, not enough to reconstruct
 * what somebody who has not voted has not earned. The Crowd and the Committed
 * are never split apart here — keeping those two numbers apart is the product,
 * and a card that gave it away would be selling the thing it advertises.
 *
 * The topic's photo is left out on purpose. It is served from another origin,
 * and drawing a cross-origin image taints the canvas, at which point exporting
 * it throws and the share silently dies. Type on black is also simply the
 * house look.
 */

import { pct } from "./format";

const W = 1200;
const H = 630;
const PAD = 72;

/** Read off `index.css` rather than guessed, so the card is the same palette. */
const INK = "#ffffff";
const MUTE = "#7b8996";
const LINE = "#242b32";
const LOVE = "#ff2d55";
const HATE = "#00c2ff";

export type Card = {
  question: string;
  /** Whole numbers that add to 100. The lean, which is the publishable half. */
  lovePct: number;
  hatePct: number;
  /** Where the card points. Drawn small at the foot. */
  site: string;
};

/** Break a line to a width, and never return more than `most` of them. */
function wrap(ctx: CanvasRenderingContext2D, text: string, width: number, most: number): string[] {
  const lines: string[] = [];
  let line = "";
  for (const word of text.split(/\s+/)) {
    const next = line ? `${line} ${word}` : word;
    if (ctx.measureText(next).width <= width || !line) {
      line = next;
      continue;
    }
    lines.push(line);
    line = word;
    if (lines.length === most) break;
  }
  if (lines.length < most && line) lines.push(line);
  // A question cut short still has to read as one, so say that it was cut.
  if (lines.length === most) {
    const last = lines[most - 1]!;
    if (ctx.measureText(text).width > width * most) {
      lines[most - 1] = `${last.replace(/[,.;:]?$/, "")}…`;
    }
  }
  return lines;
}

/** One side's bar: the word, the percentage, and the block that fills. */
function bar(
  ctx: CanvasRenderingContext2D,
  y: number,
  label: string,
  percent: number,
  colour: string,
) {
  const h = 76;
  const track = W - PAD * 2;

  ctx.fillStyle = "#15191d";
  ctx.beginPath();
  ctx.roundRect(PAD, y, track, h, 14);
  ctx.fill();

  // Never a hairline of colour: a 3% side still has to read as a block.
  const filled = Math.max(h, Math.round((track * percent) / 100));
  ctx.fillStyle = colour;
  ctx.beginPath();
  ctx.roundRect(PAD, y, filled, h, 14);
  ctx.fill();

  ctx.font = `800 30px Inter, system-ui, sans-serif`;
  ctx.textBaseline = "middle";
  /* The word sits on its own block, so it takes the colour that block
     carries; the number sits past the fill on the dark track. */
  ctx.fillStyle = colour === LOVE ? "#ffffff" : "#04121a";
  ctx.fillText(label, PAD + 28, y + h / 2 + 1);

  ctx.font = `900 38px Inter, system-ui, sans-serif`;
  ctx.fillStyle = INK;
  ctx.textAlign = "right";
  ctx.fillText(`${percent}%`, W - PAD - 28, y + h / 2 + 1);
  ctx.textAlign = "left";
}

/**
 * Draw it, and hand back a file ready for `navigator.share`.
 *
 * Returns null rather than throwing on any of the several ways a canvas can
 * refuse — no 2D context, a browser that will not export, fonts that never
 * arrived. The caller falls back to sharing a link, which is a worse share and
 * a fine outcome; a thrown error in the middle of a share sheet is neither.
 */
export async function drawCard(card: Card): Promise<File | null> {
  try {
    // Inter is the page's own font. Without this the first card of a session
    // draws in Times, because the canvas does not wait for a webfont.
    await document.fonts?.ready;

    const canvas = document.createElement("canvas");
    canvas.width = W;
    canvas.height = H;
    const ctx = canvas.getContext("2d");
    if (!ctx) return null;

    ctx.fillStyle = "#000000";
    ctx.fillRect(0, 0, W, H);
    ctx.strokeStyle = LINE;
    ctx.lineWidth = 2;
    ctx.strokeRect(1, 1, W - 2, H - 2);

    ctx.textBaseline = "alphabetic";
    ctx.font = `900 26px Inter, system-ui, sans-serif`;
    ctx.fillStyle = INK;
    ctx.fillText("bipolar", PAD, PAD + 8);

    ctx.font = `700 22px Inter, system-ui, sans-serif`;
    ctx.fillStyle = MUTE;
    ctx.textAlign = "right";
    ctx.fillText("LOVE IT OR HATE IT", W - PAD, PAD + 8);
    ctx.textAlign = "left";

    // The question, sized to what it is: a short one is allowed to shout.
    const size = card.question.length > 88 ? 50 : card.question.length > 48 ? 62 : 76;
    ctx.font = `900 ${size}px Inter, system-ui, sans-serif`;
    ctx.fillStyle = INK;
    const lines = wrap(ctx, card.question, W - PAD * 2, 3);
    let y = PAD + 104;
    for (const line of lines) {
      ctx.fillText(line, PAD, y + size * 0.82);
      y += size * 1.1;
    }

    bar(ctx, H - PAD - 206, "LOVE", card.lovePct, LOVE);
    bar(ctx, H - PAD - 118, "HATE", card.hatePct, HATE);

    ctx.font = `700 21px Inter, system-ui, sans-serif`;
    ctx.fillStyle = MUTE;
    ctx.fillText(`Vote at ${card.site}`, PAD, H - PAD + 6);

    const blob = await new Promise<Blob | null>((done) =>
      canvas.toBlob(done, "image/png"),
    );
    if (!blob) return null;
    return new File([blob], "bipolar.png", { type: "image/png" });
  } catch {
    return null;
  }
}

/**
 * A card from a result, or null when there is no result to draw.
 *
 * **The crowd's lean, and only that.** It is the number the reveal detonates
 * with, and it is the one half of the aggregate that can travel: the Committed
 * layer is what a reader votes or pays to see, and a picture carrying it would
 * hand that away to everybody who never did either.
 */
export function cardFor(
  question: string,
  stats: { freeLove: number; freeHate: number } | null | undefined,
  site: string,
): Card | null {
  if (!stats) return null;
  const [love, hate] = pct(stats.freeLove, stats.freeHate);
  return { question, lovePct: love, hatePct: hate, site };
}
