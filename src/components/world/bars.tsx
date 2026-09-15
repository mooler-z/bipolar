import { cn } from "../../lib/cn";
import { fmtInt } from "../../lib/format";
import { leanWord, sideOf, strengthOf } from "../../lib/words";
import { Flag } from "../../ui/Flag";

/**
 * The page's one visual idea, reused everywhere.
 *
 * A lean is a bar split at its own percentage — love from the left, hate from
 * the right — so every board on the page is read the same way and a row can be
 * compared to a row three sections down without thinking.
 *
 * **The word is the headline and the number is the evidence.** "Despises" is
 * a thing somebody repeats; "8%" is a thing nobody does, and they say the
 * same thing. So the word is set in the winning side's colour at reading size
 * and the percentage sits after it, small, agreeing with it rather than
 * contradicting it — the number beside "despises" is the share *against*.
 */
export function Lean({
  lovePct,
  votes,
  /** Drop the word where the row already says it. */
  bare = false,
  className,
}: {
  lovePct: number;
  votes: number;
  bare?: boolean;
  className?: string;
}) {
  const loves = sideOf(lovePct) === "love";
  return (
    <span className={cn("flex items-center gap-2.5", className)}>
      <span className="relative h-2.5 min-w-0 flex-1 overflow-hidden rounded-full bg-hate-fill">
        <span
          className="absolute inset-y-0 left-0 bg-love-fill transition-[width] duration-500"
          style={{ width: `${lovePct}%` }}
        />
      </span>
      {bare ? null : (
        <span
          className={cn(
            "w-[6.5rem] shrink-0 truncate text-[12.5px] font-extrabold",
            loves ? "text-love" : "text-hate",
          )}
        >
          {leanWord(lovePct)}
        </span>
      )}
      <span className="num w-7 shrink-0 text-right text-[10.5px] font-bold text-mute">
        {strengthOf(lovePct)}%
      </span>
      <span className="num w-8 shrink-0 text-right text-[10px] text-mute">
        {fmtInt(votes)}
      </span>
    </span>
  );
}

/** The word for which way a room went, from the one scale the page uses. */
export { leanWord as verdictWord } from "../../lib/words";

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
