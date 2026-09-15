import { ArrowRight } from "@phosphor-icons/react";

import { fmtInt } from "../../lib/format";
import { Flag } from "../../ui/Flag";
import { Country, Lean, verdictWord } from "./bars";
import type { Verdict } from "./Verdicts";
import { leanFill, nameOf } from "./WorldMap";

/**
 * One nation, in full.
 *
 * What the panel beside the map shows when a country is under the pointer or
 * pinned: its temperament, how often it breaks from the world, and what it
 * makes of the places it has been asked about. The map says where; this says
 * what.
 */

export type Nation = {
  code: string;
  votes: number;
  lovePct: number;
  topics: number;
  contrary: number;
};

/** The map's colour for a nation: its lean, faded by how little is behind it. */
export function nationFill(n: Nation | undefined): string | null {
  if (!n) return null;
  return leanFill(n.lovePct, Math.min(100, 45 + n.votes * 2));
}

export function NationCard({
  nation,
  verdicts,
}: {
  nation: Nation;
  /** Every verdict this nation has passed, harshest first. */
  verdicts: Verdict[];
}) {
  const harsh = verdicts.slice(0, 3);
  const warm = [...verdicts].reverse().slice(0, 3).filter((v) => !harsh.includes(v));

  return (
    <div className="rise space-y-5">
      <div className="flex items-center gap-4">
        <Flag code={nation.code} size="h-12 w-16" />
        <div className="min-w-0">
          <p className="display truncate text-[clamp(1.4rem,2.2vw,2rem)] text-ink">
            {nameOf(nation.code)}
          </p>
          <p className="text-[13px] text-ink-3">
            <span className="font-bold text-ink">{verdictWord(nation.lovePct)}</span> what it has
            been shown
            <span className="text-mute"> · {fmtInt(nation.topics)} questions</span>
          </p>
        </div>
      </div>

      <Lean lovePct={nation.lovePct} votes={nation.votes} />

      <div className="grid grid-cols-2 gap-2">
        <Figure label="against the world" value={`${nation.contrary}%`} tone="text-streak" />
        <Figure label="questions answered" value={fmtInt(nation.topics)} />
      </div>

      {harsh.length > 0 ? (
        <div>
          <p className="label mb-2 !text-hate">Thinks least of</p>
          <ul className="space-y-1">
            {harsh.map((v) => (
              <Row key={v.about} v={v} />
            ))}
          </ul>
        </div>
      ) : (
        <p className="text-[12.5px] text-mute">
          Has not answered enough about any one place to have a verdict on it yet.
        </p>
      )}

      {warm.length > 0 ? (
        <div>
          <p className="label mb-2 !text-love">Thinks most of</p>
          <ul className="space-y-1">
            {warm.map((v) => (
              <Row key={v.about} v={v} />
            ))}
          </ul>
        </div>
      ) : null}
    </div>
  );
}

function Row({ v }: { v: Verdict }) {
  return (
    <li className="flex items-center gap-2 rounded-[var(--r-btn)] border border-line bg-surface-2/40 px-2.5 py-1.5">
      <ArrowRight weight="bold" className="size-3 shrink-0 text-mute" />
      <Country code={v.about} />
      <span className="min-w-0 flex-1 truncate text-[12px] text-ink-3">
        {verdictWord(v.lovePct)}
      </span>
      <span
        className={`num text-[12.5px] font-extrabold ${v.lovePct >= 50 ? "text-love" : "text-hate"}`}
      >
        {v.lovePct}%
      </span>
    </li>
  );
}

export function Figure({
  label,
  value,
  tone = "text-ink",
}: {
  label: string;
  value: string;
  tone?: string;
}) {
  return (
    <span className="rounded-[var(--r-btn)] border border-line bg-surface-2 px-3 py-2">
      <span className="label block">{label}</span>
      <span className={`num block text-[clamp(1.1rem,1.8vw,1.5rem)] font-extrabold ${tone}`}>
        {value}
      </span>
    </span>
  );
}
