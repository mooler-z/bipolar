/**
 * Drawing, with no drawing library.
 *
 * A sheet of palette indices and two ways to mark it: axis-aligned rectangles,
 * and filled polygons for the handful of strokes that are not. That is the
 * whole surface, because the card it draws is flat colour — see `png.ts` for
 * why any of this is here rather than in a font engine.
 *
 * **The alphabet is deliberately tiny.** The card carries percentages, the two
 * words LOVE and HATE, and the wordmark; the question is the unfurl's own
 * title and repeating it inside the picture underneath would say it twice. So
 * the glyphs needed are the digits, `%`, and eleven letters — each described
 * once as geometry in a unit box and scaled at use, which is how the text
 * stays crisp at any size a bitmap font would have gone blocky at.
 */

export type Sheet = { w: number; h: number; px: Uint8Array };

export function sheet(w: number, h: number, fill = 0): Sheet {
  const px = new Uint8Array(w * h);
  if (fill) px.fill(fill);
  return { w, h, px };
}

export function rect(s: Sheet, x: number, y: number, w: number, h: number, colour: number) {
  const x0 = Math.max(0, Math.round(x));
  const y0 = Math.max(0, Math.round(y));
  const x1 = Math.min(s.w, Math.round(x + w));
  const y1 = Math.min(s.h, Math.round(y + h));
  for (let row = y0; row < y1; row++) s.px.fill(colour, row * s.w + x0, row * s.w + x1);
}

/** Even-odd scanline fill. Enough for the diagonals in V, A, R, 1, 7 and %. */
export function poly(s: Sheet, points: [number, number][], colour: number) {
  let top = Infinity;
  let bottom = -Infinity;
  for (const [, y] of points) {
    top = Math.min(top, y);
    bottom = Math.max(bottom, y);
  }
  const y0 = Math.max(0, Math.floor(top));
  const y1 = Math.min(s.h - 1, Math.ceil(bottom));

  for (let y = y0; y <= y1; y++) {
    const mid = y + 0.5;
    const hits: number[] = [];
    for (let i = 0; i < points.length; i++) {
      const [ax, ay] = points[i]!;
      const [bx, by] = points[(i + 1) % points.length]!;
      if (ay === by) continue;
      if (mid < Math.min(ay, by) || mid >= Math.max(ay, by)) continue;
      hits.push(ax + ((mid - ay) / (by - ay)) * (bx - ax));
    }
    hits.sort((a, b) => a - b);
    for (let i = 0; i + 1 < hits.length; i += 2) {
      rect(s, hits[i]!, y, hits[i + 1]! - hits[i]!, 1, colour);
    }
  }
}

/* ── the alphabet ──────────────────────────────────────────────────────────
   Every glyph lives in a box one unit tall and `W` wide, described as a list
   of rectangles plus, where a letter genuinely needs one, a polygon. `S` is
   the stroke. Both are fractions, so a glyph is the same shape at any size. */

const W = 0.62;
const S = 0.15;
const MID = 0.5 - S / 2;

type Mark = { r?: [number, number, number, number][]; p?: [number, number][][] };

const BAR_L: [number, number, number, number] = [0, 0, S, 1];
const BAR_R: [number, number, number, number] = [W - S, 0, S, 1];
const TOP: [number, number, number, number] = [0, 0, W, S];
const BOTTOM: [number, number, number, number] = [0, 1 - S, W, S];
const CROSS: [number, number, number, number] = [0, MID, W, S];

/** The upper or lower half of a side bar, for the bowls of 2, 5, 6, 9, B, P. */
const upper = (x: number): [number, number, number, number] => [x, 0, S, 0.5];
const lower = (x: number): [number, number, number, number] => [x, 0.5, S, 0.5];

const GLYPHS: Record<string, Mark> = {
  "0": { r: [TOP, BOTTOM, BAR_L, BAR_R] },
  "1": {
    r: [[W / 2 - S / 2, 0, S, 1]],
    // The flag, without which a 1 is a plain stroke and reads as an I.
    p: [[[W / 2 - S / 2, 0], [W / 2 - S / 2, S * 1.1], [0.06, 0.3], [0.06, 0.19]]],
  },
  "2": { r: [TOP, upper(W - S), CROSS, lower(0), BOTTOM] },
  "3": { r: [TOP, BAR_R, CROSS, BOTTOM] },
  "4": { r: [upper(0), BAR_R, [0, 0.5 - S, W, S]] },
  "5": { r: [TOP, upper(0), CROSS, lower(W - S), BOTTOM] },
  "6": { r: [TOP, BAR_L, CROSS, lower(W - S), BOTTOM] },
  "7": {
    r: [TOP],
    p: [[[W - S, S], [W, S], [W / 2 + S / 2, 1], [W / 2 - S / 2, 1]]],
  },
  "8": { r: [TOP, BOTTOM, BAR_L, BAR_R, CROSS] },
  "9": { r: [TOP, upper(0), BAR_R, CROSS, BOTTOM] },
  A: {
    r: [[0.13, 0.63, W - 0.26, S]],
    p: [
      [[W / 2 - S / 2, 0], [W / 2 + S / 2, 0], [S, 1], [0, 1]],
      [[W / 2 - S / 2, 0], [W / 2 + S / 2, 0], [W, 1], [W - S, 1]],
    ],
  },
  B: { r: [BAR_L, TOP, CROSS, BOTTOM, [W - S, S, S, 0.5 - S], [W - S, 0.5, S, 0.5 - S]] },
  E: { r: [BAR_L, TOP, [0, MID, W - 0.08, S], BOTTOM] },
  H: { r: [BAR_L, BAR_R, CROSS] },
  I: { r: [[0, 0, S, 1]] },
  L: { r: [BAR_L, BOTTOM] },
  O: { r: [TOP, BOTTOM, BAR_L, BAR_R] },
  P: { r: [BAR_L, TOP, CROSS, upper(W - S)] },
  R: {
    r: [BAR_L, TOP, CROSS, upper(W - S)],
    p: [[[W / 2 - S / 2, MID], [W / 2 + S / 2, MID], [W, 1], [W - S, 1]]],
  },
  T: { r: [TOP, [W / 2 - S / 2, 0, S, 1]] },
  C: { r: [TOP, BAR_L, BOTTOM] },
  D: { r: [BAR_L, TOP, BOTTOM, [W - S, S, S, 1 - S * 2]] },
  F: { r: [BAR_L, TOP, CROSS] },
  G: { r: [TOP, BAR_L, BOTTOM, lower(W - S), [W / 2, MID, W / 2, S]] },
  J: { r: [BAR_R, BOTTOM, lower(0)] },
  K: {
    r: [BAR_L],
    p: [
      [[W, 0], [W - S, 0], [0, MID + S], [0, MID]],
      [[W - S, 1], [W, 1], [0, MID], [0, MID + S]],
    ],
  },
  M: {
    r: [BAR_L, BAR_R],
    p: [
      [[0, 0], [S, 0], [W / 2 + S / 2, 1], [W / 2 - S / 2, 1]],
      [[W - S, 0], [W, 0], [W / 2 + S / 2, 1], [W / 2 - S / 2, 1]],
    ],
  },
  N: {
    r: [BAR_L, BAR_R],
    p: [[[0, 0], [S, 0], [W, 1], [W - S, 1]]],
  },
  Q: {
    r: [TOP, BOTTOM, BAR_L, BAR_R],
    p: [[[W / 2, MID], [W / 2 + S, MID], [W, 1.12], [W - S, 1.12]]],
  },
  S: { r: [TOP, upper(0), CROSS, lower(W - S), BOTTOM] },
  U: { r: [BAR_L, BAR_R, BOTTOM] },
  W: {
    r: [BAR_L, BAR_R],
    p: [
      [[W / 2 - S / 2, 0], [W / 2 + S / 2, 0], [S, 1], [0, 1]],
      [[W / 2 - S / 2, 0], [W / 2 + S / 2, 0], [W, 1], [W - S, 1]],
    ],
  },
  X: {
    p: [
      [[0, 0], [S, 0], [W, 1], [W - S, 1]],
      [[W - S, 0], [W, 0], [S, 1], [0, 1]],
    ],
  },
  Y: {
    r: [[W / 2 - S / 2, MID, S, 1 - MID]],
    p: [
      [[0, 0], [S, 0], [W / 2 + S / 2, MID + S], [W / 2 - S / 2, MID + S]],
      [[W - S, 0], [W, 0], [W / 2 + S / 2, MID + S], [W / 2 - S / 2, MID + S]],
    ],
  },
  Z: {
    r: [TOP, BOTTOM],
    p: [[[W - S, S], [W, S], [S, 1 - S], [0, 1 - S]]],
  },
  V: {
    p: [
      [[0, 0], [S, 0], [W / 2 + S / 2, 1], [W / 2 - S / 2, 1]],
      [[W - S, 0], [W, 0], [W / 2 + S / 2, 1], [W / 2 - S / 2, 1]],
    ],
  },
  "%": {
    r: [
      [0, 0, 0.22, S], [0, 0, S, 0.3], [0.22 - S, 0, S, 0.3], [0, 0.3 - S, 0.22, S],
      [W - 0.22, 0.7, 0.22, S], [W - 0.22, 0.7, S, 0.3], [W - S, 0.7, S, 0.3],
      [W - 0.22, 1 - S, 0.22, S],
    ],
    p: [[[W - S, 0], [W, 0], [S, 1], [0, 1]]],
  },
  " ": { r: [] },

  /* Punctuation, because the question goes on the card and a question mark is
     not optional on a question. Anything still missing draws nothing and
     leaves its space, which is a gap rather than a wrong word. */
  "?": {
    r: [
      TOP,
      [W - S, 0, S, 0.44],
      [W / 2 - S / 2, 0.44 - S, W / 2, S],
      [W / 2 - S / 2, 0.44, S, 0.22],
      [W / 2 - S / 2, 0.84, S, S],
    ],
  },
  "!": { r: [[0, 0, S, 0.62], [0, 0.84, S, S]] },
  ".": { r: [[0, 1 - S, S, S]] },
  ",": { r: [[0, 1 - S, S, S]], p: [[[0, 1], [S, 1], [0, 1 + S * 0.9]]] },
  "'": { r: [[0, 0, S, 0.3]] },
  '"': { r: [[0, 0, S, 0.3], [S * 1.6, 0, S, 0.3]] },
  "-": { r: [[0, MID, W * 0.66, S]] },
  ":": { r: [[0, 0.34, S, S], [0, 1 - S, S, S]] },
  ";": { r: [[0, 0.34, S, S], [0, 1 - S, S, S]], p: [[[0, 1], [S, 1], [0, 1 + S * 0.9]]] },
  "/": { p: [[[W - S, 0], [W, 0], [S, 1], [0, 1]]] },
};

/** The glyphs that are a stroke wide rather than a box wide. */
const NARROW = new Set(["I", "!", ".", ",", "'", ":", ";"]);

/** How wide a glyph is, in units. Most are one box; a few are one stroke. */
function widthOf(ch: string): number {
  if (ch === " ") return W * 0.5;
  if (NARROW.has(ch)) return S;
  if (ch === '"') return S * 2.6;
  if (ch === "-") return W * 0.66;
  return W;
}

/** How wide a string will be, at a size — for centring and right-aligning. */
export function textWidth(text: string, size: number, gap = 0.16): number {
  let units = 0;
  for (const ch of text.toUpperCase()) units += widthOf(ch) + gap;
  return (units - gap) * size;
}

/** Draw a string with its left edge at `x` and its cap height starting at `y`. */
export function text(
  s: Sheet,
  value: string,
  x: number,
  y: number,
  size: number,
  colour: number,
  gap = 0.16,
) {
  let at = x;
  for (const ch of value.toUpperCase()) {
    const mark = GLYPHS[ch];
    if (mark) {
      for (const [rx, ry, rw, rh] of mark.r ?? []) {
        rect(s, at + rx * size, y + ry * size, rw * size, rh * size, colour);
      }
      for (const shape of mark.p ?? []) {
        poly(s, shape.map(([px, py]) => [at + px * size, y + py * size]), colour);
      }
    }
    at += (widthOf(ch) + gap) * size;
  }
}

/**
 * Break a line to a width.
 *
 * Words, never characters, and never more than `most` lines — a question that
 * does not fit is cut with an ellipsis rather than shrunk until it is unreadable
 * or allowed to run off the edge. A single word longer than the whole line is
 * let through rather than looped on forever: better one overhanging word than
 * a picture that never renders.
 */
export function wrap(
  value: string,
  size: number,
  width: number,
  most: number,
  gap = 0.16,
): string[] {
  const words = value.trim().split(/\s+/).filter(Boolean);
  const lines: string[] = [];
  let line = "";

  for (const word of words) {
    const next = line ? `${line} ${word}` : word;
    if (!line || textWidth(next, size, gap) <= width) {
      line = next;
      continue;
    }
    lines.push(line);
    line = word;
    if (lines.length === most) break;
  }
  if (lines.length < most && line) lines.push(line);

  // Say that it was cut, rather than stopping mid-sentence as if that was it.
  const spilled = lines.join(" ").length < value.trim().length;
  if (spilled && lines.length > 0) {
    let last = lines[lines.length - 1]!.replace(/[,;:.]?$/, "");
    while (last && textWidth(`${last}...`, size, gap) > width) {
      last = last.slice(0, last.lastIndexOf(" ") > 0 ? last.lastIndexOf(" ") : last.length - 1);
    }
    lines[lines.length - 1] = `${last}...`;
  }
  return lines;
}
