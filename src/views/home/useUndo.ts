import { useState } from "react";
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
 * transaction and writes an audit row saying so. When the countdown ends, the
 * vote is final, exactly as Rule 8 requires.
 *
 * Its own module because it is its own concern on both sides of the wire, and
 * because the run hook is at the line budget without it.
 */
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
  /* The side a retraction just pulled back. It lives here because the arena
     that plays the rewind is mounted by the swap it has to survive. */
  const [undone, setUndone] = useState<Side | null>(null);

  async function undo() {
    if (run.busy) return;
    if (run.asking) {
      run.setAsking(null);
      return;
    }
    const cast = run.answer?.topic;
    if (!cast) return;
    run.setBusy(true);
    try {
      const pulled = run.answer!.side;
      await retract({ topicId: cast._id as Id<"topics"> });
      run.setAnswer(null);
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

  return { undone, undo };
}
