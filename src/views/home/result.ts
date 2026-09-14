import type { FunctionReturnType } from "convex/server";

import type { api } from "../../../convex/_generated/api";
import type { CallVerdict, Result } from "../../components/reveal/types";
import type { Side } from "../../lib/format";

type Page = NonNullable<FunctionReturnType<typeof api.topics.bySlug>>;

/**
 * The reveal's payload, assembled from the one query that carries an aggregate.
 *
 * Two ways to arrive at a result and they read differently. A vote just cast
 * knows its own side, its own stake and how the call was graded, all held from
 * the moment of the press. A topic pulled out of a rail was answered some time
 * ago, so the side has to be read back off the viewer's row and there is no
 * verdict to show — the call it was graded against is long gone.
 *
 * Pure, and out of the hook, because this is the one piece of that state
 * machine with no state in it.
 */
export function toResult(
  page: Page | null | undefined,
  answer: { side: Side; staked: boolean; verdict: CallVerdict } | null,
  pulled: boolean,
): Result | null {
  const stats = page?.topic.stats ?? null;
  if (!stats) return null;
  const countries = page?.countriesFull ?? [];

  if (answer) {
    return {
      stats,
      countries,
      mine: answer.side,
      staked: answer.staked,
      verdict: answer.verdict,
    };
  }
  if (!pulled) return null;

  return {
    stats,
    countries,
    mine: (page?.viewer.votedPaid ?? page?.viewer.votedFree ?? null) as Side | null,
    staked: page?.viewer.votedPaid != null,
    verdict: null,
  };
}
