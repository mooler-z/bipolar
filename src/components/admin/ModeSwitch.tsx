import { useState } from "react";
import { useMutation, useQuery } from "convex/react";
import { Robot, ShieldCheck, Warning } from "@phosphor-icons/react";

import { api } from "../../../convex/_generated/api";
import { cn } from "../../lib/cn";
import { Button } from "../../ui/Button";

/**
 * Who decides what the public sees.
 *
 * Two modes, in the plainest words available, because this is the single most
 * consequential switch in the product:
 *
 * - **Auto** — the crawler publishes to your site.
 * - **Review** — the crawler proposes to you.
 *
 * Its own component because it belongs on more than one screen. It is the
 * setting the overview is *about*, and it is also the thing a moderator
 * standing in front of a queue of drafts wants to reach without going to look
 * for it. One component, two placements, no chance of the two disagreeing.
 *
 * A two-way track rather than a checkbox, the same shape as the spark switch
 * and for the same reason: both states are a real choice, and neither is a
 * setting you leave alone by accident.
 */
export function ModeSwitch({
  permissions,
  compact = false,
}: {
  permissions: string[];
  /** The toolbar shape: initials only, no explanation underneath. */
  compact?: boolean;
}) {
  const state = useQuery(api.settings.discovery);
  const setMode = useMutation(api.settings.setDiscoveryMode);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  const mayChange = permissions.includes("settings:manage");
  if (!state) {
    return (
      <span
        className={cn(
          "shimmer block rounded-[var(--r-btn)]",
          compact ? "h-9 w-40" : "h-11 w-56",
        )}
      />
    );
  }

  async function flip(next: "auto" | "review") {
    setBusy(true);
    setError("");
    try {
      await setMode({ mode: next });
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setBusy(false);
    }
  }

  return (
    <span className="inline-flex flex-col items-start gap-1">
      <span
        role="radiogroup"
        aria-label="Discovery mode"
        className={cn(
          "flex shrink-0 items-center gap-1 rounded-[var(--r-btn)] bg-surface-2 p-1",
          !mayChange && "opacity-50",
        )}
      >
        {(["auto", "review"] as const).map((m) => {
          const on = state.mode === m;
          const Icon = m === "auto" ? Robot : ShieldCheck;
          return (
            <Button
              key={m}
              bare
              role="radio"
              aria-checked={on}
              disabled={!mayChange || busy}
              onClick={() => void flip(m)}
              title={
                m === "auto"
                  ? "New topics go straight into the feed"
                  : "New topics wait in the review queue"
              }
              className={cn(
                "relative flex items-center gap-1.5 rounded-[9px] font-extrabold",
                "transition-[background-color,color,transform] duration-150",
                compact ? "min-h-8 px-2.5 text-[12px]" : "min-h-9 px-3.5 text-[12.5px]",
                on ? "bg-surface-4 text-ink" : "text-mute hover:bg-surface-3/70 hover:text-ink-3",
                on && !busy && "pop-in",
              )}
            >
              <Icon weight={on ? "fill" : "regular"} className="size-3.5" />
              {m === "auto"
                ? compact
                  ? "Auto"
                  : "Auto-publish"
                : compact
                  ? "Review"
                  : "Review first"}
              <span
                aria-hidden
                className={cn(
                  "absolute inset-x-2.5 bottom-0 h-[3px] rounded-full transition-colors",
                  on ? (m === "review" ? "bg-go-fill" : "bg-coin-fill") : "bg-transparent",
                )}
              />
            </Button>
          );
        })}
      </span>

      {!mayChange && !compact ? (
        <span className="text-[11.5px] text-mute">Only an admin can change this.</span>
      ) : null}
      {error ? (
        <span className="flex items-center gap-1.5 text-[12px] font-semibold text-love">
          <Warning weight="fill" className="size-3.5" /> {error}
        </span>
      ) : null}
    </span>
  );
}
