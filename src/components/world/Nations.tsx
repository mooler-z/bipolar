import { ArrowRight } from "@phosphor-icons/react";

import { cn } from "../../lib/cn";
import { fmtInt } from "../../lib/format";
import { Flag } from "../../ui/Flag";
import { Country, Lean, verdictWord } from "./bars";
import type { Pair } from "./Rivals";
import type { Subject } from "./SubjectsTab";
import type { Verdict } from "./Verdicts";
import { leanFill, nameOf } from "./WorldMap";

/**
 * One nation, in full.
 *
 * What the panel beside the map shows for the country under the pointer:
 * its temperament, how often it breaks from the world, who it gets on with
 * and who it does not, what it loves and hates, and what it makes of the
 * places it has been asked about. A nation is a character, and a card that
 * only showed its lean was a character with one line.
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
  pairs,
  subjects,
}: {
  nation: Nation;
  /** Every verdict this nation has passed, harshest first. */
  verdicts: Verdict[];
  pairs: Pair[];
  subjects: Subject[];
}) {
  const harsh = verdicts.slice(0, 2);
  const warm = [...verdicts].reverse().slice(0, 2).filter((v) => !harsh.includes(v));

  const mine = pairs
    .filter((p) => p.a === nation.code || p.b === nation.code)
    .map((p) => ({ other: p.a === nation.code ? p.b : p.a, agreement: p.agreement }))
    .sort((x, y) => y.agreement - x.agreement);
  const friend = mine[0];
  const enemy = mine.length > 1 ? mine[mine.length - 1] : undefined;

  const likes = subjects
    .filter((s) => s.code === nation.code)
    .sort((x, y) => y.lovePct - x.lovePct);
  const loves = likes.slice(0, 2);
  const hates = [...likes].reverse().slice(0, 2).filter((s) => !loves.includes(s));

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
        <Figure
          label="best friend"
          value={friend ? `${friend.agreement}%` : "—"}
          who={friend?.other}
          tone="text-love"
        />
        <Figure
          label="worst enemy"
          value={enemy ? `${enemy.agreement}%` : "—"}
          who={enemy?.other}
          tone="text-hate"
        />
      </div>

      {loves.length > 0 ? (
        <div className="grid grid-cols-2 gap-4">
          <Tags title="Loves" tone="!text-love" rows={loves} />
          <Tags title="Hates" tone="!text-hate" rows={hates} />
        </div>
      ) : null}

      {harsh.length > 0 ? (
        <div className="grid grid-cols-2 gap-4">
          <Rows title="Thinks least of" tone="!text-hate" rows={harsh} />
          <Rows title="Thinks most of" tone="!text-love" rows={warm} />
        </div>
      ) : (
        <p className="text-[12.5px] text-mute">
          Has not answered enough about any one place to have a verdict on it yet.
        </p>
      )}

      <p className="text-[11.5px] text-mute">Click a second country to put them head to head.</p>
    </div>
  );
}

function Rows({ title, tone, rows }: { title: string; tone: string; rows: Verdict[] }) {
  if (rows.length === 0) return null;
  return (
    <div>
      <p className={`label mb-2 ${tone}`}>{title}</p>
      <ul className="space-y-1">
        {rows.map((v) => (
          <li
            key={v.about}
            className="flex items-center gap-2 rounded-[var(--r-btn)] border border-line bg-surface-2/40 px-2.5 py-1.5"
          >
            <ArrowRight weight="bold" className="size-3 shrink-0 text-mute" />
            <Country code={v.about} />
            <span className="flex-1" />
            <span
              className={cn(
                "num text-[12.5px] font-extrabold",
                v.lovePct >= 50 ? "text-love" : "text-hate",
              )}
            >
              {v.lovePct}%
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}

function Tags({ title, tone, rows }: { title: string; tone: string; rows: Subject[] }) {
  if (rows.length === 0) return null;
  return (
    <div>
      <p className={`label mb-2 ${tone}`}>{title}</p>
      <ul className="flex flex-wrap gap-1.5">
        {rows.map((s) => (
          <li
            key={s.slug}
            className="flex items-center gap-1.5 rounded-[var(--r-pill)] border border-line bg-surface-2/40 px-2.5 py-1 text-[12px]"
          >
            <span className="font-bold text-ink capitalize">{s.slug}</span>
            <span
              className={cn("num font-extrabold", s.lovePct >= 50 ? "text-love" : "text-hate")}
            >
              {s.lovePct >= 50 ? s.lovePct : 100 - s.lovePct}%
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}

export function Figure({
  label,
  value,
  who,
  tone = "text-ink",
}: {
  label: string;
  value: string;
  /** A country the figure is about, shown as its flag. */
  who?: string;
  tone?: string;
}) {
  return (
    <span className="rounded-[var(--r-btn)] border border-line bg-surface-2 px-3 py-2">
      <span className="label block">{label}</span>
      <span className="flex items-center gap-2">
        {who ? <Flag code={who} /> : null}
        <span className={`num text-[clamp(1.1rem,1.8vw,1.5rem)] font-extrabold ${tone}`}>
          {value}
        </span>
        {who ? <span className="num text-[11px] font-bold text-mute">{who}</span> : null}
      </span>
    </span>
  );
}
