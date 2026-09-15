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
 * **Deflate is skipped, not implemented.** A deflate stream is allowed to
 * carry "stored" blocks — literal bytes with a length in front — so a valid
 * zlib stream can be written with no compressor at all. It costs size, which
 * is why the card is 800px rather than the usual 1200: an indexed 800×418 card
 * lands around 340KB, well inside what every unfurler accepts, and no reader
 * ever waits on it because the crawler is the one fetching.
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

/**
 * Wrap raw bytes as a zlib stream of stored deflate blocks.
 *
 * `0x78 0x01` is the zlib header for the lowest compression setting, which is
 * the honest thing to claim here. Each block carries its length and that
 * length's one's complement, both little-endian, and the last one sets the
 * final bit.
 */
function stored(raw: Uint8Array): number[] {
  const out: number[] = [0x78, 0x01];
  const MOST = 65535;
  for (let at = 0; at < raw.length || at === 0; at += MOST) {
    const part = raw.subarray(at, at + MOST);
    const last = at + MOST >= raw.length ? 1 : 0;
    out.push(last, part.length & 0xff, (part.length >>> 8) & 0xff);
    out.push(~part.length & 0xff, (~part.length >>> 8) & 0xff);
    for (const b of part) out.push(b);
  }
  return out.concat(be32(adler32(raw)));
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
    ...chunk("IDAT", stored(raw)),
    ...chunk("IEND", []),
  ]);
}
