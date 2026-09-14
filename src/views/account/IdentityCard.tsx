import { Crosshair, Fire, Target, Trophy } from "@phosphor-icons/react";

import { cn } from "../../lib/cn";
import { Stamp } from "../../ui/Stamp";
import { Tile } from "../../ui/Tile";

/**
 * The read on your own behaviour — the peak-end artifact.
 *
 * Forty calls are worthless as a list and worth screenshotting as a sentence,
 * so the sentence is the object and the numbers are its evidence. It is a
 * solid coloured panel because it is the one thing on the account page meant
 * to be looked at rather than used.
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
      <section className="card flex flex-col p-5">
        <span className="label flex items-center gap-1.5">
          <Target className="size-3.5 text-go" /> Your read
        </span>
        <h3 className="display mt-3 text-[clamp(1.3rem,1.8vw,1.75rem)]">
          {NEEDED - graded} more {NEEDED - graded === 1 ? "call" : "calls"} and
          this becomes a sentence about you.
        </h3>
        <p className="mt-2 max-w-[44ch] text-[14px] leading-relaxed text-ink-3">
          Call which way the room will go before your vote lands. Five graded
          calls turn this counter into a read on how you think.
        </p>
        <div className="mt-5 flex items-center gap-3">
          <span className="bar flex-1">
            <span
              className="bar-fill"
              style={{ width: `${Math.max(4, Math.min(100, (graded / NEEDED) * 100))}%` }}
            />
          </span>
          <span className="num text-[13px] font-bold text-mute">
            {graded}/{NEEDED}
          </span>
        </div>
        {calls && calls.streak > 0 ? (
          <p className="mt-4 flex items-center gap-2 text-[13px] font-bold text-streak">
            <Fire weight="fill" className="size-4 flicker" />
            <span className="num">{calls.streak}</span> in a row already
          </p>
        ) : null}
      </section>
    );
  }

  const kind =
    calls.contrarian >= 55 ? "contrarian" : calls.contrarian <= 30 ? "room" : "mixed";
  const panel = {
    contrarian: "bg-coin-fill text-on-coin",
    room: "bg-go-fill text-on-go",
    mixed: "bg-surface text-ink border border-line",
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

  return (
    <section className={cn("burst relative overflow-hidden rounded-[var(--r-card)] p-5", panel)}>
      <span className="watermark right-[-0.1em] bottom-[-0.15em] text-[clamp(5rem,9vw,8rem)]">
        {calls.contrarian}%
      </span>

      <span className={cn("relative flex items-center gap-1.5 text-[11px] font-extrabold tracking-[0.06em] uppercase", kind === "mixed" ? "text-mute" : "opacity-70")}>
        <Crosshair weight="bold" className="size-3.5" /> Your read
      </span>
      <h3 className="display relative mt-3 text-[clamp(1.75rem,2.6vw,2.5rem)]">
        {line}
      </h3>
      <p className={cn("relative mt-2.5 max-w-[46ch] text-[15px] leading-relaxed", kind === "mixed" ? "text-ink-3" : "opacity-80")}>
        You break from the crowd{" "}
        <strong className="num">{calls.contrarian}%</strong> of the time, and you
        read it right <strong className="num">{calls.accuracy}%</strong> of the
        time across {calls.made} {calls.made === 1 ? "call" : "calls"}.
      </p>
      <p className="relative mt-4">
        <Stamp tone={kind === "mixed" ? "ink" : "on-fill"}>{stampWord}</Stamp>
      </p>

      <div className="relative mt-6 grid grid-cols-2 gap-2.5 md:grid-cols-4">
        <Tile
          icon={<Fire weight="fill" className={cn("size-3.5", calls.streak > 0 && "flicker")} />}
          value={calls.streak}
          label="Streak"
          tone="streak"
          delay={0}
        />
        <Tile
          icon={<Trophy weight="fill" className="size-3.5" />}
          value={calls.bestStreak}
          label="Best"
          tone="coin"
          delay={90}
        />
        <Tile
          icon={<Target weight="fill" className="size-3.5" />}
          value={`${calls.accuracy}%`}
          label="Read right"
          tone="go"
          delay={180}
        />
        <Tile
          icon={<Crosshair weight="bold" className="size-3.5" />}
          value={calls.made}
          label="Calls"
          delay={270}
        />
      </div>
    </section>
  );
}
