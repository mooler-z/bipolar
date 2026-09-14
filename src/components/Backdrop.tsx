import type { Side } from "../lib/format";

import "./backdrop.css";

/**
 * Weather behind the question.
 *
 * Four fields — two of the love red, two of the hate blue — each on its own
 * path and its own clock so they never line up, blurred to nothing under a
 * plate of grain. The two sides of the product drifting into each other
 * behind the thing being argued about.
 *
 * `lean` is which answer the cursor is over. That side's fields swell and push
 * across the middle while the other retreats, and letting go evens them out —
 * the ground takes a side before the reader does. `flood` is that same lean
 * taken all the way: the answer has been pressed, the chosen colour comes up
 * to full and fills the column, and the result slides in over it.
 *
 * Held at low opacity on purpose, and at a fifth of that on the light theme,
 * where white gives a saturated field nothing to sink into and it reads as a
 * stain rather than as weather. The question and the two answers are the only
 * things in this column allowed an edge; a ground that competes with them is
 * a ground that has to go.
 *
 * Pure CSS — four composited transforms and one static SVG. Nothing here runs
 * a frame loop, and the whole thing is `contain: strict`, so it never costs
 * the arena a frame.
 */
export function Backdrop({
  lean = null,
  flood = false,
}: {
  lean?: Side | null;
  flood?: boolean;
}) {
  return (
    <div
      aria-hidden
      className="backdrop"
      data-lean={lean ?? undefined}
      data-flood={flood ? "true" : undefined}
    >
      <div className="backdrop-field">
        <span className="lean lean-love">
          <span className="blob blob-1" />
        </span>
        <span className="lean lean-hate">
          <span className="blob blob-2" />
        </span>
        <span className="lean lean-love">
          <span className="blob blob-3" />
        </span>
        <span className="lean lean-hate">
          <span className="blob blob-4" />
        </span>
      </div>

      {/* Without this a field this large and this blurred bands in visible
          steps on a dark screen, which reads as a rendering fault. */}
      <svg className="backdrop-grain" xmlns="http://www.w3.org/2000/svg">
        <filter id="bp-grain">
          <feTurbulence type="fractalNoise" baseFrequency="0.72" numOctaves="4" stitchTiles="stitch" />
        </filter>
        <rect width="100%" height="100%" filter="url(#bp-grain)" />
      </svg>
    </div>
  );
}
