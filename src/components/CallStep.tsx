import { Users } from "@phosphor-icons/react";

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
    return (
      <Button
        key={call}
        variant="steel"
        disabled={busy}
        onClick={() => onCall(call)}
        className={cn(
          "gleam punch h-auto min-h-[5rem] flex-1 flex-col gap-1",
          love ? "hover:!bg-love/20" : "hover:!bg-hate/20",
        )}
      >
        <span
          className={cn(
            "display text-lg transition-transform duration-200 group-hover:scale-110",
            love ? "text-love" : "text-hate",
          )}
        >
          {love ? "Love" : "Hate"}
        </span>
        <span className="label">
          {call === mine ? "Same as me" : "Against me"}
        </span>
      </Button>
    );
  };

  return (
    <div className="rise card mt-3 p-4">
      <div className="flex flex-wrap items-center gap-x-2.5 gap-y-1">
        <Users className="size-4 text-mute" />
        <h2 className="text-[17px]">Now read the room</h2>
        <span className="label">{crowdSize} answered before you</span>
      </div>
      <p className="mt-2 mb-4 max-w-[48ch] text-[14px] text-ink-3">
        You said{" "}
        <strong className={mine === "love" ? "text-love" : "text-hate"}>
          {mine === "love" ? "love" : "hate"}
        </strong>
        . Which way did everyone else go? Right calls build your streak.
      </p>
      <div className="flex gap-3">
        {(["love", "hate"] as const).map(option)}
      </div>
    </div>
  );
}
