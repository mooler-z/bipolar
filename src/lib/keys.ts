import { useEffect } from "react";

import type { Side } from "./format";

/**
 * The keyboard path through a run.
 *
 * A desktop has keys, so voting has to be possible without the mouse ever
 * leaving the rails — L/H answer, S passes, space arms the spark, N takes the
 * next one, escape puts a pulled topic back. Lives outside the view because a
 * view with a reducer-sized effect at the bottom of it stops being readable.
 *
 * The handler is re-bound every render on purpose: it closes over live state,
 * and a stale closure here would vote on the previous topic.
 */
export function useRunKeys({
  answered,
  asking,
  canSpark,
  pulled = false,
  onPick,
  onSkip,
  onArm,
  onNext,
  onRelease,
}: {
  answered: boolean;
  asking: boolean;
  canSpark: boolean;
  pulled?: boolean;
  onPick: (side: Side) => void;
  onSkip?: () => void;
  onArm: () => void;
  onNext: () => void;
  onRelease?: () => void;
}) {
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.metaKey || e.ctrlKey || e.altKey) return;
      const el = e.target as HTMLElement | null;
      if (el && (el.tagName === "INPUT" || el.tagName === "TEXTAREA")) return;

      const k = e.key.toLowerCase();
      if (k === "escape" && pulled && onRelease) {
        e.preventDefault();
        onRelease();
        return;
      }
      if (answered) {
        if (k === "n" || k === "enter") {
          e.preventDefault();
          onNext();
        }
        return;
      }
      if (asking) return;

      if (k === "l" || k === "arrowleft") {
        e.preventDefault();
        onPick("love");
      } else if (k === "h" || k === "arrowright") {
        e.preventDefault();
        onPick("hate");
      } else if (k === "s" && onSkip) {
        e.preventDefault();
        onSkip();
      } else if (k === " ") {
        e.preventDefault();
        if (canSpark) onArm();
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  });
}
