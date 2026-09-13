import { ArrowRight, Broadcast, X } from "@phosphor-icons/react";

import type { Side } from "../lib/format";
import type { CountryRow } from "../lib/insights";
import { Decide, type DecideTopic } from "./Decide";
import { Reveal } from "./Reveal";
import type { Aggregate, CallVerdict } from "./result/Parts";
import { Button } from "../ui/Button";

/**
 * The middle column: the question, or the answer to it.
 *
 * Split out of the view because the view's job is state and this one's is the
 * switch between three things — deciding, waiting, and reading — each of which
 * owns the full height of the column.
 *
 * A topic pulled out of the rails gets a band across the top saying so, with
 * the way back to the run in it. Without that, clicking something in `Live`
 * silently replaces the question somebody was mid-thought on and there is no
 * sign anything happened.
 */

export type Result = {
  stats: Aggregate;
  countries: CountryRow[];
  mine: Side | null;
  staked: boolean;
  verdict: CallVerdict;
};

export function Centre({
  topic,
  pulled,
  onRelease,
  result,
  loading,
  resolving,
  armed,
  canSpark,
  sparks,
  busy,
  onArm,
  onPick,
  onSkip,
  onComments,
  onNext,
  onShare,
}: {
  topic: DecideTopic;
  /** True when this topic came from a rail rather than from the run. */
  pulled: boolean;
  onRelease: () => void;
  result: Result | null;
  /** Answered, but the aggregate has not arrived yet. */
  loading: boolean;
  /** Pulled from a rail, and that topic's card has not arrived yet. */
  resolving: boolean;
  armed: boolean;
  canSpark: boolean;
  sparks?: number;
  busy: boolean;
  onArm: (armed: boolean) => void;
  onPick: (side: Side) => void;
  onSkip: () => void;
  onComments: () => void;
  onNext: () => void;
  onShare: () => void;
}) {
  return (
    <div className="flex h-full min-h-0 flex-col">
      {pulled ? (
        <div className="flex shrink-0 items-center gap-2 border-b border-coin/30 bg-coin/8 px-[clamp(1.25rem,3vw,3.5rem)] py-2">
          <Broadcast weight="fill" className="size-3.5 text-coin" />
          <span className="text-[12.5px] font-bold text-coin">
            Pulled from the room
          </span>
          <span className="flex-1" />
          <Button
            bare
            onClick={onRelease}
            className="lift flex items-center gap-1.5 text-[12.5px] font-bold text-coin/80 hover:text-coin"
          >
            Back to the run <X weight="bold" className="size-3.5" />
          </Button>
        </div>
      ) : null}

      <div className="min-h-0 flex-1">
        {resolving ? (
          /* Only this column waits. Tearing the whole console down for a
             loading card is what made pulling a topic look like a reload. */
          <div className="flex h-full flex-col justify-center gap-4 px-[clamp(1.25rem,3vw,3.5rem)]">
            <span className="shimmer h-8 w-40 rounded-[var(--r-pill)]" />
            <span className="shimmer h-20 w-3/4 rounded-[var(--r-btn)]" />
            <span className="shimmer h-28 w-full rounded-[var(--r-card)]" />
          </div>
        ) : result ? (
          <Reveal
            question={topic.question}
            imageUrl={topic.imageUrl}
            stats={result.stats}
            countries={result.countries}
            mine={result.mine}
            staked={result.staked}
            verdict={result.verdict}
            onNext={onNext}
            onShare={onShare}
          />
        ) : loading ? (
          <div className="grid h-full place-items-center gap-5 p-8">
            <span className="shimmer h-40 w-full max-w-xl rounded-[var(--r-card)]" />
            {/* Never a dead end: the vote is already cast and final, so
                moving on is always safe even if the result is slow. */}
            <Button variant="ghost" size="sm" onClick={onNext}>
              Skip the result <ArrowRight className="size-4" />
            </Button>
          </div>
        ) : (
          <Decide
            topic={topic}
            armed={armed}
            canSpark={canSpark}
            sparks={sparks}
            busy={busy}
            onArm={onArm}
            onPick={onPick}
            onSkip={onSkip}
            onComments={onComments}
          />
        )}
      </div>
    </div>
  );
}
