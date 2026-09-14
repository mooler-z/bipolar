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
  onShowDrafts,
}: {
  permissions: string[];
  onShowDrafts: () => void;
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
      className={cn(
        "card flex flex-wrap items-center gap-x-5 gap-y-3 p-4",
        review ? "border-go/35 bg-go/[0.06]" : "border-coin/35 bg-coin/[0.06]",
      )}
    >
      <span
        className={cn(
          "grid size-10 shrink-0 place-items-center rounded-[var(--r-btn)]",
          review ? "bg-go/15 text-go" : "bg-coin/15 text-coin",
        )}
      >
        {review ? (
          <ShieldCheck weight="fill" className="size-5" />
        ) : (
          <Robot weight="fill" className="size-5" />
        )}
      </span>

      <span className="min-w-0 flex-1">
        <span className="block text-[14px] font-bold">
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
          onClick={onShowDrafts}
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
        className={cn(
          "flex shrink-0 items-center gap-0.5 rounded-[var(--r-pill)] border border-line bg-surface-2 p-1",
          !mayChange && "opacity-50",
        )}
      >
        {(["auto", "review"] as const).map((m) => (
          <Button
            key={m}
            bare
            role="switch"
            aria-checked={state.mode === m}
            disabled={!mayChange || busy}
            onClick={() => void flip(m)}
            className={cn(
              "min-h-8 rounded-[var(--r-pill)] px-3.5 text-[12.5px] font-bold transition-colors",
              state.mode === m
                ? m === "review"
                  ? "bg-go text-black"
                  : "bg-coin text-black"
                : "text-mute hover:text-ink",
            )}
          >
            {m === "auto" ? "Auto-publish" : "Review first"}
          </Button>
        ))}
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
