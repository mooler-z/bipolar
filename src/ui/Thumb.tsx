import { useState } from "react";

import { cn } from "../lib/cn";

/**
 * A topic's picture.
 *
 * **It renders nothing when there is nothing**, and nothing when the image
 * fails to load. Two thirds of this feed is abstract — tipping, remote work,
 * daylight saving — and those topics are better as clean type than as a grey
 * placeholder box. A layout that reserves space for an image it may not get is
 * a layout that looks broken on most of its own content.
 *
 * Wikipedia thumbnails arrive at a known width but an unknown aspect ratio and
 * a modest resolution. In a square frame that is fine: the frame owns the shape
 * and the image is cropped to it. In a **wide band** it is not — covering a
 * 390×200 banner with a 300px portrait upscales it and leaves a face filling
 * the screen with its forehead missing.
 *
 * `fill` is the answer to that: the picture is *contained*, whole, over a
 * blurred and scaled copy of itself. The band fills edge to edge, the subject
 * survives, and nothing is enlarged past what it can carry.
 */
export function Thumb({
  src,
  alt,
  className,
  rounded = "rounded-[var(--r-card)]",
  position = "object-center",
  fit = "object-cover",
  fill = false,
}: {
  src?: string | null;
  alt: string;
  className?: string;
  rounded?: string;
  /** Where the crop favours. A face sits high in a news photograph. */
  position?: string;
  /** How the picture meets its frame. Responsive classes are fine. */
  fit?: string;
  /** Lay a blurred copy behind it, for a frame wider than the source. */
  fill?: boolean;
}) {
  const [failed, setFailed] = useState(false);
  if (!src || failed) return null;

  return (
    <span
      className={cn(
        "relative block shrink-0 overflow-hidden bg-surface-2",
        rounded,
        className,
      )}
    >
      {fill ? (
        <img
          src={src}
          alt=""
          aria-hidden
          loading="lazy"
          decoding="async"
          className="absolute inset-0 size-full scale-125 object-cover opacity-45 blur-xl sm:hidden"
        />
      ) : null}
      <img
        src={src}
        alt={alt}
        loading="lazy"
        decoding="async"
        onError={() => setFailed(true)}
        className={cn("relative size-full", fit, position)}
      />
    </span>
  );
}
