import type { ReactNode } from "react";
import { ArrowRight } from "@phosphor-icons/react";

import { cn } from "../../lib/cn";
import { fmtInt } from "../../lib/format";
import { Flag } from "../../ui/Flag";
import type { Nation } from "./Nations";
import type { Pair } from "./Rivals";
import type { Verdict } from "./Verdicts";
import { nameOf } from "./WorldMap";

/**
 * The superlatives: the facts people repeat.
 *
 * Every card is one claim about one nation or one pair, big enough to be a
 * screenshot on its own. Each has a floor — a nation of two voters can win
 * nothing here — and each is derived on the client from boards that were
 * already aggregated, so nothing new is revealed by naming a winner.
 */

const FLOOR = 6;

export type Record = {
  title: string;
  who: string[];
  value: string;
  line: string;
  tone: string;
};

export function records(nations: Nation[], pairs: Pair[], verdicts: Verdict[]): Record[] {
  const ranked = nations.filter((n) => n.votes >= FLOOR);
  const out: Record[] = [];
  const by = <T,>(rows: T[], f: (x: T) => number) =>
    rows.length === 0 ? null : rows.reduce((a, b) => (f(b) > f(a) ? b : a));

  const loving = by(ranked, (n) => n.lovePct);
  if (loving) out.push({ title: "Most loving", who: [loving.code], value: `${loving.lovePct}%`, line: `${nameOf(loving.code)} loves ${loving.lovePct}% of what it is shown.`, tone: "text-love" });

  const hating = by(ranked, (n) => 100 - n.lovePct);
  if (hating) out.push({ title: "Most hating", who: [hating.code], value: `${100 - hating.lovePct}%`, line: `${nameOf(hating.code)} hates ${100 - hating.lovePct}% of it.`, tone: "text-hate" });

  const divided = by(ranked, (n) => -Math.abs(n.lovePct - 50));
  if (divided) out.push({ title: "Most divided", who: [divided.code], value: `${divided.lovePct}/${100 - divided.lovePct}`, line: `${nameOf(divided.code)} cannot make its mind up.`, tone: "text-ink" });

  const contrary = by(ranked, (n) => n.contrary);
  if (contrary && contrary.contrary > 0) out.push({ title: "Most contrarian", who: [contrary.code], value: `${contrary.contrary}%`, line: `${nameOf(contrary.code)} goes against the world ${contrary.contrary}% of the time.`, tone: "text-streak" });

  const busy = by(ranked, (n) => n.topics);
  if (busy) out.push({ title: "Most opinionated", who: [busy.code], value: fmtInt(busy.topics), line: `${nameOf(busy.code)} has answered ${fmtInt(busy.topics)} questions.`, tone: "text-coin" });

  const sorted = [...pairs].sort((a, b) => a.agreement - b.agreement);
  const feud = sorted[0];
  if (feud) out.push({ title: "Never agree", who: [feud.a, feud.b], value: `${feud.agreement}%`, line: `${nameOf(feud.a)} and ${nameOf(feud.b)} agree ${feud.agreement}% of the time.`, tone: "text-hate" });
  const kin = sorted[sorted.length - 1];
  if (kin && kin !== feud) out.push({ title: "Same mind", who: [kin.a, kin.b], value: `${kin.agreement}%`, line: `${nameOf(kin.a)} and ${nameOf(kin.b)} agree ${kin.agreement}% of the time.`, tone: "text-love" });

  const harsh = verdicts[0];
  if (harsh) out.push({ title: "Harshest verdict", who: [harsh.from, harsh.about], value: `${harsh.lovePct}%`, line: `${nameOf(harsh.from)} loves ${harsh.lovePct}% of questions about ${nameOf(harsh.about)}.`, tone: "text-hate" });
  const warm = verdicts[verdicts.length - 1];
  if (warm && warm !== harsh) out.push({ title: "Warmest verdict", who: [warm.from, warm.about], value: `${warm.lovePct}%`, line: `${nameOf(warm.from)} loves ${warm.lovePct}% of questions about ${nameOf(warm.about)}.`, tone: "text-love" });

  return out;
}

export function RecordCards({
  rows,
  onHover,
}: {
  rows: Record[];
  onHover: (codes: string[] | null) => void;
}) {
  if (rows.length === 0) {
    return <p className="text-[12.5px] text-mute">Nobody has voted enough to hold a record yet.</p>;
  }
  return (
    <ul className="grid gap-2 sm:grid-cols-2 xl:grid-cols-3">
      {rows.map((r, i) => (
        <li
          key={r.title}
          onMouseEnter={() => onHover(r.who)}
          onMouseLeave={() => onHover(null)}
          style={{ animationDelay: `${Math.min(i, 8) * 40}ms` }}
          className="stagger card-hover flex flex-col gap-2 rounded-[var(--r-card)] border border-line bg-surface p-4 hover:border-line-2"
        >
          <span className={cn("label", r.tone)}>{r.title}</span>
          <span className="flex items-center gap-2">
            <Who codes={r.who} />
            <span className="flex-1" />
            <span className={cn("num display text-[clamp(1.6rem,3vw,2.4rem)]", r.tone)}>
              {r.value}
            </span>
          </span>
          <span className="text-[12.5px] leading-snug text-ink-3">{r.line}</span>
        </li>
      ))}
    </ul>
  );
}

function Who({ codes }: { codes: string[] }): ReactNode {
  return (
    <span className="flex items-center gap-1.5">
      {codes.map((c, i) => (
        <span key={c} className="flex items-center gap-1.5">
          {i > 0 ? <ArrowRight weight="bold" className="size-3 text-mute" /> : null}
          <Flag code={c} size="h-6 w-8" />
        </span>
      ))}
    </span>
  );
}
