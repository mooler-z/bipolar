import { useState, type PointerEvent } from "react";
import { Heart, Lightning, ThumbsDown } from "@phosphor-icons/react";

import { cn } from "../lib/cn";
import type { Side } from "../lib/format";
import { Button } from "../ui/Button";

/**
 * The two answers.
 *
 * The house shape is a slant, so the pair is cut by one: LOVE's trailing edge
 * and HATE's leading edge run the same diagonal and the gap between them reads
 * as a seam rather than as two rectangles standing near each other.
 *
 * **This is the loudest thing in the app on purpose.** Pressing one of these is
 * the entire product, and a control somebody hits two hundred times in a
 * sitting has to be worth hitting. Hovering lifts the slab nine pixels, scales
 * it, lights an inner rim, throws the icon up a size and pushes the other
 * answer back. Pressing drops it onto its edge and sends a ripple out from the
 * exact point of contact.
 *
 * **Armed is a different object, not a tinted one.** When a spark is on the
 * line the slab's edge turns gold, a gold rim breathes around it, and the cost
 * is stamped on the face. A vote that spends money must never be one hover
 * state away from a vote that does not.
 *
 * `clip-path` removes the border radius and the box-shadow, so the edge and the
 * rim are drawn inside the shape instead.
 */

const SLANT = 30;

const FACE = {
  love: {
    Icon: Heart,
    word: "Love",
    key: "L",
    fill: "bg-love",
    edge: "var(--love-deep)",
    ink: "text-white",
    clip: `polygon(0 0, 100% 0, calc(100% - ${SLANT}px) 100%, 0 100%)`,
  },
  hate: {
    Icon: ThumbsDown,
    word: "Hate",
    key: "H",
    fill: "bg-hate",
    edge: "var(--hate-deep)",
    ink: "text-black",
    clip: `polygon(${SLANT}px 0, 100% 0, 100% 100%, 0 100%)`,
  },
} as const;

type Drop = { id: number; x: number; y: number };

export function VoteButtons({
  armed,
  busy,
  onPick,
}: {
  armed: boolean;
  busy: boolean;
  onPick: (side: Side) => void;
}) {
  const [hover, setHover] = useState<Side | null>(null);
  const [drops, setDrops] = useState<Record<Side, Drop | null>>({
    love: null,
    hate: null,
  });

  function splash(side: Side, e: PointerEvent<HTMLButtonElement>) {
    const box = e.currentTarget.getBoundingClientRect();
    setDrops((d) => ({
      ...d,
      [side]: { id: Date.now(), x: e.clientX - box.left, y: e.clientY - box.top },
    }));
  }

  return (
    <div className="flex h-[clamp(6rem,13vh,9rem)] gap-2.5">
      {(["love", "hate"] as const).map((side) => {
        const f = FACE[side];
        const lit = hover === side;
        const dim = hover !== null && !lit;
        const drop = drops[side];
        return (
          <Button
            key={side}
            bare
            disabled={busy}
            aria-label={
              armed ? `Vote ${f.word}, backed with 50 cents` : `Vote ${f.word}`
            }
            onMouseEnter={() => setHover(side)}
            onMouseLeave={() => setHover(null)}
            onPointerDown={(e) => splash(side, e)}
            onClick={() => onPick(side)}
            className={cn(
              "answer relative flex-1 overflow-hidden",
              f.fill,
              f.ink,
              dim && "answer-dim",
            )}
            style={{ clipPath: f.clip }}
          >
            {/* The slab edge, drawn rather than cast — the clip eats a
                box-shadow. It vanishes as the block presses onto it. */}
            <span
              aria-hidden
              className="absolute inset-x-0 bottom-0 h-1.5 transition-[height,background-color] duration-150 group-active:h-0"
              style={{ background: armed ? "var(--coin-deep)" : f.edge }}
            />

            {/* The rim: white on hover, gold and breathing while staked. */}
            <span aria-hidden className={cn("rim", armed && "stake-pulse")} />

            {/* Gold crosses the face the moment it arms. */}
            {armed ? (
              <span key="wash" aria-hidden className="gold-wash" />
            ) : null}

            {/* The ripple, from the exact point of contact. */}
            {drop ? (
              <span
                key={drop.id}
                aria-hidden
                className="ripple pointer-events-none absolute rounded-full bg-white/45"
                style={{ left: drop.x, top: drop.y }}
              />
            ) : null}

            <span className="relative flex flex-col items-center gap-1.5">
              <f.Icon
                weight={lit || armed ? "fill" : "bold"}
                className={cn(
                  "size-[clamp(1.75rem,2.4vw,2.5rem)]",
                  "transition-transform duration-200 ease-out",
                  lit && "scale-[1.35] -rotate-6",
                )}
              />
              <span
                className={cn(
                  "display text-[clamp(1.25rem,2vw,2rem)] uppercase",
                  "transition-[letter-spacing] duration-200",
                  lit && "tracking-[0.06em]",
                )}
              >
                {f.word}
              </span>
              <span
                className={cn(
                  "absolute -bottom-5 text-[11px] font-bold tracking-wide uppercase",
                  "opacity-0 transition-opacity duration-200",
                  lit && "opacity-60",
                )}
              >
                press {f.key}
              </span>
            </span>

            {/* The stake, stamped on the face rather than implied by a tint. */}
            {armed ? (
              <span
                className={cn(
                  "pop-in absolute top-3 flex items-center gap-1 rounded-[var(--r-pill)]",
                  "bg-coin px-2.5 py-1 text-[11px] font-extrabold text-black",
                  side === "love" ? "left-4" : "right-4",
                )}
              >
                <Lightning weight="fill" className="size-3" />
                50&cent;
              </span>
            ) : null}
          </Button>
        );
      })}
    </div>
  );
}
