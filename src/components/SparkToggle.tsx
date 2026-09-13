import { useEffect, useState } from "react";
import { Lightning } from "@phosphor-icons/react";

import { cn } from "../lib/cn";
import { Button } from "../ui/Button";

/**
 * Arming the vote — the one control here that spends money.
 *
 * It sits **above** the two answers, at their full width, because it changes
 * what pressing them costs and a price tag underneath the thing it prices is a
 * price tag nobody reads. Tucked in a corner it was missed entirely.
 *
 * Built as a two-way track rather than a checkbox: free on the left, staked on
 * the right, and a slider that travels between them. Landing on the right is
 * treated as an event — the control jolts once, gold washes across it, the bolt
 * snaps to filled, and the balance shows what it is about to become. A knob
 * quietly sliding is the right shape for a preference and the wrong one for
 * fifty cents.
 *
 * The state belongs to the parent because the answers below rim themselves in
 * gold to match: the cost has to be visible where the press happens.
 */
export function SparkToggle({
  armed,
  affordable,
  sparks,
  onChange,
}: {
  armed: boolean;
  affordable: boolean;
  /** Credits in the wallet, so the price is concrete rather than abstract. */
  sparks?: number;
  onChange: (armed: boolean) => void;
}) {
  const [struck, setStruck] = useState(0);
  const locked = !affordable && !armed;

  // Fires however the state changed — the keyboard arms this too.
  useEffect(() => {
    if (armed) setStruck((n) => n + 1);
  }, [armed]);

  return (
    <div
      key={armed ? `armed-${struck}` : "free"}
      className={cn(
        "relative isolate flex h-14 items-center overflow-hidden rounded-[var(--r-btn)]",
        "border-2 p-1 transition-[border-color] duration-300",
        armed ? "jolt border-coin bg-coin/10" : "border-line bg-surface-2",
        locked && "opacity-45",
      )}
    >
      {/* The slider. One object that travels, so the two states are plainly
          the same control rather than two different ones. */}
      <span
        aria-hidden
        className={cn(
          "absolute inset-y-1 left-1 -z-10 w-[calc(50%-0.25rem)] rounded-[9px]",
          "transition-transform duration-300 ease-out",
          armed ? "translate-x-full bg-coin" : "translate-x-0 bg-surface-3",
        )}
      />

      {armed ? <span key={struck} aria-hidden className="gold-wash" /> : null}

      <Button
        bare
        role="switch"
        aria-checked={!armed}
        aria-label="Vote for free"
        onClick={() => onChange(false)}
        className={cn(
          "relative z-10 h-full flex-1 rounded-[9px] text-[13.5px] transition-colors duration-300",
          armed ? "text-mute hover:text-ink-3" : "text-ink",
        )}
      >
        Free vote
      </Button>

      <Button
        bare
        role="switch"
        aria-checked={armed}
        aria-label="Back this vote with 50 cents"
        disabled={locked}
        title={affordable ? undefined : "Not enough credit to back a topic"}
        onClick={() => onChange(true)}
        className={cn(
          "relative z-10 flex h-full flex-1 items-center justify-center gap-2 rounded-[9px]",
          "text-[13.5px] transition-colors duration-300",
          armed ? "text-black" : "text-ink-3 hover:text-ink",
        )}
      >
        <Lightning
          key={struck}
          weight={armed ? "fill" : "regular"}
          className={cn("size-4", armed && "bolt-strike")}
        />
        {locked ? "Out of credit" : "Back it"}
        <span
          className={cn(
            "rounded-[5px] px-1.5 py-0.5 text-[11px] font-extrabold",
            armed ? "bg-black/15" : "bg-coin/15 text-coin",
          )}
        >
          50&cent;
        </span>
      </Button>

      {/* What it costs, in credits, on the right where a total belongs. */}
      <span className="relative z-10 hidden shrink-0 items-center gap-2 px-3 sm:flex">
        {sparks !== undefined ? (
          <span className="num text-[12px] font-bold text-mute">
            {armed ? (
              <>
                {sparks} <span className="text-coin">&rarr;</span>{" "}
                <span className="text-coin">{Math.max(0, sparks - 1)}</span>
              </>
            ) : (
              <>{sparks} left</>
            )}
          </span>
        ) : null}
        <kbd className="rounded-[5px] bg-surface-3 px-1.5 py-0.5 text-[10px] font-bold text-mute">
          space
        </kbd>
      </span>
    </div>
  );
}
