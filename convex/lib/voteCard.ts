import { rect, sheet, text, textWidth, wrap, type Sheet } from "./ink";
import { encodePng, type Rgb } from "./png";

/**
 * The picture a pasted link unfurls into, and the one an image share sends.
 *
 * The question, then two rows — LOVE and HATE — each a bar whose length is its
 * share of the room. It reads the way a poll result or a market reads, which
 * is the point: somebody scrolling a group chat takes it in without being
 * taught how, and nothing about it can be mistaken for anything other than a
 * vote. Chosen from ten (`.workspace/card-designs`) as the most legible.
 *
 * **The question is on the card.** It was left off at first on the grounds
 * that an unfurl prints it as the title just above — true, and irrelevant to
 * the path that matters most: sharing the picture itself into a chat or a
 * story, where there is no title, no link and no context, and the card is the
 * entire message. A card that needs a caption is not a card.
 *
 * **The lean, never the layers** — the same line `seo.ts` draws for the text
 * of the preview. This is the crowd's split and nothing else: the Committed
 * layer is what voting or paying buys, and a picture that carried it would be
 * handing it to everybody who did neither.
 *
 * 800×418 rather than the usual 1200×630: the encoder does not compress, so
 * the smaller sheet is what keeps the card a third of a megabyte. It still
 * holds the 1.91:1 ratio every unfurler asks for.
 */

const W = 800;
const H = 418;
const PAD = 44;

/** The question's box. A size is chosen to fit it, rather than to fit a line
    count — three lines of the largest size would have overrun the rows. */
const ASK_TOP = 76;
const ASK_HEIGHT = 124;

const ROW_TOP = 214;
const ROW_H = 78;
const ROW_GAP = 18;

/** Indices into the palette below, named so the drawing reads. */
const CANVAS = 0;
const INK = 1;
const LOVE = 2;
const HATE = 3;
const MUTE = 4;
const SURFACE = 5;
const ON_HATE = 6;

/** The product's own tokens, from `src/index.css`, as flat sRGB. */
const PALETTE: Rgb[] = [
  [0x00, 0x00, 0x00],
  [0xff, 0xff, 0xff],
  [0xff, 0x2d, 0x55],
  [0x00, 0xc2, 0xff],
  [0x7b, 0x89, 0x96],
  [0x15, 0x19, 0x1d],
  [0x04, 0x12, 0x1a],
];

/** The crowd's lean, and whether there is one. Rounded once, here. */
export function pctOf(love: number, hate: number): Split {
  const total = love + hate;
  if (total === 0) return { lovePct: 50, hatePct: 50, any: false, only: null };
  const l = Math.round((love / total) * 100);
  return {
    lovePct: l,
    hatePct: 100 - l,
    any: true,
    // Zero votes, not merely a percentage that rounded to zero.
    only: hate === 0 ? "love" : love === 0 ? "hate" : null,
  };
}

export type Split = {
  /** The crowd's lean. Whole numbers that add to 100. */
  lovePct: number;
  hatePct: number;
  /** False when nobody has answered yet — there is no split to draw. */
  any: boolean;
  /**
   * The side that took every single vote, when one did.
   *
   * Kept apart from the percentage because the minimum bar length lies here: a
   * side is never drawn shorter than a square so that 2% still reads as a bar,
   * and at 0% that rule put a block of colour on a row labelled 0%. One of
   * those two has to be wrong, and it is not the number.
   */
  only: "love" | "hate" | null;
};

export function renderVoteCard(split: Split, question: string): Uint8Array {
  const s = sheet(W, H, CANVAS);

  // The mark and what it is for, both quiet: the question is the loud thing.
  text(s, "BIPOLAR", PAD, 34, 22, MUTE, 0.3);
  const tag = "LOVE IT OR HATE IT";
  text(s, tag, W - PAD - textWidth(tag, 16, 0.26), 38, 16, MUTE, 0.26);

  ask(s, question);

  if (!split.any) {
    /* Nobody has voted. Two empty tracks would read as a tie at zero, so the
       rows are replaced by the one honest sentence. */
    const height = ROW_H * 2 + ROW_GAP;
    rect(s, PAD, ROW_TOP, W - PAD * 2, height, SURFACE);
    const size = 36;
    const line = "NO VOTES YET";
    text(s, line, (W - textWidth(line, size, 0.24)) / 2, ROW_TOP + height / 2 - size / 2, size, MUTE, 0.24);
    return encodePng(W, H, PALETTE, s.px);
  }

  row(s, "LOVE", split.lovePct, LOVE, INK, ROW_TOP, split.only === "hate");
  row(s, "HATE", split.hatePct, HATE, ON_HATE, ROW_TOP + ROW_H + ROW_GAP, split.only === "love");

  return encodePng(W, H, PALETTE, s.px);
}

/**
 * The question, at the largest size that fits its box.
 *
 * Sized by the box rather than by a line count, because three lines of the
 * largest size is taller than two of it — picking the first size that wrapped
 * to three lines let a long question run straight into the rows below.
 */
function ask(s: Sheet, question: string) {
  const sizes = [46, 38, 31, 26];
  let size = sizes[sizes.length - 1]!;
  let lines = wrap(question, size, W - PAD * 2, 3);

  for (const candidate of sizes) {
    const at = wrap(question, candidate, W - PAD * 2, 3);
    if (at.length * candidate * 1.24 <= ASK_HEIGHT) {
      size = candidate;
      lines = at;
      break;
    }
  }

  let y = ASK_TOP;
  for (const line of lines) {
    text(s, line, PAD, y, size, INK);
    y += size * 1.24;
  }
}

/**
 * One side: a track, a bar, the word, and the number.
 *
 * Both pieces of text move to whichever colour they are actually sitting on.
 * A short bar leaves the word on the dark track, where the on-fill ink is
 * near-black and invisible; a long one puts the number on the cyan, where
 * white barely holds. Neither showed up at 61/39, which is exactly why a card
 * has to be drawn at its awkward numbers before it is believed.
 */
function row(
  s: Sheet,
  label: string,
  percent: number,
  fill: number,
  onFill: number,
  y: number,
  empty: boolean,
) {
  const track = W - PAD * 2;
  rect(s, PAD, y, track, ROW_H, SURFACE);

  // Never shorter than a square, so 2% still reads as a bar — unless the side
  // genuinely took no votes at all, where a bar would be a lie.
  const bar = empty ? 0 : Math.max(ROW_H, Math.round((track * percent) / 100));
  if (bar > 0) rect(s, PAD, y, bar, ROW_H, fill);

  const labelSize = 28;
  const labelX = PAD + 28;
  const labelW = textWidth(label, labelSize, 0.26);
  const onBar = labelX + labelW + 10 <= PAD + bar;
  text(s, label, labelX, y + ROW_H / 2 - labelSize / 2, labelSize, onBar ? onFill : fill, 0.26);

  const valueSize = 50;
  const value = `${percent}%`;
  const valueX = W - PAD - 28 - textWidth(value, valueSize);
  const valueOnBar = valueX >= PAD && valueX + 6 < PAD + bar;
  text(s, value, valueX, y + ROW_H / 2 - valueSize / 2, valueSize, valueOnBar ? onFill : INK);
}
