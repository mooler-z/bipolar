import { Fire, Target, TrendUp } from "@phosphor-icons/react";

import { cn } from "../../lib/cn";
import { fmtInt, rankOf } from "../../lib/format";

/**
 * What you have, in one card.
 *
 * It was four bordered boxes in a two-by-two grid — the shape every dashboard
 * is made of, and four boxes say four equal things. These are not equal. The
 * **streak** is the one you would hate to lose, so it leads at a size nothing
 * else on the rail competes with. Accuracy and rank are facts about you, so
 * they share a row under a hairline. Sparks are the only thing here you can
 * *spend*, so they stop pretending to be a statistic and become the button
 * they always were.
 *
 * Nothing shows an em-dash. An account with no calls yet had an accuracy of
 * "—", which reads as broken rather than as not-started; it now shows how many
 * of the five calls it takes to be ranked have been made, as dots you can
 * count without reading.
 */
export function Record({
  streak,
  bestStreak,
  made,
  accuracy,
  backed,
  bumped,
}: {
  streak: number;
  bestStreak: number;
  /** Calls graded so far. Five of them earns a rank. */
  made: number;
  accuracy: number;
  backed: number;
  /** The streak just went up. Pop it once. */
  bumped: boolean;
}) {
  const ranked = made >= 5;
  const alight = streak > 0;

  return (
    <div className="space-y-2">
      <div className="card tile-in overflow-hidden">
        {/* The hero. A streak is a thing you are carrying, so it is the one
            number on this rail with room around it. */}
        <div className="flex items-center gap-3.5 px-3.5 py-3">
          <span
            className={cn(
              "grid size-11 shrink-0 place-items-center rounded-[var(--r-btn)] transition-colors",
              alight ? "bg-streak-fill text-on-streak" : "bg-surface-3 text-mute",
            )}
          >
            <Fire weight="fill" className={cn("size-6", alight && "flicker")} />
          </span>

          <span className="min-w-0 flex-1">
            <span
              className={cn(
                "display num block text-[clamp(1.9rem,2.6vw,2.6rem)] leading-none",
                alight ? "text-streak" : "text-ink-3",
                bumped && "pop-in",
              )}
            >
              {fmtInt(streak)}
            </span>
            <span className="mt-1 flex items-baseline gap-2">
              <span className="text-[10.5px] font-extrabold tracking-[0.1em] text-mute uppercase">
                streak
              </span>
              {bestStreak > 0 ? (
                <span className="num text-[11px] text-mute">
                  best {fmtInt(bestStreak)}
                </span>
              ) : (
                <span className="text-[11px] text-mute">call one right</span>
              )}
            </span>
          </span>
        </div>

        {/* Two facts, one hairline. Not two more boxes. */}
        <div className="grid grid-cols-2 border-t border-line">
          <div className="border-r border-line px-3.5 py-2.5">
            <span className="flex items-center gap-1.5 text-[10.5px] font-extrabold tracking-[0.06em] text-go uppercase">
              <Target weight="fill" className="size-3.5" /> Accuracy
            </span>
            {ranked ? (
              <>
                <span className="display num mt-1 block text-[clamp(1.1rem,1.5vw,1.4rem)] leading-none">
                  {accuracy}%
                </span>
                <span className="mt-1 block text-[11px] text-mute">
                  {fmtInt(made)} calls
                </span>
              </>
            ) : (
              <>
                {/* Five dots beat an em-dash: it is not missing, it is not
                    finished, and the difference is the whole story. */}
                <span className="mt-2 flex items-center gap-1">
                  {Array.from({ length: 5 }, (_, i) => (
                    <span
                      key={i}
                      className={cn(
                        "size-2 rounded-full transition-colors",
                        i < made ? "bg-go-fill" : "bg-surface-3",
                      )}
                    />
                  ))}
                </span>
                <span className="mt-1.5 block text-[11px] text-mute">
                  {5 - made} more to rank
                </span>
              </>
            )}
          </div>

          <div className="px-3.5 py-2.5">
            <span className="flex items-center gap-1.5 text-[10.5px] font-extrabold tracking-[0.06em] text-hate uppercase">
              <TrendUp weight="bold" className="size-3.5" /> Rank
            </span>
            <span className="display mt-1 block truncate text-[clamp(1rem,1.3vw,1.25rem)] leading-none">
              {rankOf(backed).title}
            </span>
            <span className="mt-1 block text-[11px] text-mute">
              {fmtInt(backed)} backed
            </span>
          </div>
        </div>
      </div>

    </div>
  );
}
