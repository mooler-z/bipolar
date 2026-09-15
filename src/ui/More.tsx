import type { RefObject } from "react";

import { cn } from "../lib/cn";
import { Button } from "./Button";

/**
 * The foot of an endless list.
 *
 * Three states in one place so every list in the product ends the same way:
 * loading, a manual way forward, and the end. The sentinel is always rendered
 * while there is more — it is what the observer watches, and a list that only
 * mounts it while idle can never trigger the next page.
 *
 * The button is not decoration. Auto-loading fails quietly in the cases that
 * matter most — a short list that never scrolls, an observer that a browser
 * declines to fire, a container of the wrong height — and a list that has
 * silently stopped is indistinguishable from a list that has ended. So there
 * is always something to press.
 *
 * "The end" is stated rather than left blank, because a list that just stops
 * reads as one still loading.
 */
export function More({
  sentinel,
  status,
  onMore,
  count,
  noun = "records",
  className,
}: {
  sentinel: RefObject<HTMLDivElement | null>;
  /** Convex's `usePaginatedQuery` status, passed through. */
  status: string;
  onMore: () => void;
  /** How many are on screen, for the end-of-list line. */
  count?: number;
  noun?: string;
  className?: string;
}) {
  const loading = status === "LoadingMore" || status === "LoadingFirstPage";
  const done = status === "Exhausted";

  return (
    <div className={cn("py-4", className)}>
      {/* Watched by the observer. Rendered whenever more could arrive. */}
      {!done ? <div ref={sentinel} aria-hidden className="h-px" /> : null}

      {loading ? (
        <div className="space-y-1.5" aria-live="polite">
          {Array.from({ length: 3 }, (_, i) => (
            <span key={i} className="shimmer block h-12 rounded-[var(--r-btn)]" />
          ))}
        </div>
      ) : status === "CanLoadMore" ? (
        <div className="flex justify-center">
          <Button variant="steel" size="sm" onClick={onMore}>
            Load more
          </Button>
        </div>
      ) : done && count !== undefined && count > 0 ? (
        <p className="text-center text-[11px] text-mute">
          That is all <span className="num">{count}</span> {noun}.
        </p>
      ) : null}
    </div>
  );
}
