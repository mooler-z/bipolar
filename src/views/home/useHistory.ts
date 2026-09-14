import { useCallback, useState } from "react";

import type { Card } from "./useRun";

/**
 * Where you have been in this run.
 *
 * A run that only moves forward punishes one stray keystroke, and skipping is
 * one keystroke. So everything left behind is kept — skipped and answered
 * alike — and going back is one idea rather than two: a skipped question comes
 * back to be answered, an answered one comes back to be read again.
 *
 * It holds no opinion about *how* either of those happens. The caller decides,
 * because putting a question back in front of you and reopening a result are
 * different moves through the same stack.
 */
export type Past = { card: Card; answered: boolean };

export function useHistory() {
  const [past, setPast] = useState<Past[]>([]);

  const push = useCallback((card: Card, answered: boolean) => {
    setPast((h) => [...h, { card, answered }]);
  }, []);

  /* Read `newest`, then `drop()`. A pop that both read and wrote through the
     updater would be reading a value React had not committed yet. */
  const drop = useCallback(() => setPast((h) => h.slice(0, -1)), []);

  const clear = useCallback(() => setPast([]), []);

  return { any: past.length > 0, newest: past[past.length - 1] ?? null, push, drop, clear };
}
