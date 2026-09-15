import { useEffect, useRef, useState } from "react";
import { useMutation } from "convex/react";

import { api } from "../../../convex/_generated/api";
import type { Id } from "../../../convex/_generated/dataModel";
import type { Side } from "../../lib/format";
import type { Card } from "./useRun";

/**
 * Taking the vote back. Two shapes, one word.
 *
 * Before the cast it is local and costs nothing — the call step is the pending
 * window, and nothing has reached the server yet. After it, while the countdown
 * to the next question runs, it is a real retraction: `convex/retract.ts` pulls
 * the vote, both sets of counters, the call and the spark back out in one
 * transaction and writes an audit row saying so. When the window closes the
 * vote is final, exactly as Rule 8 requires.
 *
 * **The window is the countdown, or nine seconds when there is no countdown.**
 * A reader who skips the result has no reveal to sit under and no countdown to
 * watch, so the offer used to follow them through the whole run — an undo on
 * the twelfth question that would retract the first. Nine seconds is about as
 * long as "wait, no" takes.
 *
 * **It only ever offers the vote it is holding**, and the two shapes are
 * reported separately because they are answerable in different places.
 * `answeredId` is the vote under the reveal on screen — the caller matches it
 * against the topic actually showing, so stepping back to an old result shows
 * nothing to undo, those votes being long final. `skippedId` is the one with
 * no reveal to sit under: it is already bounded by its own nine seconds, so it
 * follows the reader to the foot of the *next* question, which is the whole
 * reason it exists.
 *
 * Folding those two into one id is what broke it. The skipped vote is by
 * definition never the topic on screen — banking it is what put the next
 * question there — so matching it against that topic was always false, and the
 * button never appeared at all.
 */

/** How long an undo stands when there is no countdown to measure it against. */
export const SKIPPED_UNDO_MS = 9_000;

export function useUndo(run: {
  answer: { topic: Card; side: Side } | null;
  asking: Side | null;
  busy: boolean;
  setAnswer: (answer: null) => void;
  setAsking: (side: Side | null) => void;
  setBusy: (busy: boolean) => void;
  setError: (message: string) => void;
  setFront: (card: Card) => void;
}) {
  const retract = useMutation(api.retract.vote);
  /* The vote cast by a reader who skipped the result. There is no reveal to
     put an undo under, so it follows them to the foot of the next question —
     the same retraction, one screen later, for nine seconds. */
  const [lastCast, setLastCast] = useState<{ topic: Card; side: Side } | null>(null);
  /* The side a retraction just pulled back. It lives here because the arena
     that plays the rewind is mounted by the swap it has to survive. */
  const [undone, setUndone] = useState<Side | null>(null);
  const closing = useRef<number | undefined>(undefined);

  useEffect(() => () => window.clearTimeout(closing.current), []);

  /** Hold a vote whose result was skipped past, and start its window closing. */
  function noteCast(cast: { topic: Card; side: Side }) {
    window.clearTimeout(closing.current);
    setLastCast(cast);
    closing.current = window.setTimeout(() => setLastCast(null), SKIPPED_UNDO_MS);
  }

  function forget() {
    window.clearTimeout(closing.current);
    setLastCast(null);
  }

  async function undo() {
    if (run.busy) return;
    if (run.asking) {
      run.setAsking(null);
      return;
    }
    /* Either shape of "the vote I just cast": the one under the result, or
       the one the reader skipped past. Both are the same retraction. */
    const held = run.answer ?? lastCast;
    const cast = held?.topic;
    if (!cast) return;
    run.setBusy(true);
    try {
      const pulled = held!.side;
      await retract({ topicId: cast._id as Id<"topics"> });
      run.setAnswer(null);
      forget();
      setUndone(pulled);
      window.setTimeout(() => setUndone(null), 1015);
      // Straight back to the question, ahead of the queue, ready to be
      // answered again — which is the whole point of taking it back.
      run.setFront(cast);
    } catch (e) {
      run.setError(e instanceof Error ? e.message : String(e));
    } finally {
      run.setBusy(false);
    }
  }

  return {
    undone,
    undo,
    /**
     * The vote under the reveal on screen, or null. The caller matches it
     * against what is showing: an old result revisited is not this one.
     */
    answeredId: (run.answer?.topic._id ?? null) as string | null,
    /**
     * A vote whose result was skipped past, still inside its nine seconds.
     * Never the topic on screen — banking it is what put the next question
     * there — so the caller bounds it by where the reader is, not by which
     * card it names.
     */
    skippedId: (lastCast?.topic._id ?? null) as string | null,
    /** Remember a vote whose result was skipped past. */
    noteCast,
  };
}
