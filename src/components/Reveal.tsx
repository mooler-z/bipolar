import { ArrowLeft, ArrowRight, ArrowUUpLeft, ShareNetwork } from "@phosphor-icons/react";

import { pct, type Side } from "../lib/format";
import type { CountryRow } from "../lib/insights";
import { AutoAdvance } from "./AutoAdvance";
import { CountryBoard } from "./CountryBoard";
import { BigNumber } from "./reveal/BigNumber";
import { Called } from "./reveal/Called";
import { Layers } from "./reveal/Layers";
import type { Aggregate, CallVerdict } from "./reveal/types";
import { Button } from "../ui/Button";

export type { Aggregate, CallVerdict };

/**
 * The payoff, in the same frame the question was in.
 *
 * Nothing navigates: the middle column swaps from the ask to the answer, so
 * the eye stays where it was. The verdict on the call comes first because
 * that is what somebody returns for; the detonation next — the winning colour
 * and the number; then the two layers, because keeping the Crowd and the
 * Committed apart is the entire product; then the world, which is the half of
 * a result that actually travels.
 *
 * It enters from the right, over the ground the press just flooded with the
 * winning colour — the answer arriving on top of the question rather than
 * replacing it in place.
 *
 * **The countdown is also the undo window.** While it runs the vote can still
 * be pulled back; when it ends the run moves on and the vote is final. It
 * pauses on a hover and while a comment is being written, so the window lasts
 * exactly as long as the reader is still thinking about it.
 *
 * Everything above scrolls, and **the foot is anchored** exactly where the
 * arena was. On a run the foot carries `Next` and the countdown that presses
 * it for you; on a topic's own page it carries the way back.
 */
export function Reveal({
  question,
  imageUrl,
  stats,
  countries,
  mine,
  staked,
  verdict,
  onNext,
  onBack,
  onPrevious,
  onUndo,
  onShare,
  autoAdvance,
}: {
  question: string;
  imageUrl?: string;
  stats: Aggregate;
  countries: CountryRow[];
  mine: Side | null;
  staked: boolean;
  verdict: CallVerdict;
  onNext?: () => void;
  onBack?: () => void;
  /** One step back through the run. Absent when there is nothing behind you. */
  onPrevious?: () => void;
  /**
   * Take this vote back. Present only while the countdown is still running —
   * once it ends the run has moved on and the vote is final.
   */
  onUndo?: () => void;
  onShare: () => void;
  /** Present when the run should carry itself forward; `paused` while a
      comment is being written. */
  autoAdvance?: { paused: boolean } | null;
}) {
  const [cl] = pct(stats.freeLove, stats.freeHate);
  const won: Side = cl >= 50 ? "love" : "hate";

  return (
    <section className="slide-in flex h-full min-h-0 flex-col">
      <div className="col-scroll flex-1 px-[clamp(1.25rem,3vw,3.5rem)] py-5">
        {verdict ? (
          <div className="mb-4">
            <Called verdict={verdict} />
          </div>
        ) : null}

        <BigNumber stats={stats} mine={mine} question={question} imageUrl={imageUrl} />

        <div className="mt-5">
          <Layers stats={stats} staked={staked} />
        </div>

        {/* The world: the map, the outlier, and the sentence worth repeating.
            Only reachable here because the vote unlocked the full board. */}
        {countries.length > 0 ? (
          <CountryBoard rows={countries} globalLovePct={cl} />
        ) : null}
      </div>

      {/* One row on a phone. Undo loses its word and keeps its colour, Next
          takes the space that is left, and the countdown becomes a hairline
          under the whole foot rather than a third row of its own — three
          stacked rows of controls was most of a small screen. */}
      <footer className="relative flex shrink-0 flex-wrap items-center gap-2 border-t border-line bg-surface/40 px-[clamp(1.25rem,3vw,3.5rem)] py-[clamp(0.75rem,1.6vh,1.1rem)] sm:gap-2.5">
        {/* Orange against the violet: the same size and weight as Next, and
            unmistakably not it. Undo while the vote can still be pulled, and
            one step back through the run once it cannot. */}
        {onUndo ? (
          <Button
            size="lg"
            variant="streak"
            onClick={onUndo}
            title="Take this vote back — until the countdown ends"
            className="shrink-0 max-sm:!px-4"
          >
            <ArrowUUpLeft weight="bold" className="size-4" />
            <span className="max-sm:hidden">Undo</span>
            <kbd className="key !bg-current/15 !text-current !shadow-none max-sm:hidden">
              U
            </kbd>
          </Button>
        ) : onPrevious ? (
          <Button
            size="lg"
            variant="streak"
            onClick={onPrevious}
            aria-label="Back one"
            title="Back one"
            className="shrink-0 !px-5"
          >
            <ArrowLeft weight="bold" className="size-4" />
            <kbd className="key !bg-current/15 !text-current !shadow-none">&larr;</kbd>
          </Button>
        ) : null}

        {onNext ? (
          <Button size="lg" variant="go" onClick={onNext} className="max-sm:flex-1 sm:shrink-0">
            Next topic <ArrowRight weight="bold" className="size-4" />
            <kbd className="key ml-1 !bg-current/15 !text-current !shadow-none max-sm:hidden">
              &rarr;
            </kbd>
          </Button>
        ) : onBack ? (
          <Button size="lg" variant="go" onClick={onBack} className="shrink-0">
            <ArrowLeft weight="bold" className="size-4" /> Back to the run
          </Button>
        ) : null}

        {onNext && autoAdvance ? (
          <AutoAdvance
            side={won}
            paused={autoAdvance.paused}
            onDone={onNext}
            /* A hairline across the top of the foot on a phone; a bar beside
               the buttons on a desk, where there is room for one. */
            className={[
              "max-sm:absolute max-sm:inset-x-0 max-sm:top-0 max-sm:-translate-y-full",
              "max-sm:rounded-none max-sm:border-0 max-sm:!p-0 max-sm:opacity-90",
              "sm:basis-48",
            ].join(" ")}
          />
        ) : (
          <span className="flex-1" />
        )}

        <Button
          variant="ghost"
          size="sm"
          onClick={onShare}
          aria-label="Share"
          className="shrink-0 max-sm:!px-3 sm:ml-0"
        >
          <ShareNetwork weight="fill" className="size-4" />
          <span className="max-sm:hidden">Share</span>
        </Button>
      </footer>
    </section>
  );
}
