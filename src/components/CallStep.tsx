import { Fire, Heart, HeartBreak, Users } from "@phosphor-icons/react";

import { cn } from "../lib/cn";
import type { Side } from "../lib/format";
import { Button } from "../ui/Button";

/**
 * The second answer, and the reason to come back.
 *
 * Your own opinion resolves the instant you give it — nothing is left to find
 * out, which is why a result bar holds nobody. This half stays open until the
 * reveal: *which way did everyone else go?*
 *
 * Framed against your own answer on purpose. The interesting case is the one
 * where they differ, and calling the room against yourself is the move that
 * makes somebody feel clever — which is the thing worth coming back for.
 */
export function CallStep({
  mine,
  crowdSize,
  busy,
  onCall,
}: {
  mine: Side;
  crowdSize: number;
  busy: boolean;
  onCall: (call: Side) => void;
}) {
  const option = (call: Side) => {
    const love = call === "love";
    const Icon = love ? Heart : HeartBreak;
    return (
      <Button
        key={call}
        bare
        disabled={busy}
        onClick={() => onCall(call)}
        className={cn(
          "snap flex min-h-[6rem] flex-1 flex-col items-center justify-center gap-1 rounded-[var(--r-card)]",
          love
            ? "bg-love-fill/15 text-love hover:bg-love-fill hover:text-on-love"
            : "bg-hate-fill/15 text-hate hover:bg-hate-fill hover:text-on-hate",
        )}
      >
        <Icon weight="fill" className="size-6 transition-transform duration-200 group-hover:scale-125" />
        <span className="display text-xl uppercase">{love ? "Love" : "Hate"}</span>
        <span className="text-[11px] font-bold tracking-wide uppercase opacity-70">
          {call === mine ? "Same as me" : "Against me"}
        </span>
      </Button>
    );
  };

  return (
    <div className="rise card border-2 border-line-2 p-5">
      <div className="flex flex-wrap items-center gap-x-2.5 gap-y-1">
        <Users weight="fill" className="size-4 text-mute" />
        <h2 className="display text-[19px]">Now read the room.</h2>
        <span className="flex-1" />
        <span className="chip">
          <span className="num font-bold text-ink">{crowdSize}</span> answered before you
        </span>
      </div>
      <p className="mt-2 mb-4 max-w-[48ch] text-[14px] leading-snug text-ink-3">
        You said{" "}
        <strong className={mine === "love" ? "text-love" : "text-hate"}>
          {mine === "love" ? "love" : "hate"}
        </strong>
        . Which way did everyone else go?
      </p>
      <div className="flex gap-3">{(["love", "hate"] as const).map(option)}</div>
      <p className="mt-3 flex items-center gap-1.5 text-[12px] text-mute">
        <Fire weight="fill" className="size-3.5 text-streak" />
        Right calls build your streak. Wrong ones end it.
      </p>
    </div>
  );
}
