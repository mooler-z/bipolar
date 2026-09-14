import { Lightning, Users } from "@phosphor-icons/react";

import { cn } from "../../lib/cn";
import { fmtInt, fmtMoney, pct, type Side } from "../../lib/format";
import { verdictOf } from "../../lib/insights";
import { useCountUp } from "../../lib/motion";
import { Stamp } from "../../ui/Stamp";
import { Thumb } from "../../ui/Thumb";
import type { Aggregate } from "./types";

/**
 * The detonation.
 *
 * The winning side's colour floods a panel the width of the column, with a
 * white flash that fades as it lands. The percentage rolls up past its value
 * and settles — thrown, not typed — and the verdict stamps down a beat later.
 * The word bleeds out of the corner as a watermark; the picture stands flush
 * on the panel's floor, never floating.
 *
 * Under the panel, the counterpoint: the side that lost, and the counts that
 * qualify the headline. Money counts up plainly and never overshoots.
 */
export function BigNumber({
  stats,
  mine,
  question,
  imageUrl,
}: {
  stats: Aggregate;
  mine: Side | null;
  question: string;
  imageUrl?: string;
}) {
  const [cl] = pct(stats.freeLove, stats.freeHate);
  const won: Side = cl >= 50 ? "love" : "hate";
  const winPct = won === "love" ? cl : 100 - cl;
  const big = useCountUp(winPct, 1100, true);
  const votes = useCountUp(
    stats.freeLove + stats.freeHate + stats.paidLove + stats.paidHate,
    800,
  );
  const staked = useCountUp(stats.stakedCents, 800);
  const verdict = verdictOf(stats.freeLove, stats.freeHate);
  const agreed = mine !== null && mine === won;
  const love = won === "love";

  return (
    <div>
      <div
        className={cn(
          "relative isolate min-h-[clamp(10rem,26vh,22rem)] overflow-hidden rounded-[var(--r-card)] px-4 pt-3.5 pb-4 sm:px-6 sm:pt-5 sm:pb-6",
          love ? "bg-love-fill text-on-love" : "bg-hate-fill text-on-hate",
        )}
      >
        <span aria-hidden className="slam-flash absolute inset-0 -z-10 bg-canvas" />
        <span
          aria-hidden
          className={cn(
            "watermark bottom-[-0.12em] left-[-0.03em] text-[clamp(6rem,15vw,15rem)]",
          )}
        >
          {love ? "LOVED" : "HATED"}
        </span>

        <div className="flex items-start justify-between gap-4">
          <p className="line-clamp-1 max-w-[60%] text-[13.5px] font-semibold opacity-80">
            {question}
          </p>
          <Stamp tone="on-fill" delay={300}>
            {verdict.label}
          </Stamp>
        </div>

        <div className="relative mt-3">
          <span className="display num block text-[clamp(4.25rem,11vw,11rem)] leading-[0.82]">
            {Math.min(100, big)}
            <span className="text-[0.38em]">%</span>
          </span>
          <span className="mt-2 block text-[15px] font-extrabold tracking-[0.12em] uppercase opacity-90">
            said {won}
          </span>
        </div>

        {/* Grounded: it stands on the panel's floor. */}
        <Thumb
          src={imageUrl}
          alt=""
          rounded="rounded-t-[12px]"
          className="pop-in absolute right-[clamp(1rem,4%,2.5rem)] bottom-0 aspect-square w-[clamp(6rem,15vw,12rem)]"
        />
      </div>

      {/* The counterpoint. */}
      <div className="mt-3 flex flex-wrap items-center gap-x-6 gap-y-2 px-1">
        <span className={cn("num text-[15px] font-extrabold", love ? "text-hate" : "text-love")}>
          {100 - winPct}%
          <span className="ml-1.5 text-[12px] font-bold tracking-wide text-mute uppercase">
            said {love ? "hate" : "love"}
          </span>
        </span>
        <span className="flex items-center gap-1.5 text-[13px] text-mute">
          <Users weight="fill" className="size-3.5" />
          <span className="num font-bold text-ink-2">{fmtInt(votes)}</span> votes
        </span>
        <span className="flex items-center gap-1.5 text-[13px] text-mute">
          <Lightning weight="fill" className="size-3.5 text-coin" />
          <span className="num font-bold text-coin">{fmtMoney(staked)}</span> staked
        </span>
        <span className="flex-1" />
        {mine ? (
          <span
            className={cn(
              "pop-in chip !px-3 !py-1.5 !text-[12.5px] !font-extrabold",
              agreed ? "!bg-go-fill/15 !text-go" : "!bg-coin-fill/15 !text-coin",
            )}
            style={{ animationDelay: "600ms" }}
          >
            {agreed ? `With the ${winPct}%` : `Contrarian — only ${100 - winPct}% agree`}
          </span>
        ) : null}
      </div>
    </div>
  );
}
