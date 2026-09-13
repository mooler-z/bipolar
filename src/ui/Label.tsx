import type { ReactNode } from "react";

import { cn } from "../lib/cn";

const TONES = {
  mute: "text-mute",
  ink: "text-ink",
  love: "text-love",
  hate: "text-hate",
  coin: "text-coin",
  go: "text-go",
  streak: "text-streak",
} as const;

/** Small supporting text. */
export function Label({
  children,
  className,
  tone = "mute",
}: {
  children: ReactNode;
  className?: string;
  tone?: keyof typeof TONES;
}) {
  return <span className={cn("label", TONES[tone], className)}>{children}</span>;
}

/** A pill: a category, a count, a status. */
export function Chip({
  children,
  className,
  tone,
}: {
  children: ReactNode;
  className?: string;
  tone?: "love" | "hate" | "coin" | "go" | "streak";
}) {
  return (
    <span
      className={cn(
        "chip",
        tone === "love" && "!bg-love/15 !text-love",
        tone === "hate" && "!bg-hate/15 !text-hate",
        tone === "coin" && "!bg-coin/15 !text-coin",
        tone === "go" && "!bg-go/15 !text-go",
        tone === "streak" && "!bg-streak/15 !text-streak",
        className,
      )}
    >
      {children}
    </span>
  );
}
