import type { CSSProperties } from "react";

import "./convexMark.css";

/**
 * The Convex mark, turning. The wait while the boards are read.
 *
 * ── Attribution ───────────────────────────────────────────────────────────
 * The three lobes below are the shape of the Convex logo. The path data is
 * reproduced verbatim from the vendor's own published asset,
 * `https://docs.convex.dev/img/convex-dark.svg`, rather than redrawn by hand —
 * a logo traced by eye is a different logo. Convex is a trademark of its
 * owner, used here to mark work this app does on Convex.
 *
 * **It is tinted, not reproduced.** The vendor's amber, purple and red become
 * this product's own three: the rose, the violet between them, and the cyan.
 * That is a deliberate departure from the artwork as published, and brand
 * guidelines commonly ask for a mark to be left in its own colours — so it is
 * a choice that was made, not an accident, and it is the first thing to undo
 * if the vendor's terms turn out to forbid it. The geometry is untouched.
 *
 * If that use is ever not wanted, this is the only file to change: nothing
 * else in the app carries the geometry.
 * ──────────────────────────────────────────────────────────────────────────
 *
 * ── Why the box is built this way ─────────────────────────────────────────
 * The mark has to turn on the spot, and that only happens if the point it
 * rotates about is its own centre.
 *
 * `transform-box: view-box` anchors the reference box at user-space (0,0) —
 * *not* at the viewBox's min-x/min-y — so `transform-origin: center` always
 * resolves to (width/2, height/2) in user space. A viewBox offset to frame the
 * artwork therefore puts the origin off in space and the mark orbits it
 * instead of spinning.
 *
 * So the viewBox starts at 0,0 and the artwork is translated into the middle
 * of it. The mark's true centre is (88.61, 74.87) — measured by flattening the
 * curves, not by reading the path's raw numbers, because the Bézier control
 * points overshoot the drawn edge and give a centre that is visibly wrong.
 * Shifting by (-28.61, -14.87) lands that centre on (60, 60), the middle of a
 * 120-unit box. The box is 120 rather than the 92.13 the mark alone needs
 * because the lobes travel outward and anything past the edge is cut off
 * square: the artwork reaches 44.29 units from its centre, so 60 leaves 15.71
 * units of travel and the bloom uses 13.
 *
 * Two nested groups, and the split matters: the outer one carries the
 * animation, the inner one the fixed offset. Both on one element would have
 * the rotation overwrite the translation every frame.
 * ──────────────────────────────────────────────────────────────────────────
 *
 * Decoration only. Every caller pairs it with a live status line, so this is
 * hidden from assistive technology and stilled outright under reduced-motion.
 */
const LOBES: { d: string; fill: string; dx: number; dy: number }[] = [
  {
    fill: "var(--love-fill)",
    // Straight out from the mark's centre, along this lobe's own centroid.
    // Measured, not guessed: the three sit 120° apart at an equal radius, so
    // the mark opens evenly and closes back into register.
    dx: 0.91,
    dy: 12.97,
    d: "M100.22,100.4C113.32,98.97 125.67,92.11 132.47,80.66C129.25,108.98 97.74,126.88 72.02,115.89C69.65,114.88 67.61,113.2 66.21,111.04C60.43,102.12 58.53,90.77 61.26,80.47C69.06,93.7 84.92,101.81 100.22,100.4Z",
  },
  {
    fill: "var(--hate-fill)",
    dx: -11.68,
    dy: -5.71,
    d: "M60.78,72.16C55.47,84.22 55.24,98.34 61.75,109.96C38.84,93.02 39.09,56.77 61.47,40C63.54,38.45 66,37.53 68.58,37.39C79.19,36.84 89.97,40.87 97.53,48.38C82.17,48.53 67.21,58.2 60.78,72.16Z",
  },
  {
    fill: "var(--go-fill)",
    dx: 10.8,
    dy: -7.23,
    d: "M104.94,52.09C97.19,41.47 85.06,34.24 71.77,34.02C97.46,22.56 129.06,41.14 132.5,68.61C132.82,71.16 132.4,73.76 131.25,76.06C126.45,85.64 117.55,93.07 107.15,95.82C114.77,81.93 113.83,64.96 104.94,52.09Z",
  },
];

/**
 * `size` is a Tailwind class rather than a number, so each caller sets it in
 * the same units as everything around it and it stays responsive.
 *
 * `delay` shifts both animations together — the turn and the bloom — so a row
 * of these cascades instead of moving as one block.
 */
export function ConvexMark({
  size = "size-10",
  delay = "0s",
}: {
  size?: string;
  delay?: string;
}) {
  return (
    <svg
      viewBox="0 0 120 120"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden="true"
      className={`convex-spin ${size}`}
      style={{ "--delay": delay } as CSSProperties}
    >
      <g className="convex-spin-mark">
        <g transform="translate(-28.61 -14.87)">
          {LOBES.map((lobe) => (
            <path
              key={lobe.fill}
              d={lobe.d}
              fill={lobe.fill}
              className="convex-spin-lobe"
              // The direction travels with the lobe; the timing lives in CSS.
              style={{ "--dx": `${lobe.dx}px`, "--dy": `${lobe.dy}px` } as CSSProperties}
            />
          ))}
        </g>
      </g>
    </svg>
  );
}

/**
 * The wait itself: three marks in a row.
 *
 * Staggered rather than synchronised. Three identical animations in lockstep
 * read as one wide object stuttering; offsetting them by a fraction of the
 * cycle makes the row travel left to right, which is what tells a reader it is
 * a wait rather than a decoration that happens to move.
 *
 * The offsets are a share of the 1.2s turn, not round numbers — a third and
 * two thirds of it — so the three stay evenly spread however the duration is
 * later tuned.
 */
const STAGGER = ["0s", "-0.4s", "-0.8s"];

export function ConvexLoader({ size = "size-10" }: { size?: string }) {
  return (
    <div className="flex items-center justify-center gap-2">
      {STAGGER.map((delay) => (
        <ConvexMark key={delay} size={size} delay={delay} />
      ))}
    </div>
  );
}
