import { useState } from "react";
import { useMutation, useQuery } from "convex/react";
import { Broadcast, Warning } from "@phosphor-icons/react";

import { api } from "../../../convex/_generated/api";
import { cn } from "../../lib/cn";
import { fmtInt } from "../../lib/format";
import { Button } from "../../ui/Button";

/**
 * The demo room, on a switch.
 *
 * An empty live rail is the hardest thing to demonstrate past: this product
 * is a crowd, and a crowd that has not said anything in four hours looks like
 * a product nobody uses. Turning this on lets the demo accounts keep voting,
 * arguing and agreeing several times a second, so the rail fills the way it
 * would if twenty countries were awake.
 *
 * "Starting…" rather than "Running" until a beat has actually landed — the
 * switch being on and the room actually moving are two different facts, and
 * conflating them is how a broken simulation looks fine on the page.
 *
 * **It says what it is, loudly.** The panel is gold rather than quiet, the
 * word "fabricated" appears on it, and every flick of the switch writes a
 * line in the record. A demo mode that is easy to forget about is a demo
 * mode somebody eventually shows a judge without meaning to.
 */
export function Simulate({ permissions }: { permissions: string[] }) {
  const sim = useQuery(api.simulate.state);
  const set = useMutation(api.simulate.set);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  if (!permissions.includes("settings:manage") || sim === undefined) return null;

  async function change(on: boolean, rate?: number) {
    setBusy(true);
    setError("");
    try {
      await set({ on, rate });
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setBusy(false);
    }
  }

  return (
    <section
      className={cn(
        "rounded-[var(--r-card)] border-2 p-4",
        sim.on ? "border-coin-fill bg-coin-fill/[0.08]" : "border-line bg-surface-2",
      )}
    >
      <div className="flex flex-wrap items-center gap-3">
        <span
          className={cn(
            "grid size-9 shrink-0 place-items-center rounded-[var(--r-btn)]",
            sim.on ? "bg-coin-fill text-on-coin" : "bg-surface-3 text-mute",
          )}
        >
          <Broadcast weight="fill" className={cn("size-4", sim.beating && "pulse-dot")} />
        </span>
        <span className="min-w-0 flex-1">
          <span className="block text-[13.5px] font-extrabold text-ink">
            Simulated activity
          </span>
          <span className="block text-[12px] text-mute">
            {sim.on ? (
              <>
                {sim.beating ? "Running" : "Starting…"} — <span className="num font-bold text-coin">{sim.rate}</span>{" "}
                acts a second from <span className="num font-bold">{fmtInt(sim.voices)}</span> demo
                accounts.
              </>
            ) : (
              <>
                Off. <span className="num font-bold">{fmtInt(sim.voices)}</span> demo accounts are
                available to it.
              </>
            )}
          </span>
        </span>

        <Button
          variant={sim.on ? "steel" : "coin"}
          size="sm"
          disabled={busy || sim.voices === 0}
          onClick={() => void change(!sim.on)}
        >
          {sim.on ? "Stop" : "Start"}
        </Button>
      </div>

      {sim.on ? (
        <div className="mt-3 flex flex-wrap items-center gap-1.5 border-t border-coin-fill/25 pt-3">
          <span className="label mr-1">Rate</span>
          {[1, 3, 5, 10].map((n) => (
            <Button
              key={n}
              size="sm"
              variant={sim.rate === n ? "coin" : "steel"}
              disabled={busy}
              onClick={() => void change(true, n)}
              className="!min-h-8 !px-2.5 !text-[11.5px]"
            >
              {n}/sec
            </Button>
          ))}
        </div>
      ) : null}

      <p className="mt-3 flex items-start gap-2 text-[11.5px] leading-snug text-mute">
        <Warning weight="fill" className="mt-0.5 size-3.5 shrink-0 text-coin" />
        Every vote, comment and like it writes is <strong className="text-ink-3">fabricated</strong>,
        from accounts stamped <span className="key">seed:</span> and named “(demo)”. They go
        through the same transactions a real one does, so the counters stay honest — and{" "}
        <span className="key">seedWipe:wipe</span> removes them. Each flick of this switch is in
        the record.
      </p>

      {sim.voices === 0 ? (
        <p className="mt-2 text-[11.5px] text-mute">
          There are no demo accounts yet. Run <span className="key">seedWorld:run</span> first.
        </p>
      ) : null}

      {error ? (
        <p className="mt-2 rounded-[var(--r-btn)] bg-love-fill/15 px-2.5 py-1.5 text-[12px] font-semibold text-love">
          {error}
        </p>
      ) : null}
    </section>
  );
}
