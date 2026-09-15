import { forwardRef, useEffect, useState, type ReactNode } from "react";
import { ArrowRight, Broadcast, X } from "@phosphor-icons/react";

import type { Side } from "../lib/format";
import type { ArenaHandle } from "./Arena";
import { Decide, type DecideTopic } from "./Decide";
import type { Tour } from "../lib/keyTutor";
import { Reveal } from "./Reveal";
import type { Result } from "./reveal/types";
import { Button } from "../ui/Button";

export type { Result };

/**
 * The middle column: the question, or the answer to it.
 *
 * Split out of the view because the view's job is state and this one's is the
 * switch between three things — deciding, waiting, and reading — each of which
 * owns the full height of the column.
 *
 * A topic pulled out of the rails gets a gold band across the top saying so,
 * with the way back to the run in it. Without that, clicking something in the
 * room silently replaces the question somebody was mid-thought on and there
 * is no sign anything happened.
 */
export const Centre = forwardRef<
  ArenaHandle,
  {
    topic: DecideTopic;
    /** True when this topic came from a rail rather than from the run. */
    pulled: boolean;
    /** …and it came from a shared link rather than from a rail. */
    linked?: boolean;
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
    /** A comment is being written: the countdown must wait. */
    composing: boolean;
    /** The way to the next panel, on a phone. Shown in the decision's foot. */
    hint?: ReactNode;
    /** The keyboard walkthrough, run in the decision's foot. */
    tour?: Tour;
    /** Anything under the arena — the peek, on a topic somebody came to. */
    extra?: ReactNode;
    /** A pressed-but-uncast vote. Takes the arena's place while it is open. */
    pending?: ReactNode;
    onArm: (armed: boolean) => void;
    onPick: (side: Side) => void;
    onSkip: () => void;
    /** One step back through the run. Absent when there is nothing behind. */
    onBack?: () => void;
    /** Take the cast vote back, while the countdown still allows it. */
    onUndo?: () => void;
    /** The side a retraction just pulled back. The arena comes back holding
        the board and gives it up. */
    undone?: Side | null;
    onComments: () => void;
    onGetSparks: () => void;
    onNext: () => void;
    onShare: () => void;
  }
>(function Centre(
  {
    topic, pulled, linked = false, onRelease, result, loading, resolving, armed, canSpark, sparks,
    busy, composing, hint, tour, extra, pending, undone, onArm, onPick, onSkip, onBack, onUndo, onComments, onGetSparks, onNext, onShare,
  },
  ref,
) {
  /* The band is an announcement, not a status: it exists to say the question
     changed because you clicked something. Three seconds is long enough to be
     read and short enough not to become furniture over the answer. The way
     back to the run lives on the keyboard (escape) and in the room's own row
     either way. */
  const [banner, setBanner] = useState(false);
  useEffect(() => {
    if (!pulled) return setBanner(false);
    setBanner(true);
    const out = window.setTimeout(() => setBanner(false), 3000);
    return () => window.clearTimeout(out);
  }, [pulled, topic.slug]);

  return (
    <div className="flex h-full min-h-0 flex-col">
      {banner ? (
        <div className="slide-up flex shrink-0 items-center gap-2 bg-coin-fill px-[clamp(1.25rem,3vw,3.5rem)] py-1.5 text-on-coin">
          <Broadcast weight="fill" className="size-3.5" />
          <span className="text-[12.5px] font-extrabold">
            {linked ? "Opened from a link" : "Pulled from the room"}
          </span>
          <span className="flex-1" />
          <Button
            bare
            onClick={onRelease}
            className="lift flex items-center gap-1.5 text-[12.5px] font-extrabold hover:opacity-70"
          >
            {linked ? "Join the run" : "Back to the run"}{" "}
            <X weight="bold" className="size-3.5" />
            <kbd className="key !bg-current/15 !text-current !shadow-none">esc</kbd>
          </Button>
        </div>
      ) : null}

      <div className="min-h-0 flex-1 overflow-hidden">
        {resolving ? (
          <div className="flex h-full flex-col justify-center gap-4 px-[clamp(1.25rem,3vw,3.5rem)]">
            <span className="shimmer h-8 w-40 rounded-[var(--r-pill)]" />
            <span className="shimmer h-24 w-3/4 rounded-[var(--r-btn)]" />
            <span className="shimmer h-36 w-full rounded-[var(--r-card)]" />
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
            // A topic pulled from the room was answered some time ago; nothing
            // should carry the reader away from something they chose to look at.
            onPrevious={onBack}
            onUndo={onUndo}
            autoAdvance={pulled ? null : { paused: composing }}
          />
        ) : loading ? (
          /* The reveal's own shape, as placeholders, so the column does not
             collapse to a spinner between the press and the number. */
          <div className="flex h-full flex-col px-[clamp(1.25rem,3vw,3.5rem)] py-5">
            <span className="shimmer h-[clamp(14rem,34vh,22rem)] w-full rounded-[var(--r-card)]" />
            <span className="mt-5 grid gap-3 sm:grid-cols-2">
              <span className="shimmer h-24 rounded-[var(--r-card)]" />
              <span className="shimmer h-24 rounded-[var(--r-card)]" />
            </span>
            <span className="shimmer mt-5 h-40 w-full rounded-[var(--r-card)]" />
            <span className="flex-1" />
            {/* Never a dead end: the vote is already cast and final, so moving
                on is always safe even if the result is slow. */}
            <span className="flex justify-center pt-4">
              <Button variant="ghost" size="sm" onClick={onNext}>
                Skip the result <ArrowRight className="size-4" />
              </Button>
            </span>
          </div>
        ) : (
          <Decide
            ref={ref}
            topic={topic}
            armed={armed}
            canSpark={canSpark}
            sparks={sparks}
            busy={busy}
            onArm={onArm}
            onPick={onPick}
            onSkip={onSkip}
            onBack={onBack}
            /* Only here when there is no reveal to carry it. */
            onUndo={onUndo}
            onComments={onComments}
            onGetSparks={onGetSparks}
            hint={hint}
            tour={tour}
            extra={extra}
            pending={pending}
            restoring={undone}
          />
        )}
      </div>
    </div>
  );
});
