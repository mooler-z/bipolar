import { ArrowLeft, ArrowRight, ArrowUUpLeft, ShareNetwork } from "@phosphor-icons/react";

import { pct, type Side } from "../lib/format";
import type { CountryRow } from "../lib/insights";
import { AutoAdvance } from "./AutoAdvance";
import { Atlas } from "./reveal/Atlas";
import { BigNumber } from "./reveal/BigNumber";
import { Called } from "./reveal/Called";
import { Sides } from "./reveal/Sides";
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
      {/* Room to breathe on a phone. Everything below stacks there, and the
          desk's tight rhythm — built for a column with height to spare —
          reads as a pile when it is one card after another down a screen. */}
      <div className="col-scroll flex-1 px-[clamp(1.25rem,3vw,3.5rem)] py-6 sm:py-5">
        {verdict ? (
          <div className="mb-5 sm:mb-4">
            <Called verdict={verdict} />
          </div>
        ) : null}

        <BigNumber stats={stats} mine={mine} question={question} imageUrl={imageUrl} />

        <div className="mt-7 sm:mt-5">
          <Sides stats={stats} staked={staked} />
        </div>

        {/* The world: the map, the outlier, and the sentence worth repeating.
            Only reachable here because the vote unlocked the full board. */}
        {countries.length > 0 ? (
          <div className="mt-7 sm:mt-5">
            <Atlas rows={countries} globalLovePct={cl} />
          </div>
        ) : null}
      </div>

      {/* Undo loses its word on a phone and keeps its colour, and Next takes
          the space that is left. The countdown used to be pulled up out of
          this foot and sat over the result with nothing behind it — a strip of
          red segments floating across a map. It is a row *inside* the foot
          now, on the foot's own ground, above the buttons. */}
      <footer className="relative flex shrink-0 flex-wrap items-center gap-2 border-t border-line bg-surface/40 px-[clamp(1.25rem,3vw,3.5rem)] py-3 sm:gap-2.5 sm:py-[clamp(0.75rem,1.6vh,1.1rem)]">
        {/* Hollow against the solid: the same violet and the same size as
            Next, and still unmistakably not it. Both belong to the same step
            of the run, which is what the shared hue says; one is the way on
            and one is the way back, which is what the outline says. Undo while
            the vote can still be pulled, and one step back through the run
            once it cannot. */}
        {onUndo ? (
          <Button
            size="lg"
            variant="hollow"
            onClick={onUndo}
            title="Take this vote back — until the countdown ends"
            className="shrink-0 max-sm:!min-h-11 max-sm:!px-3.5"
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
            variant="hollow"
            onClick={onPrevious}
            aria-label="Back one"
            title="Back one"
            className="shrink-0 !px-5 max-sm:!min-h-11 max-sm:!px-3.5"
          >
            <ArrowLeft weight="bold" className="size-4" />
            <kbd className="key !bg-current/15 !text-current !shadow-none">&larr;</kbd>
          </Button>
        ) : null}

        {/* Smaller on a phone, and never wrapping. At the desk's size the
            label broke across two lines inside its own button, which is what
            made the foot read as stacked. */}
        {onNext ? (
          <Button
            size="lg"
            variant="go"
            onClick={onNext}
            className="max-sm:!min-h-11 max-sm:flex-1 max-sm:!px-4 max-sm:!text-[13px] max-sm:whitespace-nowrap sm:shrink-0"
          >
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
            /* Its own row on a phone, inside the foot and on the foot's own
               ground; a bar beside the buttons on a desk, where there is room
               for one. `basis-full` rather than `w-full`, because the
               component sets `flex-1` on itself — `flex: 1 1 0%` — and a
               basis of zero beats any width you put next to it, which is why
               it went on sharing the buttons' row instead of taking its own. */
            className={[
              "max-sm:order-first max-sm:mb-1.5 max-sm:!flex-none max-sm:!basis-full",
              "max-sm:rounded-[var(--r-btn)] max-sm:border max-sm:border-line",
              "max-sm:bg-surface-2 max-sm:px-2.5 max-sm:py-1.5",
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
