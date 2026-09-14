import { Crosshair, Fire, Target, Trophy } from "@phosphor-icons/react";

import { cn } from "../../lib/cn";
import { fmtInt } from "../../lib/format";
import { Stamp } from "../../ui/Stamp";

/**
 * The read on your own behaviour — the peak-end artifact.
 *
 * Forty calls are worthless as a list and worth screenshotting as a sentence,
 * so the sentence is the object and the numbers are its evidence. It is a
 * solid coloured panel because it is the one thing on the account page meant
 * to be looked at rather than used — and the evidence under the sentence is
 * four figures on the panel's own colour, not four bordered boxes stacked on
 * top of it.
 *
 * Before five calls there is no read, and it says so with the same five dots
 * the run rail uses: not missing, not finished, and the difference is the
 * whole story.
 */

export type Calls = {
  made: number;
  accuracy: number;
  streak: number;
  bestStreak: number;
  contrarian: number;
  graded: number;
};

const NEEDED = 5;

export function IdentityCard({ calls }: { calls: Calls | null | undefined }) {
  const graded = calls?.graded ?? 0;
  const ready = !!calls && graded >= NEEDED;

  if (!ready) {
    return (
      <div className="flex flex-wrap items-center gap-x-8 gap-y-5">
        <div className="min-w-[16rem] flex-1">
          <h3 className="display text-[clamp(1.4rem,2vw,1.9rem)] text-balance">
            {NEEDED - graded} more {NEEDED - graded === 1 ? "call" : "calls"} and this
            becomes a sentence about you.
          </h3>
          <p className="mt-2 max-w-[46ch] text-[14px] leading-relaxed text-ink-3">
            Call which way the room will go before your vote lands. Five graded
            calls turn this counter into a read on how you think.
          </p>
        </div>
        <div className="shrink-0">
          <span className="flex items-center gap-2">
            {Array.from({ length: NEEDED }, (_, i) => (
              <span
                key={i}
                className={cn(
                  "size-3.5 rounded-full transition-colors",
                  i < graded ? "bg-go-fill" : "bg-surface-3",
                )}
              />
            ))}
          </span>
          <span className="num mt-2 block text-[12px] font-bold text-mute">
            {graded} of {NEEDED} calls
          </span>
          {calls && calls.streak > 0 ? (
            <span className="mt-2 flex items-center gap-1.5 text-[12.5px] font-bold text-streak">
              <Fire weight="fill" className="size-4 flicker" />
              <span className="num">{calls.streak}</span> in a row already
            </span>
          ) : null}
        </div>
      </div>
    );
  }

  const kind =
    calls.contrarian >= 55 ? "contrarian" : calls.contrarian <= 30 ? "room" : "mixed";
  const panel = {
    contrarian: "bg-coin-fill text-on-coin",
    room: "bg-go-fill text-on-go",
    mixed: "bg-surface-3 text-ink",
  }[kind];
  const line = {
    contrarian: "You're a contrarian.",
    room: "You are the room.",
    mixed: "You're hard to place.",
  }[kind];
  const stampWord = {
    contrarian: "Contrarian",
    room: "With the room",
    mixed: "Unreadable",
  }[kind];
  const quiet = kind === "mixed" ? "text-mute" : "opacity-70";

  return (
    <div className={cn("burst relative overflow-hidden rounded-[var(--r-card)] px-6 pt-6 pb-5", panel)}>
      <span className="watermark right-[-0.1em] bottom-[-0.15em] text-[clamp(5rem,10vw,9rem)]">
        {calls.contrarian}%
      </span>

      <h3 className="display relative text-[clamp(1.9rem,3vw,2.9rem)]">{line}</h3>
      <p className={cn("relative mt-2.5 max-w-[48ch] text-[15px] leading-relaxed", kind === "mixed" ? "text-ink-3" : "opacity-85")}>
        You break from the crowd <strong className="num">{calls.contrarian}%</strong> of
        the time, and you read it right <strong className="num">{calls.accuracy}%</strong>{" "}
        of the time across {fmtInt(calls.made)} {calls.made === 1 ? "call" : "calls"}.
      </p>
      <p className="relative mt-4">
        <Stamp tone={kind === "mixed" ? "ink" : "on-fill"}>{stampWord}</Stamp>
      </p>

      {/* The evidence, on the panel's own colour. */}
      <div className="relative mt-7 grid grid-cols-2 gap-y-4 sm:grid-cols-4">
        <Fact icon={<Fire weight="fill" className={cn("size-4", calls.streak > 0 && "flicker")} />} value={fmtInt(calls.streak)} label="streak" quiet={quiet} />
        <Fact icon={<Trophy weight="fill" className="size-4" />} value={fmtInt(calls.bestStreak)} label="best" quiet={quiet} divide />
        <Fact icon={<Target weight="fill" className="size-4" />} value={`${calls.accuracy}%`} label="read right" quiet={quiet} divide />
        <Fact icon={<Crosshair weight="bold" className="size-4" />} value={fmtInt(calls.made)} label="calls" quiet={quiet} divide />
      </div>
    </div>
  );
}

function Fact({
  icon,
  value,
  label,
  quiet,
  divide = false,
}: {
  icon: React.ReactNode;
  value: string;
  label: string;
  quiet: string;
  divide?: boolean;
}) {
  return (
    <span className={cn("flex flex-col gap-1", divide && "sm:border-l sm:border-current/20 sm:pl-4")}>
      <span className={cn("flex items-center gap-1.5 text-[10.5px] font-extrabold tracking-[0.1em] uppercase", quiet)}>
        {icon} {label}
      </span>
      <span className="display num text-[clamp(1.5rem,2vw,2rem)] leading-none">{value}</span>
    </span>
  );
}
