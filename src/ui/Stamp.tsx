import type { ReactNode } from "react";

import { cn } from "../lib/cn";

/**
 * A rubber stamp — the verdict pressed onto the result at an angle, a beat
 * after the number lands. `delay` is that beat.
 */
export function Stamp({
  children,
  tone = "ink",
  delay = 250,
  className,
}: {
  children: ReactNode;
  /** `on-fill` takes the colour of whatever fill it is stamped onto. */
  tone?: "ink" | "on-fill" | "love" | "hate" | "coin" | "go";
  delay?: number;
  className?: string;
}) {
  const colour = {
    ink: "text-ink",
    "on-fill": "text-current",
    love: "text-love",
    hate: "text-hate",
    coin: "text-coin",
    go: "text-go",
  }[tone];
  return (
    <span
      className={cn("stamp stamp-in", colour, className)}
      style={{ animationDelay: `${delay}ms` }}
    >
      {children}
    </span>
  );
}
