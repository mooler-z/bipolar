import { ArrowCounterClockwise, At, Heart, HeartBreak, Lightning } from "@phosphor-icons/react";

import { cn } from "../../lib/cn";
import type { Art } from "../../lib/phoneTour";

/**
 * The five diagrams, drawn rather than described.
 *
 * All of them are the app's own parts at a smaller size — the two answer
 * cards, the deck's three panels, the spark, the undo bar, a line of talk — so
 * the lesson is recognisable the moment the real thing appears, instead of
 * being an illustration of something that looks like it.
 *
 * Every loop runs on the same 2.2s clock, so a thumb and the thing it presses
 * stay in step. Each resting state reads on its own: the global reduced-motion
 * rule collapses the animation to nothing, and a lesson that only existed
 * mid-keyframe would go with it.
 */

/** The thumb. A soft disc, because a hand-shaped cursor is a lie about scale. */
function Thumb({ className }: { className?: string }) {
  return (
    <span
      aria-hidden
      className={cn(
        "absolute size-7 rounded-full border-2 border-ink/35 bg-ink/15 backdrop-blur-[1px]",
        className,
      )}
    />
  );
}

function Frame({ children }: { children: React.ReactNode }) {
  return (
    <div className="relative mx-auto h-[132px] w-[104px] overflow-hidden rounded-[18px] border-2 border-line-2 bg-canvas">
      {children}
    </div>
  );
}

export function TourArt({ art }: { art: Art }) {
  if (art === "answer") {
    return (
      <Frame>
        <div className="flex h-full flex-col gap-1.5 p-2">
          <span className="h-3 rounded-[4px] bg-surface-3" />
          <div className="grid flex-1 grid-cols-2 gap-1.5">
            <span className="relative grid place-items-center rounded-[8px] bg-love-fill/25">
              <Heart weight="fill" className="size-5 text-love" />
              {/* What answers the press. */}
              <span aria-hidden className="tour-lit absolute inset-0 rounded-[8px] bg-love-fill" />
            </span>
            <span className="grid place-items-center rounded-[8px] bg-hate-fill/25">
              <HeartBreak weight="fill" className="size-5 text-hate" />
            </span>
          </div>
        </div>
        <Thumb className="tour-tap bottom-6 left-3.5" />
      </Frame>
    );
  }

  if (art === "deck") {
    return (
      <Frame>
        {/* Twice the frame's height: two panels, and the loop slides one out. */}
        <div className="tour-deck h-[200%] w-full">
          <div className="flex h-1/2 flex-col gap-1.5 p-2">
            <span className="h-3 rounded-[4px] bg-surface-3" />
            <div className="grid flex-1 grid-cols-2 gap-1.5">
              <span className="rounded-[8px] bg-love-fill/30" />
              <span className="rounded-[8px] bg-hate-fill/30" />
            </div>
          </div>
          <div className="flex h-1/2 flex-col gap-1 border-t-2 border-line-2 p-2">
            <span className="h-2 w-8 rounded-[3px] bg-go-fill/60" />
            {[0, 1, 2, 3].map((i) => (
              <span key={i} className="h-3 rounded-[4px] bg-surface-3" />
            ))}
          </div>
        </div>
        <Thumb className="tour-thumb bottom-7 left-1/2 -translate-x-1/2" />
      </Frame>
    );
  }

  if (art === "spark") {
    return (
      <Frame>
        <div className="flex h-full flex-col items-center justify-center gap-2 p-2">
          <span className="relative grid size-11 place-items-center rounded-full border-2 border-coin-fill/45">
            <Lightning weight="fill" className="size-5 text-coin" />
            <span aria-hidden className="tour-spark absolute inset-0 grid place-items-center">
              <Lightning weight="fill" className="size-5 text-coin" />
            </span>
          </span>
          <span className="num rounded-full bg-coin-fill px-2 py-0.5 text-[10px] font-extrabold text-on-coin">
            50¢
          </span>
          <span className="h-2 w-14 rounded-[3px] bg-surface-3" />
        </div>
      </Frame>
    );
  }

  if (art === "undo") {
    return (
      <Frame>
        <div className="flex h-full flex-col justify-center gap-2 p-2.5">
          <span className="flex items-center gap-1">
            <Heart weight="fill" className="size-3.5 text-love" />
            <span className="num text-[11px] font-extrabold text-ink">61%</span>
          </span>
          <span className="h-1.5 overflow-hidden rounded-full bg-surface-3">
            <span aria-hidden className="tour-drain block h-full w-full rounded-full bg-go-fill" />
          </span>
          <span className="flex items-center gap-1 rounded-[7px] border border-line-2 px-1.5 py-1 text-[9.5px] font-extrabold text-ink-3">
            <ArrowCounterClockwise weight="bold" className="size-3 shrink-0" />
            Undo
          </span>
        </div>
      </Frame>
    );
  }

  return (
    <Frame>
      <div className="flex h-full flex-col justify-center gap-1.5 p-2">
        <span className="flex items-start gap-1.5">
          <span className="size-4 shrink-0 rounded-full bg-surface-4" />
          <span className="flex-1 space-y-1">
            <span className="block h-2 w-8 rounded-[3px] bg-surface-3" />
            <span className="block h-2 rounded-[3px] bg-surface-3" />
          </span>
        </span>
        <span className="ml-5 flex items-center gap-1 rounded-[7px] bg-go-fill/18 px-1.5 py-1">
          <At weight="bold" className="size-3 shrink-0 text-go" />
          <span className="text-[9.5px] font-extrabold text-go">Sam</span>
          <span className="h-2 flex-1 rounded-[3px] bg-surface-3" />
        </span>
      </div>
      <Thumb className="tour-tap right-2.5 bottom-4" />
    </Frame>
  );
}
