import { describe, expect, test } from "vitest";
import { inflateSync } from "node:zlib";

import { sheet, text, textWidth, wrap } from "./lib/ink";
import { encodePng } from "./lib/png";
import { pctOf, renderVoteCard } from "./lib/voteCard";

/**
 * The card is bytes nobody on this team can look at, so the tests decode it.
 *
 * A picture that is merely "produced without throwing" is a picture that can
 * be a grey rectangle forever and nobody finds out until a link is pasted into
 * a group chat. So these read the PNG back: its header, its real dimensions,
 * and the actual pixels at known points on the card.
 */

/** The card's own frame, so the tests can find the band without guessing. */
const H = 418;

/** Pull the width, height and pixel rows back out of an encoded PNG. */
function decode(png: Uint8Array) {
  expect([...png.subarray(0, 8)]).toEqual([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);

  const view = new DataView(png.buffer, png.byteOffset, png.byteLength);
  const chunks = new Map<string, Uint8Array>();
  let at = 8;
  while (at < png.length) {
    const len = view.getUint32(at);
    const type = String.fromCharCode(...png.subarray(at + 4, at + 8));
    const body = png.subarray(at + 8, at + 8 + len);
    // A second IDAT would have to be concatenated; this encoder writes one.
    chunks.set(type, body);
    at += 12 + len;
  }

  const ihdr = new DataView(chunks.get("IHDR")!.buffer, chunks.get("IHDR")!.byteOffset);
  const w = ihdr.getUint32(0);
  const h = ihdr.getUint32(4);
  const raw = new Uint8Array(inflateSync(Buffer.from(chunks.get("IDAT")!)));
  const plte = chunks.get("PLTE")!;

  return {
    w,
    h,
    /** The palette index at a pixel, past that row's filter byte. */
    at: (x: number, y: number) => raw[y * (w + 1) + 1 + x]!,
    rgb: (i: number) => [plte[i * 3]!, plte[i * 3 + 1]!, plte[i * 3 + 2]!],
  };
}

describe("the encoder writes a real PNG", () => {
  test("a decoder can read back what was written", () => {
    const png = encodePng(3, 2, [[1, 2, 3], [4, 5, 6]], Uint8Array.from([0, 1, 0, 1, 0, 1]));
    const img = decode(png);
    expect([img.w, img.h]).toEqual([3, 2]);
    expect(img.at(0, 0)).toBe(0);
    expect(img.at(1, 0)).toBe(1);
    expect(img.at(2, 1)).toBe(1);
    expect(img.rgb(1)).toEqual([4, 5, 6]);
  });

  test("a pixel count that does not match the frame is refused", () => {
    expect(() => encodePng(2, 2, [[0, 0, 0]], Uint8Array.from([0]))).toThrow();
  });

  test("more than a byte of palette is refused", () => {
    const tooMany = Array.from({ length: 257 }, () => [0, 0, 0] as [number, number, number]);
    expect(() => encodePng(1, 1, tooMany, Uint8Array.from([0]))).toThrow();
  });
});

/* The card is two rows. These are their frames, quoted once so a test that
   probes a pixel is probing a place the card actually puts something. */
const ROW_TOP = 214;
const ROW_H = 78;
const ROW_GAP = 18;
const HATE_TOP = ROW_TOP + ROW_H + ROW_GAP;
const LOVE = 2;
const HATE_C = 3;
const SURFACE = 5;

describe("the card shows the split", () => {
  test("each side's bar is as long as its share", () => {
    const img = decode(renderVoteCard(pctOf(75, 25), "Pineapple on pizza?"));
    expect([img.w, img.h]).toEqual([800, 418]);

    const barEnd = (top: number, colour: number) => {
      let x = 44;
      while (x < 800 - 44 && img.at(x, top + ROW_H / 2 - 30) === colour) x++;
      return x - 44;
    };
    const track = 800 - 88;
    // Three quarters and one quarter of the track, within a pixel of rounding.
    expect(Math.abs(barEnd(ROW_TOP, LOVE) - track * 0.75)).toBeLessThan(2);
    expect(Math.abs(barEnd(HATE_TOP, HATE_C) - track * 0.25)).toBeLessThan(2);
  });

  test("a tiny share still reads as a bar rather than a line", () => {
    const img = decode(renderVoteCard(pctOf(2, 98), "Pineapple on pizza?"));
    let x = 44;
    while (x < 800 - 44 && img.at(x, ROW_TOP + 8) === LOVE) x++;
    // 2% of the track is fifteen pixels; the floor is a square.
    expect(x - 44).toBeGreaterThanOrEqual(ROW_H - 1);
  });

  test("both rows have a track behind them, so an empty side is still a row", () => {
    const img = decode(renderVoteCard(pctOf(100, 0), "Pineapple on pizza?"));
    expect(img.at(700, HATE_TOP + 8)).toBe(SURFACE);
  });

  test("nobody having voted is not drawn as a tie", () => {
    const img = decode(renderVoteCard(pctOf(0, 0), "Pineapple on pizza?"));
    for (const y of [ROW_TOP + 8, HATE_TOP + 8]) {
      for (const x of [50, 400, 740]) {
        expect(img.at(x, y)).not.toBe(LOVE);
        expect(img.at(x, y)).not.toBe(HATE_C);
      }
    }
  });
});

describe("a clean sweep puts no colour on the losing row", () => {
  test("100% hate draws no love bar", () => {
    const img = decode(renderVoteCard(pctOf(0, 37), "Pineapple on pizza?"));
    /* Above the lettering, so this counts the bar and not the word — the row
       is still labelled LOVE in red, which is the point of keeping the row.
       The minimum bar length used to print a block on a row reading 0%. */
    let love = 0;
    for (let x = 0; x < 800; x++) if (img.at(x, ROW_TOP + 8) === LOVE) love++;
    expect(love).toBe(0);
    expect(img.at(50, HATE_TOP + 8)).toBe(HATE_C);
  });

  test("a side that merely rounds to zero is still drawn", () => {
    // One love vote in five hundred is 0% and is still somebody.
    const split = pctOf(1, 499);
    expect(split.lovePct).toBe(0);
    expect(split.only).toBeNull();
    const img = decode(renderVoteCard(split, "Pineapple on pizza?"));
    expect(img.at(50, ROW_TOP + 8)).toBe(LOVE);
  });
});

describe("the writing always sits on something it can be read on", () => {
  /* Both the word and the number move to whichever colour they land on. A
     short bar leaves the word on the dark track, where the on-fill ink is
     near-black; a long one puts the number on the cyan, where white barely
     holds. Neither is visible at 61/39, which is why they are asserted. */
  test("a short bar does not print its label in near-black on the track", () => {
    const img = decode(renderVoteCard(pctOf(3, 97), "Pineapple on pizza?"));
    let onHate = 0;
    for (let y = ROW_TOP; y < ROW_TOP + ROW_H; y++) {
      for (let x = 44; x < 400; x++) if (img.at(x, y) === 6) onHate++;
    }
    expect(onHate).toBe(0);
  });

  test("a full bar does not print its number in white on the cyan", () => {
    const img = decode(renderVoteCard(pctOf(0, 41), "Pineapple on pizza?"));
    let white = 0;
    for (let y = HATE_TOP; y < HATE_TOP + ROW_H; y++) {
      for (let x = 500; x < 800 - 44; x++) if (img.at(x, y) === 1) white++;
    }
    expect(white).toBe(0);
  });
});

describe("the alphabet covers what the card says", () => {
  /* Missing glyphs are skipped silently rather than throwing, which is right
     for a picture — but it means a gap is invisible until somebody reads the
     card. "NO VOTES YET" rendered as "O VOTE ET" for exactly that reason. */
  test("every letter the card can print actually draws something", () => {
    const s = sheet(40, 40, 0);
    for (const ch of "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789%") {
      s.px.fill(0);
      text(s, ch, 4, 4, 30, 1);
      expect(s.px.some((p) => p === 1), `"${ch}" drew nothing`).toBe(true);
    }
  });
});

describe("the question is on the card", () => {
  test("it is drawn, above the band", () => {
    const blank = decode(renderVoteCard(pctOf(61, 39), ""));
    const asked = decode(renderVoteCard(pctOf(61, 39), "Pineapple on pizza?"));

    const inkAbove = (img: ReturnType<typeof decode>) => {
      let n = 0;
      for (let y = 80; y < H - 150 - 70; y++) {
        for (let x = 0; x < 800; x++) if (img.at(x, y) === 1) n++;
      }
      return n;
    };
    // A card that silently dropped the question would match the blank one.
    expect(inkAbove(asked)).toBeGreaterThan(inkAbove(blank) + 2000);
  });

  test("a question too long to fit is cut, not run off the edge", () => {
    const long =
      "Should the government introduce a wealth tax on estates above ten million " +
      "pounds to fund the health service and close the deficit once and for all";
    const lines = wrap(long, 31, 800 - 88, 3);
    expect(lines.length).toBeLessThanOrEqual(3);
    expect(lines[lines.length - 1]!.endsWith("...")).toBe(true);
    // And nothing that was kept overhangs the frame it was measured against.
    for (const line of lines) expect(textWidth(line, 31)).toBeLessThanOrEqual(800 - 88);
  });

  test("a question mark actually draws", () => {
    const s = sheet(40, 40, 0);
    text(s, "?", 4, 4, 30, 1);
    expect(s.px.some((p) => p === 1)).toBe(true);
  });
});
