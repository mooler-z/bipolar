import { Lightning } from "@phosphor-icons/react";

import { pct, type Side } from "../lib/format";
import type { CountryRow } from "../lib/insights";
import { CountryBoard } from "./CountryBoard";
import { Called, Headline, Layers } from "./result/Parts";
import type { Aggregate, CallVerdict } from "./result/Parts";
import { Chip } from "../ui/Label";
import { Flag } from "../ui/Flag";
import { Split } from "../ui/Panel";

export type { Aggregate, CallVerdict } from "./result/Parts";

type CountryLean = { countryCode: string; lovePct: number; sample: string };

/**
 * A topic's result, on the topic's own page.
 *
 * Where the feed's version is read on the way to the next question, this one is
 * the destination — somebody arrived here from a shared link and came for this
 * question specifically. So it says everything: the headline, both layers, the
 * sentence worth repeating, and the full board with the map under it.
 *
 * The board has two forms, and which one appears is a gate, not a preference.
 * A reader who has voted or paid sees every country split by layer; everyone
 * else sees the public country lean, which never separates the money from the
 * mouth.
 */
export function Result({
  stats,
  countries,
  countriesFull = null,
  mySide,
  myStaked,
  verdict = null,
}: {
  stats: Aggregate;
  countries: CountryLean[];
  /** The full board, once this reader has earned it. */
  countriesFull?: CountryRow[] | null;
  mySide: Side | null;
  myStaked: boolean;
  verdict?: CallVerdict;
}) {
  const [cl] = pct(stats.freeLove, stats.freeHate);

  return (
    <section className="rise">
      {verdict ? (
        <div className="mb-6">
          <Called verdict={verdict} />
        </div>
      ) : null}

      <p className="mb-4 flex flex-wrap items-center gap-2">
        {mySide ? (
          <Chip tone={mySide === "love" ? "love" : "hate"}>
            You {mySide === "love" ? "loved" : "hated"} it
          </Chip>
        ) : (
          <Chip tone="coin">
            <Lightning weight="fill" className="size-3" /> Peeked
          </Chip>
        )}
        {myStaked ? (
          <Chip tone="coin">
            <Lightning weight="fill" className="size-3" /> Backed with a spark
          </Chip>
        ) : null}
      </p>

      <Headline stats={stats} mine={mySide} showAgreement={!verdict} />

      <div className="mt-7">
        <Layers stats={stats} staked={myStaked} />
      </div>

      {countriesFull && countriesFull.length > 0 ? (
        <div className="mt-5">
          <CountryBoard rows={countriesFull} globalLovePct={cl} />
        </div>
      ) : countries.length > 0 ? (
        <div className="mt-8">
          <h3 className="text-base">Around the world</h3>
          <ul className="mt-3 grid gap-3 sm:grid-cols-2">
            {countries.slice(0, 8).map((c) => (
              <li key={c.countryCode} className="flex items-center gap-3">
                <Flag code={c.countryCode} withCode />
                <span className="flex-1">
                  <Split love={c.lovePct} hate={100 - c.lovePct} height={8} />
                </span>
                <span className="num w-10 text-right text-[12px] font-bold">
                  {c.lovePct}%
                </span>
              </li>
            ))}
          </ul>
          <p className="mt-3 text-[12px] text-mute">
            Always public — and never split by layer, which is what stays behind
            the gate.
          </p>
        </div>
      ) : null}
    </section>
  );
}
