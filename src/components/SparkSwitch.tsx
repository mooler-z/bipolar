import { useEffect, useState } from "react";
import { Lightning } from "@phosphor-icons/react";

import { cn } from "../lib/cn";
import { Button } from "../ui/Button";

/**
 * Arming the vote — the one control here that spends money.
 *
 * A physical switch, because a switch is the one control everybody already
 * knows is for flipping: a track, a knob, and a label that says what the
 * knob does. Off, the knob nudges toward "on" as the cursor arrives — the
 * control asks to be tried. On, the track turns gold, the knob slides across
 * carrying the bolt, the whole thing jolts once, and the two cards under it
 * put a price sticker on their corners. The cost is visible where the press
 * happens, which is the only place a price is ever read.
 */
export function SparkSwitch({
  armed,
  affordable,
  sparks,
  onChange,
  onEmpty,
}: {
  armed: boolean;
  affordable: boolean;
  /** Credits in the wallet, so the price is concrete rather than abstract. */
  sparks?: number;
  onChange: (armed: boolean) => void;
  /** Out of credit and asked to arm anyway: where to send them. */
  onEmpty?: () => void;
}) {
  const [struck, setStruck] = useState(0);
  const locked = !affordable && !armed;

  // Fires however the state changed — the keyboard arms this too.
  useEffect(() => {
    if (armed) setStruck((n) => n + 1);
  }, [armed]);

  return (
    <div className="flex items-center gap-3">
      <Button
        key={armed ? `armed-${struck}` : "free"}
        bare
        role="switch"
        aria-checked={armed}
        aria-label={
          locked
            ? "Out of sparks — get more"
            : armed
              ? "Backed with 50 cents — press to make it free"
              : "Back this vote with 50 cents"
        }
        onClick={() => (locked ? onEmpty?.() : onChange(!armed))}
        className={cn(
          "group/sw relative flex items-center gap-3 overflow-hidden rounded-[var(--r-btn)] border-2 py-1.5 pr-4 pl-2",
          "transition-[border-color,background-color,transform] duration-200 hover:-translate-y-0.5 active:translate-y-0 active:scale-[0.98]",
          armed
            ? "jolt border-coin-fill bg-coin-fill/12"
            : locked
              ? "border-line bg-surface-2 hover:border-coin-fill/50"
              : "border-line-2 bg-surface-2 hover:border-coin-fill/70 hover:bg-surface-3",
        )}
      >
        {armed ? <span key={struck} aria-hidden className="gold-wash" /> : null}

        {/* The track and the knob. */}
        <span
          aria-hidden
          className={cn(
            "relative h-7 w-12 shrink-0 rounded-full transition-colors duration-300",
            armed ? "bg-coin-fill" : locked ? "bg-surface-3" : "bg-surface-4",
          )}
        >
          <span
            className={cn(
              "absolute top-1 left-1 grid size-5 place-items-center rounded-full bg-ink text-canvas",
              "transition-transform duration-300 ease-[cubic-bezier(0.34,1.56,0.64,1)]",
              armed ? "translate-x-5" : "translate-x-0 group-hover/sw:translate-x-1.5",
            )}
          >
            <Lightning
              key={struck}
              weight="fill"
              className={cn("size-3", armed ? "bolt-strike text-coin-deep" : "text-mute")}
            />
          </span>
        </span>

        <span className="flex flex-col items-start leading-tight">
          <span className={cn("text-[13px] font-extrabold", armed ? "text-coin" : locked ? "text-mute" : "text-ink")}>
            {locked ? "Out of sparks" : armed ? "Backed · 50¢" : "Back it · 50¢"}
          </span>
          <span className="text-[11px] text-mute">
            {locked ? "Get more to be counted" : armed ? "Counted among the Committed" : "Count among the Committed"}
          </span>
        </span>
      </Button>

      <span className="hidden text-[12px] text-mute lg:block">
        {armed ? "The Crowd is free. You are on the record." : "Free votes are the Crowd. A spark is a conviction."}
      </span>

      <span className="flex-1" />

      <span className="flex shrink-0 items-center gap-2">
        {sparks !== undefined ? (
          <span className="num text-[12px] font-bold text-mute">
            {armed ? (
              <>
                {sparks} <span className="text-coin">&rarr;</span>{" "}
                <span className="text-coin">{Math.max(0, sparks - 1)}</span>
              </>
            ) : (
              <>
                <Lightning weight="fill" className="mr-0.5 inline size-3 align-[-2px] text-coin" />
                {sparks} {sparks === 1 ? "spark" : "sparks"}
              </>
            )}
          </span>
        ) : null}
        <kbd className="key">space</kbd>
      </span>
    </div>
  );
}
