import type { ReactNode } from "react";

import { cn } from "../lib/cn";
import { Button } from "./Button";

/**
 * Duolingo's stat tile.
 *
 * A bordered box, its label in colour along the top, one big number in the
 * body. Four of them in a row is how a lesson ends over there and how a run
 * ends here: the numbers arrive one after another (`delay`), because a stat
 * that appears has been calculated and a stat that lands has been earned.
 */

const TONES = {
  mute: { edge: "border-line-2", text: "text-mute" },
  love: { edge: "border-love-fill/50", text: "text-love" },
  hate: { edge: "border-hate-fill/50", text: "text-hate" },
  coin: { edge: "border-coin-fill/50", text: "text-coin" },
  go: { edge: "border-go-fill/50", text: "text-go" },
  streak: { edge: "border-streak-fill/50", text: "text-streak" },
} as const;

export type Tone = keyof typeof TONES;

export function Tile({
  icon,
  value,
  label,
  tone = "mute",
  delay = 0,
  bump = false,
  onClick,
  hint,
  className,
}: {
  icon?: ReactNode;
  value: ReactNode;
  label: string;
  tone?: Tone;
  /** Stagger, in ms. */
  delay?: number;
  /** Pop the number once — for the moment a streak extends. */
  bump?: boolean;
  onClick?: () => void;
  hint?: ReactNode;
  className?: string;
}) {
  const t = TONES[tone];
  // A word is not a number: a rank like "Spectator" needs a smaller face
  // than "12" or it runs out of the box on a narrow rail.
  const word = typeof value === "string" && /[a-z]/i.test(value);
  const body = (
    <>
      <span className={cn("flex min-w-0 items-center gap-1.5 text-[10.5px] font-extrabold tracking-[0.02em] uppercase", t.text)}>
        {icon}
        <span className="truncate">{label}</span>
      </span>
      <span
        className={cn(
          "display num mt-1 block truncate leading-none text-ink",
          word ? "text-[clamp(0.95rem,1.1vw,1.2rem)]" : "text-[clamp(1.5rem,1.9vw,2rem)]",
          bump && "pop-in",
        )}
      >
        {value}
      </span>
      {hint ? <span className="mt-1 block text-[11.5px] text-mute">{hint}</span> : null}
    </>
  );

  const classes = cn("tile tile-in min-w-0 text-left", t.edge, className);
  const style = { animationDelay: `${delay}ms` };

  if (onClick) {
    return (
      <Button
        bare
        onClick={onClick}
        className={cn(classes, "lift block w-full hover:bg-surface-2")}
        style={style}
      >
        {body}
      </Button>
    );
  }
  return (
    <div className={classes} style={style}>
      {body}
    </div>
  );
}
