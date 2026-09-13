import { useEffect, useRef, useState, type ReactNode } from "react";

import { cn } from "../lib/cn";

/**
 * Keeps a screen's primary action reachable however long the screen gets.
 *
 * The result page runs past the fold — verdict, figures, two layers, the map,
 * every country — and the one thing a reader wants at the end of it is *next*.
 * Scrolling to find it is the sort of friction that ends a session.
 *
 * So the row renders in place, and a sentinel watches it: the moment it leaves
 * the viewport a fixed bar takes over with the same actions, and it disappears
 * again when the real row comes back. Never both at once, and no bar at all on
 * a screen short enough not to need one — chrome that is always there stops
 * being noticed.
 *
 * Unlike the mobile-only version this is translated from, it works at every
 * width, because a long page is long on a desktop too.
 */
export function StickyBar({
  children,
  /** What the pinned bar shows. Defaults to the same row. */
  pinned,
  className,
}: {
  children: ReactNode;
  pinned?: ReactNode;
  className?: string;
}) {
  const sentinel = useRef<HTMLDivElement | null>(null);
  // Assume away until the observer says otherwise: on a long page the row is
  // off screen at first paint, and a bar that arrives late is a bar that was
  // missing exactly when it was needed.
  const [away, setAway] = useState(true);

  useEffect(() => {
    const node = sentinel.current;
    if (!node || typeof IntersectionObserver === "undefined") return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        // Pin whenever the real row is off screen, above *or* below.
        //
        // An earlier version pinned only when the row had scrolled above the
        // viewport, on the theory that a bar appearing before the reader got
        // there would pre-empt them. That reasoning is wrong for a row that is
        // the last thing on the page: you never scroll *past* it, you arrive at
        // it — so the bar never appeared and the button stayed unreachable,
        // which is the whole problem it existed to solve.
        setAway(!entry.isIntersecting);
      },
      { threshold: 0 },
    );
    observer.observe(node);
    return () => observer.disconnect();
  }, []);

  return (
    <>
      <div ref={sentinel} className={className}>
        {children}
      </div>

      <div
        aria-hidden={!away}
        className={cn(
          "fixed inset-x-0 bottom-0 z-30 border-t border-line bg-canvas/92 backdrop-blur-xl",
          "transition-[transform,opacity] duration-200 ease-out",
          "pb-[max(0.75rem,env(safe-area-inset-bottom))] pt-3",
          away
            ? "translate-y-0 opacity-100"
            : "pointer-events-none translate-y-full opacity-0",
        )}
      >
        <div className="mx-auto flex w-full max-w-[640px] items-center gap-3 px-4 sm:px-6">
          {pinned ?? children}
        </div>
      </div>
    </>
  );
}
