import { ArrowRight, Lightning } from "@phosphor-icons/react";

import { cn } from "../../lib/cn";
import { fmtInt } from "../../lib/format";
import { Flag } from "../../ui/Flag";
import { verdictWord } from "./bars";
import type { Nation } from "./Nations";
import type { Pair } from "./Rivals";
import type { Subject } from "./SubjectsTab";
import type { Verdict } from "./Verdicts";
import { nameOf } from "./WorldMap";

/**
 * Two countries, head to head.
 *
 * The second click on the map. One nation alone has a mood and a few
 * verdicts; two have a relationship — how often they agree, what each thinks
 * of the other, and the subjects they fight about. That last one is the fun
 * row, and it is only possible because a lean is kept per country per subject:
 * "they agree on football and fight about politics" is a sentence a table of
 * totals cannot say.
 *
 * Everything here is a difference between two aggregates, so it reveals
 * nothing either aggregate did not already.
 */
export function Versus({
  a,
  b,
  pairs,
  verdicts,
  subjects,
}: {
  a: Nation;
  b: Nation;
  pairs: Pair[];
  verdicts: Verdict[];
  subjects: Subject[];
}) {
  const pair = pairs.find(
    (p) => (p.a === a.code && p.b === b.code) || (p.a === b.code && p.b === a.code),
  );
  const aOnB = verdicts.find((v) => v.from === a.code && v.about === b.code);
  const bOnA = verdicts.find((v) => v.from === b.code && v.about === a.code);

  /* The subjects both have a lean on, ordered by how far apart they are. The
     top is what they fight about; the bottom is what they would agree on at
     dinner. */
  const mine = new Map(subjects.filter((s) => s.code === a.code).map((s) => [s.slug, s]));
  const shared = subjects
    .filter((s) => s.code === b.code && mine.has(s.slug))
    .map((s) => ({ slug: s.slug, a: mine.get(s.slug)!.lovePct, b: s.lovePct }))
    .map((s) => ({ ...s, gap: Math.abs(s.a - s.b) }))
    .sort((x, y) => y.gap - x.gap);
  const fights = shared.slice(0, 3);
  const agrees = [...shared].reverse().slice(0, 3).filter((s) => !fights.includes(s));

  return (
    <div className="rise space-y-5">
      {/* The two of them, and the one number between them. */}
      <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-3">
        <Side n={a} tone="text-coin" />
        <div className="text-center">
          {pair ? (
            <>
              <span className="num display block text-[clamp(2rem,4vw,3.2rem)] leading-none text-ink">
                {pair.agreement}%
              </span>
              <span className="label block">agree</span>
              <span className="num block text-[11px] text-mute">{fmtInt(pair.shared)} shared</span>
            </>
          ) : (
            <>
              <span className="display block text-[clamp(1.2rem,2vw,1.6rem)] text-mute">VS</span>
              <span className="block max-w-[9rem] text-[11px] leading-snug text-mute">
                not enough questions in common yet
              </span>
            </>
          )}
        </div>
        <Side n={b} tone="text-go" right />
      </div>

      {/* What each says of the other. Both directions, because they differ. */}
      <div className="grid gap-2 sm:grid-cols-2">
        <Says from={a} about={b} v={aOnB} tone="text-coin" />
        <Says from={b} about={a} v={bOnA} tone="text-go" />
      </div>

      {shared.length > 0 ? (
        <div className="grid gap-4 sm:grid-cols-2">
          <Subjects title="Fight about" tone="!text-hate" rows={fights} a={a.code} b={b.code} />
          <Subjects title="Agree on" tone="!text-love" rows={agrees} a={a.code} b={b.code} />
        </div>
      ) : (
        <p className="text-[12.5px] text-mute">
          No subject both have answered enough about to be compared on yet.
        </p>
      )}
    </div>
  );
}

function Side({ n, tone, right = false }: { n: Nation; tone: string; right?: boolean }) {
  const loves = n.lovePct >= 50;
  return (
    <div className={cn("min-w-0", right && "text-right")}>
      <Flag code={n.code} size="h-9 w-12" className={cn(right && "flex-row-reverse")} />
      <p className={cn("mt-1.5 truncate text-[14px] font-extrabold", tone)}>{nameOf(n.code)}</p>
      <p className="text-[12px] text-ink-3">
        <span className={cn("num font-extrabold", loves ? "text-love" : "text-hate")}>
          {loves ? n.lovePct : 100 - n.lovePct}% {loves ? "love" : "hate"}
        </span>
        <span className="text-mute"> · {n.contrary}% contrary</span>
      </p>
    </div>
  );
}

function Says({
  from,
  about,
  v,
  tone,
}: {
  from: Nation;
  about: Nation;
  v: Verdict | undefined;
  tone: string;
}) {
  return (
    <div className="rounded-[var(--r-btn)] border border-line bg-surface-2/40 px-3 py-2.5">
      <p className="flex items-center gap-1.5 text-[11px] font-extrabold tracking-[0.06em] uppercase">
        <span className={tone}>{from.code}</span>
        <ArrowRight weight="bold" className="size-3 text-mute" />
        <span className="text-ink-3">{about.code}</span>
      </p>
      {v ? (
        <p className="mt-1 text-[13px] text-ink-3">
          <span className="font-bold text-ink">{verdictWord(v.lovePct)}</span>{" "}
          <span
            className={cn("num font-extrabold", v.lovePct >= 50 ? "text-love" : "text-hate")}
          >
            {v.lovePct}%
          </span>
          <span className="text-mute"> · {fmtInt(v.topics)} q</span>
        </p>
      ) : (
        <p className="mt-1 text-[12px] text-mute">no verdict yet</p>
      )}
    </div>
  );
}

function Subjects({
  title,
  tone,
  rows,
  a,
  b,
}: {
  title: string;
  tone: string;
  rows: { slug: string; a: number; b: number; gap: number }[];
  a: string;
  b: string;
}) {
  if (rows.length === 0) return null;
  return (
    <div>
      <p className={`label mb-2 ${tone}`}>{title}</p>
      <ul className="space-y-1">
        {rows.map((s) => (
          <li
            key={s.slug}
            className="flex items-center gap-2 rounded-[var(--r-btn)] border border-line bg-surface-2/40 px-2.5 py-1.5 text-[12px]"
          >
            <span className="w-20 shrink-0 truncate font-bold text-ink capitalize">{s.slug}</span>
            <span className="flex-1" />
            <span className="num font-extrabold text-coin" title={a}>{s.a}%</span>
            <Lightning weight="fill" className="size-3 text-mute" />
            <span className="num font-extrabold text-go" title={b}>{s.b}%</span>
          </li>
        ))}
      </ul>
    </div>
  );
}
