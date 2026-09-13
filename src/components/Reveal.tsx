import { ArrowRight, ShareNetwork } from "@phosphor-icons/react";

import { pct, type Side } from "../lib/format";
import type { CountryRow } from "../lib/insights";
import { CountryBoard } from "./CountryBoard";
import { Called, Headline, Layers } from "./result/Parts";
import type { Aggregate, CallVerdict } from "./result/Parts";
import { Button } from "../ui/Button";
import { Thumb } from "../ui/Thumb";

export type { Aggregate, CallVerdict };

/**
 * The payoff, in the same frame the question was in.
 *
 * Nothing navigates: the middle column swaps from the ask to the answer, so the
 * eye stays where it was. The verdict on the call comes first because that is
 * what somebody returns for; the two layers next, because keeping the Crowd and
 * the Committed apart is the entire product; then the world, which is the half
 * of a result that actually travels.
 *
 * Two bands, matching the question's: everything above scrolls, and **`Next`
 * is anchored to the foot** exactly where the answers were. A result with a map
 * under it is long, and a next button you have to scroll down to find is the
 * one thing that reliably ends a run.
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
  onShare,
}: {
  question: string;
  imageUrl?: string;
  stats: Aggregate;
  countries: CountryRow[];
  mine: Side | null;
  staked: boolean;
  verdict: CallVerdict;
  onNext: () => void;
  onShare: () => void;
}) {
  const [cl] = pct(stats.freeLove, stats.freeHate);

  return (
    <section className="rise flex h-full min-h-0 flex-col">
      <div
        className="col-scroll flex flex-1 flex-col px-[clamp(1.25rem,3vw,3.5rem)] py-8"
        // Centres a short result, and starts at the top once one is tall
        // enough to overflow — plain `center` would put the first line out of
        // reach above the scroll origin.
        style={{ justifyContent: "safe center" }}
      >
        <div className="w-full">
          {verdict ? (
            <div className="mb-6">
              <Called verdict={verdict} />
            </div>
          ) : null}

          <p className="flex items-center gap-3 text-[15px] leading-snug text-mute">
            <Thumb
              src={imageUrl}
              alt=""
              rounded="rounded-[8px]"
              className="size-10"
            />
            <span className="min-w-0">{question}</span>
          </p>

          <div className="mt-4">
            <Headline stats={stats} mine={mine} showAgreement={!verdict} />
          </div>

          <div className="mt-6">
            <Layers stats={stats} staked={staked} />
          </div>

          {/* The world: the map, the outlier, and the sentence worth repeating.
              Only reachable here because the vote unlocked the full board. */}
          {countries.length > 0 ? (
            <CountryBoard rows={countries} globalLovePct={cl} />
          ) : null}
        </div>
      </div>

      <footer className="flex shrink-0 items-center gap-3 border-t border-line bg-surface/40 px-[clamp(1.25rem,3vw,3.5rem)] py-[clamp(0.75rem,1.6vh,1.1rem)]">
        <Button size="lg" variant="go" onClick={onNext}>
          Next topic <ArrowRight className="size-4" />
          <kbd className="ml-1 text-[11px] opacity-70">N</kbd>
        </Button>
        <Button variant="ghost" size="sm" onClick={onShare}>
          <ShareNetwork className="size-4" /> Share
        </Button>
      </footer>
    </section>
  );
}
