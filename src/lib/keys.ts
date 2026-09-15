import { useEffect } from "react";

import type { Side } from "./format";
import type { KeyName } from "./keyTutor";

/**
 * The keyboard path through a run, and through a topic's own page.
 *
 * A desktop has keys, so voting has to be possible without the mouse ever
 * leaving the rails. Two families, deliberately:
 *
 *   **Letters answer.** `L` loves, `H` hates, `space` puts a spark on it,
 *   `U` takes a pending vote back. These are the ones printed on the controls.
 *
 *   **Arrows move.** `→` goes forward — skip the question, or next once it is
 *   answered. `←` goes back, all the way through: it takes a vote back — the
 *   pending one, or the one just cast while its countdown is still running —
 *   and otherwise steps to whatever you last left.
 *   They used to vote, which put "forward" and "love" on the same key and made
 *   an arrow the most dangerous thing on the keyboard.
 *
 * Lives outside the view because a view with a reducer-sized effect at the
 * bottom of it stops being readable. The handler is re-bound every render on
 * purpose: it closes over live state, and a stale closure here would vote on
 * the previous topic.
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
  onUndo,
  onBack,
  onUsed,
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
  /** Take back a pending vote, while there is one to take back. */
  onUndo?: () => void;
  /** Put the last skipped question back in front. */
  onBack?: () => void;
  /** A key that did something. The tutor stops teaching it. */
  onUsed?: (key: KeyName) => void;
}) {
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.metaKey || e.ctrlKey || e.altKey) return;
      const el = e.target as HTMLElement | null;
      if (el && (el.tagName === "INPUT" || el.tagName === "TEXTAREA")) return;

      const k = e.key.toLowerCase();

      // A pending vote outranks everything: U, the left arrow or escape takes
      // it back, and nothing else is allowed through until it is resolved.
      if (asking) {
        if (k === "u" || k === "arrowleft" || k === "escape") {
          e.preventDefault();
          if (k === "u") onUsed?.("u");
          onUndo?.();
        }
        return;
      }

      if (k === "escape" && pulled && onRelease) {
        e.preventDefault();
        onRelease();
        return;
      }

      if (answered) {
        if (k === "n" || k === "enter" || k === "arrowright") {
          e.preventDefault();
          onUsed?.(k === "arrowright" ? "right" : "enter");
          onNext();
        } else if ((k === "u" || k === "arrowleft") && onUndo) {
          // The countdown is the undo window; while it runs, back means undo.
          e.preventDefault();
          onUsed?.(k === "u" ? "u" : "left");
          onUndo();
        } else if (k === "arrowleft" && onBack) {
          e.preventDefault();
          onUsed?.("left");
          onBack();
        }
        return;
      }

      if (k === "l") {
        e.preventDefault();
        onUsed?.("l");
        onPick("love");
      } else if (k === "h") {
        e.preventDefault();
        onUsed?.("h");
        onPick("hate");
      } else if ((k === "s" || k === "arrowright") && onSkip) {
        e.preventDefault();
        if (k === "arrowright") onUsed?.("right");
        onSkip();
      } else if (k === "u" && onUndo) {
        // A reader who skips the result has no reveal to press undo on, so
        // the key follows the vote to the next question. Only `U`: the left
        // arrow still means "back through the run" here.
        e.preventDefault();
        onUsed?.("u");
        onUndo();
      } else if (k === "arrowleft" && onBack) {
        e.preventDefault();
        onUsed?.("left");
        onBack();
      } else if (k === " ") {
        e.preventDefault();
        if (canSpark) {
          onUsed?.("space");
          onArm();
        }
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  });
}
