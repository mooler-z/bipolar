import { cn } from "../../lib/cn";
import { fmtInt } from "../../lib/format";

/**
 * The report card: the ranker that shipped before it could learn, against the
 * one that reads every act, on the same readers and the same acts. Higher is
 * better on the first two rows, lower on the third.
 */
export function Replay({
  report,
}: {
  report: {
    readers: number;
    acts: number;
    k: number;
    separation: number;
    at: number;
    baseline: { mrr: number; hitAtK: number; medianRank: number };
    learned: { mrr: number; hitAtK: number; medianRank: number };
  };
}) {
  const pct = (n: number) => `${Math.round(n * 100)}%`;
  const rows: [string, string, string, boolean][] = [
    ["Mean reciprocal rank", report.baseline.mrr.toFixed(2), report.learned.mrr.toFixed(2), report.learned.mrr >= report.baseline.mrr],
    [`On the first ${report.k}`, pct(report.baseline.hitAtK), pct(report.learned.hitAtK), report.learned.hitAtK >= report.baseline.hitAtK],
    ["Median place", fmtInt(report.baseline.medianRank), fmtInt(report.learned.medianRank), report.learned.medianRank <= report.baseline.medianRank],
  ];
  return (
    <div>
      <p className="mb-3 text-[12.5px] leading-snug text-mute">
        Where each ranker would have put the topic a reader went on to act on,
        knowing only what came before — replayed over{" "}
        <span className="num font-bold text-ink-3">{fmtInt(report.acts)}</span> acts by{" "}
        <span className="num font-bold text-ink-3">{fmtInt(report.readers)}</span> readers.
      </p>
      <div className="grid grid-cols-[minmax(0,1fr)_auto_auto] gap-x-6 gap-y-2 text-[13px]">
        <span />
        <span className="text-[10.5px] font-extrabold tracking-[0.1em] text-mute uppercase">before</span>
        <span className="text-[10.5px] font-extrabold tracking-[0.1em] text-go uppercase">learned</span>
        {rows.map(([label, b, l, better]) => (
          <>
            <span key={`${label}-l`} className="font-semibold text-ink-2">{label}</span>
            <span key={`${label}-b`} className="num text-right text-mute">{b}</span>
            <span key={`${label}-v`} className={cn("display num text-right text-[16px]", better ? "text-go" : "text-love")}>{l}</span>
          </>
        ))}
      </div>
      <p className="num mt-3 text-[11.5px] text-mute">
        Score gap between topics later acted on and later skipped: {report.separation >= 0 ? "+" : ""}{report.separation.toFixed(3)} ·{" "}
        {new Date(report.at).toLocaleString()}
      </p>
    </div>
  );
}

