import { ArrowUUpLeft, Fire, Heart, HeartBreak } from "@phosphor-icons/react";

import { cn } from "../lib/cn";
import type { Side } from "../lib/format";
import { Button } from "../ui/Button";

/**
 * The second answer, and the only window in which a vote can be taken back.
 *
 * Your own opinion resolves the instant you give it — nothing is left to find
 * out, which is why a result bar holds nobody. This half stays open until the
 * reveal: *which way did everyone else go?* It is framed against your own
 * answer on purpose, because the interesting case is the one where they differ
 * and calling the room against yourself is what makes somebody feel clever.
 *
 * **Undo is free here because nothing has been sent.** The pick is local until
 * `votes.cast` runs, which is the reference product's rule carried across: a
 * pending vote can be taken back, a cast one never can. Rule 8 holds either
 * way — there is nothing here to reverse.
 *
 * It renders in place of the arena, inside the decision column, rather than as
 * a sheet over the console: the question it is about has to stay on screen.
 * A room too small to grade never reaches this at all — it commits on the
 * press, because an extra confirmation for a question nobody can be graded on
 * is ceremony for its own sake.
 */
export function CallStep({
  mine,
  crowdSize,
  busy,
  onCall,
  onSkip,
  onUndo,
}: {
  mine: Side;
  crowdSize: number;
  busy: boolean;
  onCall: (call: Side) => void;
  /** Cast it without calling the room. */
  onSkip: () => void;
  /** Take it back. Nothing has been sent, so this costs nothing. */
  onUndo: () => void;
}) {
  const love = mine === "love";
  const Mine = love ? Heart : HeartBreak;

  const option = (call: Side) => {
    const isLove = call === "love";
    const Icon = isLove ? Heart : HeartBreak;
    return (
      <Button
        key={call}
        bare
        disabled={busy}
        onClick={() => onCall(call)}
        className={cn(
          "snap flex min-h-[6rem] flex-1 flex-col items-center justify-center gap-1 rounded-[var(--r-card)]",
          isLove
            ? "bg-love-fill/15 text-love hover:bg-love-fill hover:text-on-love"
            : "bg-hate-fill/15 text-hate hover:bg-hate-fill hover:text-on-hate",
        )}
      >
        <Icon weight="fill" className="size-6 transition-transform duration-200 group-hover:scale-125" />
        <span className="display text-xl uppercase">{isLove ? "Love" : "Hate"}</span>
        <span className="text-[11px] font-extrabold tracking-wide uppercase opacity-70">
          {call === mine ? "Same as me" : "Against me"}
        </span>
      </Button>
    );
  };

  return (
    <div className="rise card border-2 border-line-2 p-4">
      <div className="flex flex-wrap items-center gap-x-2.5 gap-y-1">
        <Mine weight="fill" className={cn("size-5", love ? "text-love" : "text-hate")} />
        <h2 className="display text-[18px]">Now read the room.</h2>
        <span className="flex-1" />
        <span className="chip">
          <span className="num font-bold text-ink">{crowdSize}</span> answered before you
        </span>
      </div>

      <p className="mt-1.5 mb-3 max-w-[48ch] text-[13.5px] leading-snug text-ink-3">
        You said <strong className={love ? "text-love" : "text-hate"}>{mine}</strong>. Which
        way did everyone else go?
      </p>

      <div className="flex gap-3">{(["love", "hate"] as const).map(option)}</div>

      <div className="mt-2.5 flex flex-wrap items-center justify-between gap-x-3 gap-y-1.5">
        <p className="flex items-center gap-1.5 text-[12px] text-mute">
          <Fire weight="fill" className="size-3.5 text-streak" />
          Right calls build your streak.
        </p>

        <span className="flex items-center gap-1">
          {/* Free, and the last moment it will be — nothing has been cast yet. */}
          <Button variant="ghost" size="sm" disabled={busy} onClick={onUndo}>
            <ArrowUUpLeft weight="bold" className="size-4" />
            Undo
            <kbd className="key ml-1 hidden xl:inline-grid">U</kbd>
          </Button>
          <Button variant="ghost" size="sm" disabled={busy} onClick={onSkip}>
            Just vote
          </Button>
        </span>
      </div>
    </div>
  );
}
