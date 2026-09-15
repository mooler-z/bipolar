import { useId } from "react";

import { cn } from "../lib/cn";

/**
 * The noise plate.
 *
 * A field of colour this large and this soft bands into visible steps on a
 * dark screen, and a band reads as a rendering fault rather than as weather —
 * so everything in this product that carries a blurred ground carries this
 * over it. Same turbulence everywhere, so two surfaces that meet speckle at
 * the same rate and the join between them disappears.
 *
 * `soft-light` rather than `overlay`: it lifts the mid-tones and leaves the
 * blacks alone, which is what keeps a near-black column from going grey.
 *
 * The filter id has to be unique per instance — two plates sharing one id on
 * a page means the second resolves to the first, which is harmless until the
 * first unmounts and takes the filter with it.
 */
export function Grain({
  className,
  opacity = 0.2,
}: {
  className?: string;
  /** How much of it. Heavier over a surface that has already been blurred. */
  opacity?: number;
}) {
  const id = `grain-${useId().replace(/:/g, "")}`;
  return (
    <svg
      aria-hidden
      xmlns="http://www.w3.org/2000/svg"
      style={{ opacity }}
      className={cn(
        "pointer-events-none absolute inset-0 h-full w-full mix-blend-soft-light",
        className,
      )}
    >
      <filter id={id}>
        <feTurbulence type="fractalNoise" baseFrequency="0.72" numOctaves="4" stitchTiles="stitch" />
      </filter>
      <rect width="100%" height="100%" filter={`url(#${id})`} />
    </svg>
  );
}
