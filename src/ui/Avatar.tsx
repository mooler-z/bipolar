import { cn } from "../lib/cn";

/**
 * A person, as their initial on a coloured disc.
 *
 * The colour is a hash of the name, so the same voice is the same colour on
 * every screen and a thread of comments reads as several people rather than
 * a column of identical grey circles.
 */

const DISCS = [
  "bg-love-fill text-on-love",
  "bg-hate-fill text-on-hate",
  "bg-coin-fill text-on-coin",
  "bg-go-fill text-on-go",
  "bg-streak-fill text-on-streak",
  "bg-violet-fill text-on-violet",
] as const;

export function discOf(name: string): string {
  let h = 0;
  for (const ch of name) h = (h * 31 + ch.charCodeAt(0)) >>> 0;
  return DISCS[h % DISCS.length];
}

export function Avatar({
  name,
  className,
}: {
  name: string;
  /** Size and any extras. Defaults to a 32px disc. */
  className?: string;
}) {
  return (
    <span
      aria-hidden
      className={cn(
        "grid size-8 shrink-0 place-items-center rounded-full text-[13px] font-extrabold",
        discOf(name),
        className,
      )}
    >
      {(name.trim() || "?").slice(0, 1).toUpperCase()}
    </span>
  );
}
