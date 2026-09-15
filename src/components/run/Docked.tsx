import type { ReactNode } from "react";
import { SidebarSimple } from "@phosphor-icons/react";

import { cn } from "../../lib/cn";
import { Button } from "../../ui/Button";

import "./docked.css";

/**
 * A rail that has been put away.
 *
 * It keeps its column. Collapsing the track reflowed the question — the
 * biggest type in the app jumping sideways the moment somebody tidied a rail
 * they were not even reading — so the width never moves and a sheet of frosted
 * glass comes down over the rail instead.
 *
 * What is behind the glass is still mounted and still live. That is the point
 * of frosting rather than unmounting: the room keeps filling while it is put
 * away, so bringing it back shows what has happened rather than an empty panel
 * that has to load. It is `inert`, so nothing behind the glass can be tabbed
 * to or clicked by accident.
 */
export function Docked({
  side,
  label,
  away,
  onShow,
  children,
}: {
  side: "left" | "right";
  label: string;
  away: boolean;
  onShow: () => void;
  children: ReactNode;
}) {
  return (
    <div className="relative h-full min-h-0">
      <div
        className={cn("h-full min-h-0 transition-[filter,opacity] duration-500", away && "docked-away")}
        {...(away ? { inert: "" as unknown as boolean } : {})}
      >
        {children}
      </div>

      {away ? (
        <>
          <span aria-hidden className="docked-glass" />

          {/* The ground's own grain, laid back on over the glass. The glass
              blurs everything behind it, the grain plate included, so without
              this the docked column comes out smooth against a middle that is
              speckled — a seam made of texture rather than of colour, which is
              the one kind this arrangement had left. Same frequency, blend and
              opacity as the plate in `backdrop.css`; the id is per side so two
              docked rails never share one. */}
          <svg aria-hidden className="docked-grain" xmlns="http://www.w3.org/2000/svg">
            <filter id={`bp-dock-grain-${side}`}>
              <feTurbulence type="fractalNoise" baseFrequency="0.72" numOctaves="4" stitchTiles="stitch" />
            </filter>
            <rect width="100%" height="100%" filter={`url(#bp-dock-grain-${side})`} />
          </svg>

          {/* The whole column is the hit area — a docked rail is a big target
              and there is no reason to make somebody find a small one inside
              it. No plate around it: a card sitting in the middle of a column
              that has deliberately been put away is a second thing to look at,
              which is the complaint docking answers in the first place. What
              says "press me" is the handle on the edge the rail folded away
              from, and the whole column answering the cursor at once. */}
          <Button
            bare
            aria-label={`Show ${label}`}
            onClick={onShow}
            className="group/dock absolute inset-0 z-10 flex items-center justify-center"
          >
            {/* The slide. Under the cursor the whole mark leans out towards its
                own edge — the way the rail itself will go when it comes back —
                so the column reads as something folded rather than something
                switched off. Six pixels; it only has to be felt. */}
            <span
              className={cn(
                "flex flex-col items-center gap-2 transition-transform duration-300 ease-out",
                side === "left"
                  ? "group-hover/dock:-translate-x-1.5"
                  : "group-hover/dock:translate-x-1.5",
              )}
            >
              <SidebarSimple
                weight="bold"
                className={cn(
                  "size-5 text-ink-3 transition-colors group-hover/dock:text-go",
                  side === "left" && "scale-x-[-1]",
                )}
              />
              <span className="text-[11px] font-extrabold tracking-[0.1em] text-ink-3 uppercase transition-colors group-hover/dock:text-ink">
                {label}
              </span>
              <span className="text-[10.5px] font-bold text-mute transition-colors group-hover/dock:text-ink-3">
                Click to bring back
              </span>
            </span>

            {/* The handle. The one thing here drawn as hardware. */}
            <span
              aria-hidden
              className={cn(
                "absolute top-1/2 h-16 w-1.5 -translate-y-1/2 rounded-full bg-ink/25",
                "transition-[background-color,height] duration-200",
                "group-hover/dock:h-24 group-hover/dock:bg-go-fill",
                side === "left" ? "right-1.5" : "left-1.5",
              )}
            />
          </Button>
        </>
      ) : null}
    </div>
  );
}
