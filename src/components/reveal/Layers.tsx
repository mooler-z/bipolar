import { Lightning, Users } from "@phosphor-icons/react";

import { cn } from "../../lib/cn";
import { fmtInt, pct } from "../../lib/format";
import { Split } from "../../ui/Panel";
import type { Aggregate } from "./types";

/**
 * The two layers, and the one sentence that compares them.
 *
 * Keeping the Crowd and the Committed apart is the entire product, so they
 * are two bars of the same shape stacked so the eye can compare them, never
 * merged into one. When the money disagrees with the mouth, the sentence
 * under them turns gold — that is the single most interesting fact on the
 * page and it is allowed to look like it.
 */

function Layer({
  icon,
  name,
  hint,
  love,
  hate,
  delay,
}: {
  icon: React.ReactNode;
  name: string;
  hint: string;
  love: number;
  hate: number;
  delay: number;
}) {
  const total = love + hate;
  return (
    <div className="tile tile-in" style={{ animationDelay: `${delay}ms` }}>
      <div className="mb-2.5 flex items-baseline gap-2">
        <span className="flex items-center gap-1.5 text-[13px] font-extrabold">
          {icon}
          {name}
        </span>
        <span className="label">{hint}</span>
        <span className="flex-1" />
        <span className="num text-[12px] font-bold text-mute">{fmtInt(total)}</span>
      </div>
      {total === 0 ? (
        <span className="label">Nobody yet</span>
      ) : (
        <Split love={love} hate={hate} height={14} labels />
      )}
    </div>
  );
}

export function Layers({ stats, staked = false }: { stats: Aggregate; staked?: boolean }) {
  const [cl] = pct(stats.freeLove, stats.freeHate);
  const [pl] = pct(stats.paidLove, stats.paidHate);
  const paid = stats.paidLove + stats.paidHate;
  const disagree = paid > 0 && Math.abs(pl - cl) >= 8;

  return (
    <div>
      <div className="grid gap-3 sm:grid-cols-2">
        <Layer
          icon={<Users weight="fill" className="size-4 text-ink-3" />}
          name="The Crowd"
          hint="free votes"
          love={stats.freeLove}
          hate={stats.freeHate}
          delay={0}
        />
        <Layer
          icon={<Lightning weight="fill" className="size-4 text-coin" />}
          name="The Committed"
          hint="paid to be counted"
          love={stats.paidLove}
          hate={stats.paidHate}
          delay={110}
        />
      </div>

      <p
        className={cn(
          "tile-in mt-3 rounded-[var(--r-btn)] px-4 py-3 text-[13.5px] leading-snug",
          disagree
            ? "border border-coin-fill/35 bg-coin-fill/10 text-coin"
            : "bg-surface-2 text-mute",
        )}
        style={{ animationDelay: "220ms" }}
      >
        {paid > 0 ? (
          <>
            <Lightning weight="fill" className="mr-1 inline size-3.5 align-text-bottom text-coin" />
            The money says <span className="num font-extrabold">{pl}%</span> love. The
            crowd says <span className="num font-extrabold">{cl}%</span>.
            {disagree ? " They disagree." : " They agree."}
            {staked ? " You backed this one." : ""}
          </>
        ) : (
          "Nobody has put money behind this yet. The Committed is empty."
        )}
      </p>
    </div>
  );
}
