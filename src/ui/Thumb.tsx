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
 * Wikipedia thumbnails arrive at a known width but an unknown aspect ratio, so
 * the frame owns the shape and the image is cropped to it.
 */
export function Thumb({
  src,
  alt,
  className,
  rounded = "rounded-[var(--r-card)]",
}: {
  src?: string | null;
  alt: string;
  className?: string;
  rounded?: string;
}) {
  const [failed, setFailed] = useState(false);
  if (!src || failed) return null;

  return (
    <span
      className={cn(
        "block shrink-0 overflow-hidden bg-surface-2",
        rounded,
        className,
      )}
    >
      <img
        src={src}
        alt={alt}
        loading="lazy"
        decoding="async"
        onError={() => setFailed(true)}
        className="size-full object-cover"
      />
    </span>
  );
}
