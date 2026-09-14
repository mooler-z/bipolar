import { Check, Fire, X } from "@phosphor-icons/react";

import { cn } from "../../lib/cn";
import { useCountUp } from "../../lib/motion";
import { Burst } from "../../ui/Burst";
import type { CallVerdict } from "./types";

/**
 * The reveal on a call.
 *
 * Above the numbers and across the width: right or wrong, by how much, and
 * what it did to the streak. A chart is information; a verdict is the thing
 * somebody comes back for. A win is a solid green band with confetti and a
 * sweep of light; a miss is a grey band that shakes once and does not repeat.
 *
 * The celebration is of a *skill* outcome — reading the room — never of
 * spending. That distinction is the whole of its defence.
 */
export function Called({ verdict }: { verdict: NonNullable<CallVerdict> }) {
  const { correct, called, crowdWent, crowdPct, streak } = verdict;
  const shown = useCountUp(crowdPct, 800);

  return (
    <div
      className={cn(
        "relative flex items-center gap-4 rounded-[var(--r-card)] px-5 py-4",
        correct
          ? "burst sweep bg-go-fill text-on-go"
          : "shake border-2 border-line-2 bg-surface-3 text-ink",
      )}
    >
      {correct ? (
        <Burst colours={["var(--coin-fill)", "var(--love-fill)", "var(--hate-fill)", "var(--streak-fill)"]} />
      ) : null}

      <span className="relative grid size-12 shrink-0 place-items-center">
        {correct ? (
          <span aria-hidden className="ping-ring absolute inset-0 rounded-full text-current/50" />
        ) : null}
        <span
          className={cn(
            "pop-in grid size-12 place-items-center rounded-full",
            correct ? "bg-on-go text-go" : "bg-surface-4 text-mute",
          )}
        >
          {correct ? (
            <Check weight="bold" className="size-6" />
          ) : (
            <X weight="bold" className="size-6" />
          )}
        </span>
      </span>

      <span className="min-w-0 flex-1">
        <span className="display block text-[clamp(1.3rem,1.9vw,1.9rem)]">
          {correct ? "You read the room." : "You misread it."}
        </span>
        <span className={cn("text-[13.5px]", correct ? "text-current/70" : "text-mute")}>
          You called <strong className="uppercase">{called}</strong>. It went{" "}
          <strong
            className={cn(
              "uppercase",
              correct ? "" : crowdWent === "love" ? "text-love" : "text-hate",
            )}
          >
            {crowdWent}
          </strong>{" "}
          by <span className="num font-extrabold">{shown}%</span>.
        </span>
      </span>

      {streak > 1 ? (
        <span
          className={cn(
            "pop-in flex shrink-0 items-center gap-1.5 rounded-[var(--r-pill)] px-3 py-1.5 text-[14px] font-extrabold",
            correct ? "bg-on-go text-streak" : "bg-streak-fill/15 text-streak",
          )}
          style={{ animationDelay: "300ms" }}
        >
          <Fire weight="fill" className="size-4 flicker" />
          <span className="num">{streak}</span>
          <span className="text-[11px] tracking-wide uppercase opacity-80">streak</span>
        </span>
      ) : !correct ? (
        <span className="chip shrink-0 !text-mute">streak reset</span>
      ) : null}
    </div>
  );
}
