import { useEffect, useRef, useState } from "react";

import { cn } from "../lib/cn";
import type { Side } from "../lib/format";
import { Button } from "../ui/Button";
import { Label } from "../ui/Label";

/**
 * The countdown that moves the run along by itself.
 *
 * A result is a full stop unless something carries you out of it, and asking
 * somebody to press "next" forty times is asking them to decide forty times
 * whether to keep going. The track drains, and then it goes.
 *
 * It yields to anybody who shows interest: hovering pauses it, and so does
 * writing a comment — advancing out from under a half-typed sentence would be
 * the rudest thing this app could do. Pausing is visible, and it can be
 * stopped outright, because a countdown you cannot stop is a countdown that
 * ends the session.
 */
export function AutoAdvance({
  seconds = 8,
  side,
  paused: heldOutside = false,
  onDone,
}: {
  seconds?: number;
  side: Side;
  paused?: boolean;
  onDone: () => void;
}) {
  const [left, setLeft] = useState(seconds);
  const [hovering, setHovering] = useState(false);
  const [off, setOff] = useState(false);
  const done = useRef(onDone);
  done.current = onDone;

  const paused = hovering || heldOutside || off;

  useEffect(() => {
    if (paused) return;
    if (left <= 0) {
      done.current();
      return;
    }
    const id = window.setTimeout(() => setLeft((s) => s - 1), 1000);
    return () => window.clearTimeout(id);
  }, [left, paused]);

  if (off) {
    return (
      <p className="mt-5">
        <Label>Auto-advance off — use Next, or press N.</Label>
      </p>
    );
  }

  const fill = side === "love" ? "bg-love" : "bg-hate";

  return (
    <div
      className="mt-5 flex items-center gap-3"
      onMouseEnter={() => setHovering(true)}
      onMouseLeave={() => setHovering(false)}
    >
      <span
        className={cn(
          "num grid size-8 shrink-0 place-items-center rounded-[var(--r-sm)] text-[13px] font-bold transition-colors",
          paused ? "bg-surface-3 text-mute" : cn(fill, "text-white"),
        )}
      >
        {Math.max(0, left)}
      </span>

      {/* One block per second, draining right to left. */}
      <span className="flex flex-1 items-center gap-1">
        {Array.from({ length: seconds }, (_, i) => (
          <span
            key={i}
            className={cn(
              "h-2 flex-1 rounded-[var(--r-pill)] transition-colors duration-300",
              i < left
                ? paused
                  ? "bg-surface-3"
                  : fill
                : "bg-surface-2",
            )}
          />
        ))}
      </span>

      <Label className="shrink-0">{paused ? "Paused" : "Next in"}</Label>
      <Button
        variant="link"
        size="sm"
        className="!min-h-0 shrink-0 !px-0 text-[12px]"
        onClick={() => setOff(true)}
      >
        stop
      </Button>
    </div>
  );
}
