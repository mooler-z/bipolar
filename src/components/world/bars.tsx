import { cn } from "../../lib/cn";
import { fmtInt } from "../../lib/format";
import { Flag } from "../../ui/Flag";

/**
 * The page's one visual idea, reused everywhere.
 *
 * A lean is a bar split at its own percentage — love from the left, hate from
 * the right — so every board on the page is read the same way and a row can be
 * compared to a row three sections down without thinking. The number sits on
 * whichever side is winning, because a percentage floating over a seam belongs
 * to neither.
 */
export function Lean({
  lovePct,
  votes,
  className,
}: {
  lovePct: number;
  votes: number;
  className?: string;
}) {
  const loves = lovePct >= 50;
  return (
    <span className={cn("flex items-center gap-2.5", className)}>
      <span className="relative h-2.5 min-w-0 flex-1 overflow-hidden rounded-full bg-hate-fill">
        <span
          className="absolute inset-y-0 left-0 bg-love-fill transition-[width] duration-500"
          style={{ width: `${lovePct}%` }}
        />
      </span>
      <span
        className={cn(
          "num w-11 shrink-0 text-right text-[12.5px] font-extrabold",
          loves ? "text-love" : "text-hate",
        )}
      >
        {loves ? lovePct : 100 - lovePct}%
      </span>
      <span className="num w-10 shrink-0 text-right text-[11px] text-mute">
        {fmtInt(votes)}
      </span>
    </span>
  );
}

/** The word for which way a room went. Said out loud, not inferred from colour. */
export function verdictWord(lovePct: number): string {
  if (lovePct >= 80) return "adored";
  if (lovePct >= 62) return "liked";
  if (lovePct > 55) return "warm to";
  if (lovePct >= 45) return "split on";
  if (lovePct > 38) return "cool on";
  if (lovePct > 20) return "dislike";
  return "can't stand";
}

/** A country, named. The flag alone is a guess on half the world. */
export function Country({ code, className }: { code: string; className?: string }) {
  return (
    <span className={cn("flex shrink-0 items-center gap-1.5", className)}>
      <Flag code={code} />
      <span className="num text-[12.5px] font-bold text-ink">{code}</span>
    </span>
  );
}

/** What a board says when there is not enough of the world here yet. */
export function NotYet({ what, need }: { what: string; need: string }) {
  return (
    <p className="rounded-[var(--r-btn)] border border-line bg-surface-2 px-4 py-5 text-center text-[13px] leading-relaxed text-mute">
      <span className="block font-bold text-ink-3">{what}</span>
      {need}
    </p>
  );
}
