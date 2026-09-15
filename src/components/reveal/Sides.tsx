import { Lightning, Users } from "@phosphor-icons/react";

import { cn } from "../../lib/cn";
import { fmtInt, pct } from "../../lib/format";
import type { Aggregate } from "./types";

/**
 * The two layers, as two halves of one wide slab.
 *
 * Keeping the Crowd and the Committed apart is the whole product, so each gets
 * half the width and its own big number rather than a small bar in a tile.
 * The numbers are set in the colour of whichever side won that layer, which
 * means the slab reads at a glance: two reds is agreement, a red and a cyan
 * is the money going the other way — and when it does, the strip between
 * them says so in gold, because that is the most interesting fact on the
 * page and it is allowed to look like it.
 */
export function Sides({ stats, staked = false }: { stats: Aggregate; staked?: boolean }) {
  const [cl] = pct(stats.freeLove, stats.freeHate);
  const [pl] = pct(stats.paidLove, stats.paidHate);
  const crowd = stats.freeLove + stats.freeHate;
  const paid = stats.paidLove + stats.paidHate;
  const disagree = paid > 0 && cl >= 50 !== pl >= 50;
  const gap = paid > 0 && Math.abs(pl - cl) >= 8;

  return (
    <div className="tile-in overflow-hidden rounded-[var(--r-card)] border border-line bg-surface">
      <div className="grid sm:grid-cols-2">
        <Half
          icon={<Users weight="fill" className="size-4" />}
          name="The Crowd"
          hint="voted for free"
          lovePct={cl}
          votes={crowd}
          className="sm:border-r sm:border-line"
        />
        <Half
          icon={<Lightning weight="fill" className="size-4 text-coin" />}
          name="The Committed"
          hint="paid to be counted"
          lovePct={pl}
          votes={paid}
          empty={paid === 0}
        />
      </div>

      <p
        className={cn(
          "border-t px-5 py-3 text-[13.5px] leading-snug",
          disagree || gap
            ? "border-coin-fill/40 bg-coin-fill/10 text-coin"
            : "border-line bg-surface-2 text-mute",
        )}
      >
        {paid === 0 ? (
          "Nobody has put money behind this yet."
        ) : disagree ? (
          <>
            <span className="font-extrabold">The money went the other way.</span> The crowd
            says <span className="num font-extrabold">{cl}%</span> love; the people who paid say{" "}
            <span className="num font-extrabold">{pl}%</span>.
          </>
        ) : gap ? (
          <>
            Same side, different heat — <span className="num font-extrabold">{cl}%</span> free,{" "}
            <span className="num font-extrabold">{pl}%</span> paid.
          </>
        ) : (
          <>The money agrees with the mouth.{staked ? " You backed this one." : ""}</>
        )}
      </p>
    </div>
  );
}

function Half({
  icon,
  name,
  hint,
  lovePct,
  votes,
  empty = false,
  className,
}: {
  icon: React.ReactNode;
  name: string;
  hint: string;
  lovePct: number;
  votes: number;
  empty?: boolean;
  className?: string;
}) {
  const loves = lovePct >= 50;
  const shown = loves ? lovePct : 100 - lovePct;
  return (
    <div className={cn("flex flex-col gap-3 p-5", className)}>
      <span className="flex items-center gap-2 text-[12.5px] font-extrabold text-ink-3">
        {icon}
        {name}
        <span className="label">· {hint}</span>
      </span>

      {empty ? (
        <span className="display text-[clamp(1.4rem,2.4vw,2rem)] text-mute">Nobody yet</span>
      ) : (
        <span className="flex items-baseline gap-2">
          <span
            className={cn(
              "num display text-[clamp(2.6rem,5vw,4.4rem)] leading-none",
              loves ? "text-love" : "text-hate",
            )}
          >
            {shown}%
          </span>
          <span className={cn("text-[13px] font-extrabold uppercase", loves ? "text-love" : "text-hate")}>
            {loves ? "love" : "hate"}
          </span>
          <span className="num ml-auto text-[12px] font-bold text-mute">{fmtInt(votes)} votes</span>
        </span>
      )}

      <span className="relative h-2 overflow-hidden rounded-full bg-hate-fill/70">
        <span
          className="absolute inset-y-0 left-0 bg-love-fill transition-[width] duration-500"
          style={{ width: `${empty ? 0 : lovePct}%` }}
        />
      </span>
    </div>
  );
}
