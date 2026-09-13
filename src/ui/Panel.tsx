import type { ReactNode } from "react";

import { cn } from "../lib/cn";
import { useGrow } from "../lib/motion";

/** A Polymarket card: a border, a dark surface, and nothing louder. */
export function Panel({
  title,
  icon,
  right,
  children,
  className,
  bodyClassName,
}: {
  title?: string;
  icon?: ReactNode;
  right?: ReactNode;
  children: ReactNode;
  className?: string;
  bodyClassName?: string;
}) {
  return (
    <section
      className={cn(
        "card card-hover flex min-h-0 flex-col overflow-hidden",
        className,
      )}
    >
      {title ? (
        <header className="flex shrink-0 items-center gap-2 border-b border-line px-4 py-3">
          {icon}
          <h2 className="text-[13px] font-bold tracking-[-0.01em]">{title}</h2>
          <span className="flex-1" />
          {right}
        </header>
      ) : null}
      <div className={cn("min-h-0 flex-1 p-4", bodyClassName)}>{children}</div>
    </section>
  );
}

/**
 * A probability bar, in the prediction-market idiom: one track, two shares,
 * the numbers on the ends, and the widths easing rather than jumping so a
 * moving market reads as movement instead of a glitch.
 */
export function Split({
  love,
  hate,
  height = 10,
  labels = false,
}: {
  love: number;
  hate: number;
  height?: number;
  labels?: boolean;
}) {
  const total = love + hate;
  const l = total === 0 ? 50 : Math.round((love / total) * 100);
  // One frame at zero width, so the transition has something to run from.
  const grown = useGrow();

  return (
    <div>
      <div
        className="flex w-full overflow-hidden rounded-[var(--r-pill)] bg-surface-3"
        style={{ height }}
      >
        {total === 0 ? null : (
          <>
            <span
              className="bg-love transition-[width] duration-[900ms] ease-out"
              style={{ width: grown ? `${l}%` : "0%" }}
            />
            <span
              className="bg-hate transition-[width] duration-[900ms] ease-out"
              style={{ width: grown ? `${100 - l}%` : "100%" }}
            />
          </>
        )}
      </div>
      {labels && total > 0 ? (
        <div className="mt-1.5 flex justify-between">
          <span className="num text-[13px] font-bold text-love">{l}%</span>
          <span className="num text-[13px] font-bold text-hate">{100 - l}%</span>
        </div>
      ) : null}
    </div>
  );
}
