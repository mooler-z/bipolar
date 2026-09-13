import { Check, Fire, Lightning, X } from "@phosphor-icons/react";

import { cn } from "../../lib/cn";
import { fmtInt, fmtMoney, pct, type Side } from "../../lib/format";
import { verdictOf } from "../../lib/insights";
import { useCountUp } from "../../lib/motion";
import { Burst } from "../../ui/Burst";
import { Label } from "../../ui/Label";
import { Split } from "../../ui/Panel";

/**
 * The pieces a result is made of, shared by the feed and by a topic's own page.
 *
 * They were written twice and drifted immediately — one showed the money line,
 * the other did not — which is exactly the bug a shared file prevents. The two
 * layers in particular must never differ: keeping the Crowd and the Committed
 * apart is the product, and a second implementation is a second chance to merge
 * them by accident.
 */

export type Aggregate = {
  freeLove: number;
  freeHate: number;
  paidLove: number;
  paidHate: number;
  stakedCents: number;
};

export type CallVerdict = {
  called: string;
  crowdWent: string;
  correct: boolean;
  crowdPct: number;
  streak: number;
  bestStreak: number;
} | null;

/**
 * The reveal on a call.
 *
 * This goes above the numbers and takes the width: right or wrong, by how much,
 * and what it did to the streak. A chart is information; a verdict is the thing
 * somebody comes back for.
 */
export function Called({ verdict }: { verdict: NonNullable<CallVerdict> }) {
  const { correct, called, crowdWent, crowdPct, streak } = verdict;
  const shown = useCountUp(crowdPct, 800);

  return (
    <div
      className={cn(
        "relative flex items-center gap-3.5 rounded-[var(--r-card)] border p-4",
        correct ? "burst sweep border-go/40 bg-go/12" : "shake card",
      )}
    >
      {correct ? <Burst colours={["#58cc02", "#ffc800", "#ff4b4b"]} /> : null}

      <span className="relative grid size-11 shrink-0 place-items-center">
        {correct ? (
          <span
            aria-hidden
            className="ping-ring absolute inset-0 rounded-full text-go"
          />
        ) : null}
        <span
          className={cn(
            "pop-in grid size-11 place-items-center rounded-full",
            correct ? "bg-go text-black" : "bg-surface-3 text-mute",
          )}
        >
          {correct ? (
            <Check weight="bold" className="size-6" />
          ) : (
            <X weight="bold" className="size-5" />
          )}
        </span>
      </span>

      <span className="min-w-0 flex-1">
        <span
          className={cn(
            "display block text-[clamp(1.2rem,1.7vw,1.7rem)]",
            correct ? "text-go" : "text-ink-2",
          )}
        >
          {correct ? "You read the room" : "You misread the room"}
        </span>
        <span className="text-[13px] text-mute">
          You called <strong className="text-ink-3">{called}</strong> · it went{" "}
          <strong className={crowdWent === "love" ? "text-love" : "text-hate"}>
            {crowdWent}
          </strong>{" "}
          by <span className="num font-bold text-ink">{shown}%</span>
        </span>
      </span>

      {streak > 1 ? (
        <span className="chip shrink-0 !bg-streak/15 !px-3 !py-1.5 !text-[13px] !text-streak">
          <Fire weight="fill" className="size-4 flicker" />
          <span className="num font-bold">{streak}</span>
        </span>
      ) : null}
    </div>
  );
}

/** The headline figure, and the two counts that qualify it. */
export function Headline({
  stats,
  mine,
  showAgreement = true,
}: {
  stats: Aggregate;
  mine: Side | null;
  showAgreement?: boolean;
}) {
  const [cl] = pct(stats.freeLove, stats.freeHate);
  const crowd = stats.freeLove + stats.freeHate;
  const paid = stats.paidLove + stats.paidHate;
  const won: Side = cl >= 50 ? "love" : "hate";
  const big = useCountUp(won === "love" ? cl : 100 - cl, 900);
  const agreed = mine === won;

  return (
    <div className="flex flex-wrap items-end gap-x-10 gap-y-4">
      <span>
        <span
          className={cn(
            "display num block text-[clamp(4rem,7vw,7.5rem)] leading-[0.85]",
            won === "love" ? "text-love" : "text-hate",
          )}
        >
          {big}
          <span className="text-[0.4em]">%</span>
        </span>
        <Label>said {won}</Label>
      </span>

      <span>
        <span className="display num block text-[clamp(1.5rem,2.2vw,2.25rem)]">
          {fmtInt(crowd + paid)}
        </span>
        <Label>votes</Label>
      </span>

      <span>
        <span className="display num block text-[clamp(1.5rem,2.2vw,2.25rem)] text-coin">
          {fmtMoney(stats.stakedCents)}
        </span>
        <Label>staked</Label>
      </span>

      <span className="chip !bg-surface-3 !px-3 !py-1.5 !text-[13px]">
        {verdictOf(stats.freeLove, stats.freeHate).label}
      </span>

      {showAgreement && mine ? (
        <span
          className={cn(
            "chip !px-3 !py-1.5 !text-[13px]",
            agreed ? "!bg-go/15 !text-go" : "!bg-coin/15 !text-coin",
          )}
        >
          {agreed ? "With the majority" : "Contrarian"}
        </span>
      ) : null}
    </div>
  );
}

function Layer({
  name,
  hint,
  love,
  hate,
  coin = false,
}: {
  name: string;
  hint: string;
  love: number;
  hate: number;
  coin?: boolean;
}) {
  const total = love + hate;
  return (
    <div className="card p-4">
      <div className="mb-2.5 flex items-baseline gap-2">
        {coin ? <Lightning weight="fill" className="size-4 text-coin" /> : null}
        <span className="text-[14px] font-bold">{name}</span>
        <span className="label">{hint}</span>
        <span className="flex-1" />
        <span className="num text-[12px] text-mute">{fmtInt(total)}</span>
      </div>
      {total === 0 ? (
        <Label>Nobody yet</Label>
      ) : (
        <Split love={love} hate={hate} height={12} labels />
      )}
    </div>
  );
}

/** The two layers, and the one sentence that compares them. */
export function Layers({
  stats,
  staked = false,
}: {
  stats: Aggregate;
  staked?: boolean;
}) {
  const [cl] = pct(stats.freeLove, stats.freeHate);
  const [pl] = pct(stats.paidLove, stats.paidHate);
  const paid = stats.paidLove + stats.paidHate;

  return (
    <>
      <div className="grid gap-3 sm:grid-cols-2">
        <Layer
          name="The Crowd"
          hint="free votes"
          love={stats.freeLove}
          hate={stats.freeHate}
        />
        <Layer
          name="The Committed"
          hint="paid to be counted"
          love={stats.paidLove}
          hate={stats.paidHate}
          coin
        />
      </div>

      {paid > 0 ? (
        <p className="mt-3 text-[13px] text-mute">
          <Lightning
            weight="fill"
            className="mr-1 inline size-3.5 align-text-bottom text-coin"
          />
          The money says <span className="num font-bold text-coin">{pl}%</span>{" "}
          love, the crowd says{" "}
          <span className="num font-bold text-ink-3">{cl}%</span>
          {Math.abs(pl - cl) >= 8 ? " — they disagree." : " — they agree."}
          {staked ? " You backed this one." : ""}
        </p>
      ) : (
        <p className="mt-3 text-[13px] text-mute">
          Nobody has put money behind this yet.
        </p>
      )}
    </>
  );
}
