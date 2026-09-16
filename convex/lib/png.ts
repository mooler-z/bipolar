/**
 * A PNG, written by hand.
 *
 * A link preview is fetched by a crawler, which runs no JavaScript — so the
 * card a pasted link unfurls into has to exist as bytes at a URL, rendered on
 * the server. Convex has no canvas, no font engine and no rasteriser, and the
 * usual answers (`satori` plus a native or WASM rasteriser) are a megabyte of
 * dependency and a platform bet. So the encoder is here, and it is small
 * because the picture it has to make is small: flat blocks of colour on a
 * fixed palette, which is exactly what indexed PNG is for.
 *
 * **Deflate is one trick, not a library.** The picture is seven flat colours
 * and almost every row is one of them eight hundred times over, so the encoder
 * below knows exactly one move: fixed Huffman codes, and matches only ever at
 * distance one — "the next two hundred and fifty-eight bytes are the same as
 * the last". It began as stored blocks, which is legal and needs no compressor
 * at all, and produced a byte a pixel: a third of a megabyte for a card that
 * is two rectangles and a sentence. Every unfurler accepts that and not all of
 * them like it.
 *
 * Every number here is from the PNG and zlib specifications rather than from
 * a library, so the two checksums are spelled out: CRC-32 over each chunk,
 * Adler-32 over the uncompressed data.
 */

const SIGNATURE = [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a];

/** The one table CRC-32 needs, built once. */
const CRC_TABLE = (() => {
  const table = new Uint32Array(256);
  for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    table[n] = c >>> 0;
  }
  return table;
})();

function crc32(bytes: Uint8Array): number {
  let c = 0xffffffff;
  for (const b of bytes) c = CRC_TABLE[(c ^ b) & 0xff]! ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
}

function adler32(bytes: Uint8Array): number {
  let a = 1;
  let b = 0;
  for (const byte of bytes) {
    a = (a + byte) % 65521;
    b = (b + a) % 65521;
  }
  return ((b << 16) | a) >>> 0;
}

function be32(n: number): number[] {
  return [(n >>> 24) & 0xff, (n >>> 16) & 0xff, (n >>> 8) & 0xff, n & 0xff];
}

/** One PNG chunk: length, type, payload, and the CRC over type+payload. */
function chunk(type: string, data: number[] | Uint8Array): number[] {
  const body = [...type].map((c) => c.charCodeAt(0)).concat([...data]);
  return [...be32(data.length), ...body, ...be32(crc32(Uint8Array.from(body)))];
}

/* ── a deflate that only knows how to repeat itself ───────────────────────
   The card is seven flat colours. Almost every row is one colour repeated
   eight hundred times, and a compressor that can say "the next two hundred
   and fifty-eight bytes are the same as the last one" turns three hundred
   kilobytes into a few. That is the whole trick: fixed Huffman codes, and
   matches only ever at distance one.

   A real LZ77 with a hash table would do a little better on the type. It is
   not worth the hundred lines: the type is a thousandth of the picture.
   ────────────────────────────────────────────────────────────────────────── */

/** Bits go into bytes low end first; a Huffman code goes in high end first. */
class Bits {
  readonly out: number[] = [];
  private bit = 0;
  private cur = 0;

  /** `n` raw bits of `value`, low bit first — lengths, distances, headers. */
  raw(value: number, n: number): void {
    for (let i = 0; i < n; i += 1) this.one((value >>> i) & 1);
  }

  /** A Huffman code of `n` bits, high bit first. */
  code(value: number, n: number): void {
    for (let i = n - 1; i >= 0; i -= 1) this.one((value >>> i) & 1);
  }

  private one(b: number): void {
    this.cur |= b << this.bit;
    this.bit += 1;
    if (this.bit === 8) {
      this.out.push(this.cur);
      this.cur = 0;
      this.bit = 0;
    }
  }

  done(): number[] {
    if (this.bit > 0) this.out.push(this.cur);
    return this.out;
  }
}

/** The fixed literal/length alphabet, as the deflate spec lays it out. */
function literal(bits: Bits, sym: number): void {
  if (sym <= 143) bits.code(0x30 + sym, 8);
  else if (sym <= 255) bits.code(0x190 + sym - 144, 9);
  else if (sym <= 279) bits.code(sym - 256, 7);
  else bits.code(0xc0 + sym - 280, 8);
}

/** Length 3..258 as its code, plus however many extra bits it carries. */
const LENGTH_BASE = [
  3, 4, 5, 6, 7, 8, 9, 10, 11, 13, 15, 17, 19, 23, 27, 31, 35, 43, 51, 59, 67,
  83, 99, 115, 131, 163, 195, 227, 258,
];
const LENGTH_EXTRA = [
  0, 0, 0, 0, 0, 0, 0, 0, 1, 1, 1, 1, 2, 2, 2, 2, 3, 3, 3, 3, 4, 4, 4, 4, 5, 5,
  5, 5, 0,
];

function match(bits: Bits, length: number): void {
  let i = LENGTH_BASE.length - 1;
  while (i > 0 && LENGTH_BASE[i] > length) i -= 1;
  literal(bits, 257 + i);
  bits.raw(length - LENGTH_BASE[i], LENGTH_EXTRA[i]);
  // Distance one: code 0, no extra bits. The only distance this encoder uses.
  bits.code(0, 5);
}

/**
 * Wrap raw bytes as a zlib stream of one fixed-Huffman block.
 *
 * Runs of four or more become a literal and then matches at distance one,
 * which is how a row of eight hundred identical pixels becomes four bytes.
 */
function squashed(raw: Uint8Array): number[] {
  const bits = new Bits();
  bits.raw(1, 1); // final block
  bits.raw(1, 2); // fixed Huffman

  let i = 0;
  while (i < raw.length) {
    let run = 1;
    while (i + run < raw.length && raw[i + run] === raw[i] && run < 100_000) run += 1;

    literal(bits, raw[i]);
    let left = run - 1;
    // A match needs three bytes to be worth a code, and tops out at 258.
    while (left >= 3) {
      const take = Math.min(258, left);
      match(bits, take);
      left -= take;
    }
    for (let k = 0; k < left; k += 1) literal(bits, raw[i]);
    i += run;
  }

  literal(bits, 256); // end of block
  return [0x78, 0x01, ...bits.done(), ...be32(adler32(raw))];
}

/** A colour as three bytes. */
export type Rgb = [number, number, number];

/**
 * Encode one indexed image.
 *
 * `pixels` holds a palette index per pixel, row-major. The filter byte in
 * front of every row is 0 — "none" — because the picture is flat colour and
 * a filter that cannot be followed by a compressor buys nothing.
 */
export function encodePng(
  width: number,
  height: number,
  palette: Rgb[],
  pixels: Uint8Array,
): Uint8Array {
  if (pixels.length !== width * height) {
    throw new Error("pixel count does not match the dimensions");
  }
  if (palette.length === 0 || palette.length > 256) {
    throw new Error("an indexed palette holds 1 to 256 colours");
  }

  const raw = new Uint8Array(height * (width + 1));
  for (let y = 0; y < height; y++) {
    raw[y * (width + 1)] = 0;
    raw.set(pixels.subarray(y * width, (y + 1) * width), y * (width + 1) + 1);
  }

  // Colour type 3 is indexed; bit depth 8 is one byte per pixel.
  const ihdr = [...be32(width), ...be32(height), 8, 3, 0, 0, 0];
  const plte = palette.flat();

  return Uint8Array.from([
    ...SIGNATURE,
    ...chunk("IHDR", ihdr),
    ...chunk("PLTE", plte),
    ...chunk("IDAT", squashed(raw)),
    ...chunk("IEND", []),
  ]);
}
