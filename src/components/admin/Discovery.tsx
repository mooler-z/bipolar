import { useState } from "react";
import { useMutation, useQuery } from "convex/react";
import { CheckCircle, Robot, ShieldCheck, Warning } from "@phosphor-icons/react";

import { api } from "../../../convex/_generated/api";
import { cn } from "../../lib/cn";
import { fmtInt } from "../../lib/format";
import { Button } from "../../ui/Button";

/**
 * Who decides what the public sees.
 *
 * Two modes, stated in the plainest words available, because this is the single
 * most consequential switch in the product:
 *
 * - **Auto** — the crawler publishes to your site.
 * - **Review** — the crawler proposes to you.
 *
 * The run rate is read off the server and derived from the cadence rather than
 * written here. A console that hardcodes the number it exists to report is a
 * console that will one day report the wrong one.
 */
export function Discovery({
  permissions,
  onShowQueue,
}: {
  permissions: string[];
  /** The queue is its own section now; the count here is the way into it. */
  onShowQueue: () => void;
}) {
  const state = useQuery(api.settings.discovery);
  const setMode = useMutation(api.settings.setDiscoveryMode);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  const mayChange = permissions.includes("settings:manage");
  if (!state) return <div className="shimmer h-[5.5rem] rounded-[var(--r-card)]" />;

  const review = state.mode === "review";

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
    <section
      style={{ animationDelay: "120ms" }}
      className={cn(
        "tile tile-in flex flex-wrap items-center gap-x-5 gap-y-3",
        review ? "!border-go-fill/50 bg-go-fill/[0.06]" : "!border-coin-fill/50 bg-coin-fill/[0.06]",
      )}
    >
      <span
        className={cn(
          "grid size-10 shrink-0 place-items-center rounded-[var(--r-btn)]",
          review ? "bg-go-fill/15 text-go" : "bg-coin-fill/15 text-coin",
        )}
      >
        {review ? (
          <ShieldCheck weight="fill" className="size-5" />
        ) : (
          <Robot weight="fill" className="size-5" />
        )}
      </span>

      <span className="min-w-0 flex-1">
        <span className="display block text-[15px]">
          {review
            ? "Discovery proposes — a moderator publishes"
            : "Discovery publishes on its own"}
        </span>
        <span className="mt-0.5 block text-[12.5px] leading-snug text-mute">
          Every {state.everyHours} hours, {fmtInt(state.runsPerDay)}{" "}
          {state.runsPerDay === 1 ? "run" : "runs"} a day.{" "}
          {review
            ? "New topics land as drafts and stay off the site until approved."
            : "A drafted topic that clears the polarizing floor goes straight into the feed, unread."}
        </span>
      </span>

      {state.pending > 0 ? (
        <Button
          variant={review ? "go" : "steel"}
          size="sm"
          onClick={onShowQueue}
          className="shrink-0"
        >
          <CheckCircle className="size-4" />
          {fmtInt(state.pending)} waiting
        </Button>
      ) : null}

      {/* A two-way track, not a checkbox — the same shape as the spark switch,
          for the same reason: both states are a real choice, and neither is a
          setting you leave alone by accident. */}
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
          return (
            <Button
              key={m}
              bare
              role="radio"
              aria-checked={on}
              disabled={!mayChange || busy}
              onClick={() => void flip(m)}
              className={cn(
                "relative min-h-9 rounded-[9px] px-3.5 text-[12.5px] font-extrabold transition-[background-color,color,transform] duration-150",
                on ? "bg-surface-4 text-ink" : "text-mute hover:bg-surface-3/70 hover:text-ink-3",
                on && !busy && "pop-in",
              )}
            >
              {m === "auto" ? "Auto-publish" : "Review first"}
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

      {!mayChange ? (
        <span className="w-full text-[11.5px] text-mute">
          Only an admin can change this.
        </span>
      ) : null}

      {error ? (
        <span className="flex w-full items-center gap-2 text-[12.5px] font-semibold text-love">
          <Warning weight="fill" className="size-3.5" /> {error}
        </span>
      ) : null}
    </section>
  );
}
