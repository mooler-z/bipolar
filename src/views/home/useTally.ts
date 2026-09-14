import { useCallback, useState } from "react";

import type { Side } from "../../lib/format";

/**
 * What this sitting added up to.
 *
 * Read once, at the end, on the caught-up screen. The peak-end rule says a
 * sitting is remembered by how it finishes, and finishing on a record beats
 * finishing on an empty list.
 */
export type Tally = {
  love: number;
  hate: number;
  staked: number;
  right: number;
  wrong: number;
  skipped: number;
};

const EMPTY: Tally = { love: 0, hate: 0, staked: 0, right: 0, wrong: 0, skipped: 0 };

export function useTally() {
  const [tally, setTally] = useState<Tally>(EMPTY);

  const voted = useCallback(
    (side: Side, staked: boolean, correct: boolean | null) => {
      setTally((t) => ({
        ...t,
        [side]: t[side] + 1,
        staked: t.staked + (staked ? 1 : 0),
        right: t.right + (correct === true ? 1 : 0),
        wrong: t.wrong + (correct === false ? 1 : 0),
      }));
    },
    [],
  );

  const skipped = useCallback((delta: 1 | -1) => {
    setTally((t) => ({ ...t, skipped: Math.max(0, t.skipped + delta) }));
  }, []);

  return { tally, voted, skipped, reset: useCallback(() => setTally(EMPTY), []) };
}
