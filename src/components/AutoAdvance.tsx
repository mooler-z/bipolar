import { useEffect, useRef, useState } from "react";
import { Pause, Play } from "@phosphor-icons/react";

import { cn } from "../lib/cn";
import type { Side } from "../lib/format";
import { Button } from "../ui/Button";

/**
 * The countdown that moves the run along by itself.
 *
 * A result is a full stop unless something carries you out of it, and asking
 * somebody to press "next" forty times is asking them to decide forty times
 * whether to keep going. One block per second drains, and then it goes.
 *
 * It yields to anybody who shows interest: hovering pauses it, so does writing
 * a comment, so does leaving the tab. It can be stopped outright, and the
 * pause is visible — a countdown you cannot see or stop is a countdown that
 * ends the session, and that is the line between a stopping cue removed
 * honestly and one removed on the sly.
 */
export function AutoAdvance({
  seconds = 8,
  side,
  paused: heldOutside = false,
  onDone,
  className,
}: {
  seconds?: number;
  side: Side;
  paused?: boolean;
  onDone: () => void;
  className?: string;
}) {
  const [left, setLeft] = useState(seconds);
  const [hovering, setHovering] = useState(false);
  const [hidden, setHidden] = useState(() => document.visibilityState === "hidden");
  const [off, setOff] = useState(false);
  const done = useRef(onDone);
  done.current = onDone;

  const paused = hovering || heldOutside || hidden || off;

  useEffect(() => {
    const onVis = () => setHidden(document.visibilityState === "hidden");
    document.addEventListener("visibilitychange", onVis);
    return () => document.removeEventListener("visibilitychange", onVis);
  }, []);

  useEffect(() => {
    if (paused) return;
    if (left <= 0) {
      done.current();
      return;
    }
    const id = window.setTimeout(() => setLeft((s) => s - 1), 1000);
    return () => window.clearTimeout(id);
  }, [left, paused]);

  const fill = side === "love" ? "bg-love-fill" : "bg-hate-fill";

  return (
    <div
      className={cn("flex min-w-0 flex-1 items-center gap-2.5", className)}
      onMouseEnter={() => setHovering(true)}
      onMouseLeave={() => setHovering(false)}
    >
      <span
        className={cn(
          "num grid size-8 shrink-0 place-items-center rounded-[var(--r-sm)] text-[13px] font-extrabold transition-colors",
          off ? "bg-surface-3 text-mute" : paused ? "bg-surface-4 text-ink-3" : cn(fill, side === "love" ? "text-on-love" : "text-on-hate"),
        )}
      >
        {off ? <Play weight="fill" className="size-3.5" /> : paused ? <Pause weight="fill" className="size-3.5" /> : Math.max(0, left)}
      </span>

      {/* One block per second, draining right to left. */}
      <span className="flex min-w-0 flex-1 gap-[3px]">
        {Array.from({ length: seconds }, (_, i) => (
          <span
            key={i}
            className={cn(
              "h-2.5 flex-1 rounded-full transition-colors duration-300",
              off ? "bg-surface-2" : i < left ? (paused ? "bg-surface-4" : fill) : "bg-surface-2",
            )}
          />
        ))}
      </span>

      <Button
        variant="link"
        size="sm"
        className="!min-h-0 shrink-0 !px-0 text-[12px] no-underline"
        onClick={() => setOff((o) => !o)}
      >
        {off ? "auto-advance off" : paused ? "paused" : "stop"}
      </Button>
    </div>
  );
}
