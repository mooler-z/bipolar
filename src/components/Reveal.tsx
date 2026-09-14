import { ArrowLeft, ArrowRight, ShareNetwork } from "@phosphor-icons/react";

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
  onShare: () => void;
  /** Present when the run should carry itself forward; `paused` while a
      comment is being written. */
  autoAdvance?: { paused: boolean } | null;
}) {
  const [cl] = pct(stats.freeLove, stats.freeHate);
  const won: Side = cl >= 50 ? "love" : "hate";

  return (
    <section className="rise flex h-full min-h-0 flex-col">
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

      <footer className="flex shrink-0 flex-wrap items-center gap-3 border-t border-line bg-surface/40 px-[clamp(1.25rem,3vw,3.5rem)] py-[clamp(0.75rem,1.6vh,1.1rem)]">
        {onNext ? (
          <Button size="lg" variant="go" onClick={onNext} className="shrink-0">
            Next topic <ArrowRight weight="bold" className="size-4" />
            <kbd className="key ml-1 !bg-current/15 !text-current !shadow-none">N</kbd>
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
            // Its own line under the buttons on a phone, beside them on a desk.
            className="order-last basis-full sm:order-none sm:basis-48"
          />
        ) : (
          <span className="flex-1" />
        )}

        <Button variant="ghost" size="sm" onClick={onShare} className="ml-auto shrink-0 sm:ml-0">
          <ShareNetwork weight="fill" className="size-4" /> Share
        </Button>
      </footer>
    </section>
  );
}
