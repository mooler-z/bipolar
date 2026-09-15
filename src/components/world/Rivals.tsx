import { fmtInt } from "../../lib/format";
import { Country, NotYet } from "./bars";

/**
 * Which two countries are the same country twice, and which two never agree.
 *
 * Agreement is how closely two countries leaned the same way, averaged over
 * every question they have both answered — a hundred means they have never
 * once differed. It needs three shared questions, because two countries that
 * have overlapped on one are a coincidence rather than a relationship.
 *
 * Both ends are shown: the feud is the fun one, but a pair that agrees on
 * everything is the more surprising row, and a board with only one end of a
 * scale on it is a board making an argument.
 */

export type Pair = {
  a: string;
  b: string;
  agreement: number;
  shared: number;
  sameSide: number;
};

export function Rivals({ rows }: { rows: Pair[] }) {
  if (rows.length === 0) {
    return (
      <NotYet
        what="No two countries have argued enough yet."
        need="Two countries need three questions they have both answered before they can be compared."
      />
    );
  }

  const feuds = rows.slice(0, 5);
  // The other end of the same sorted list, kept in order.
  const kindred = [...rows].reverse().slice(0, 5);

  return (
    <div className="grid gap-5 sm:grid-cols-2">
      <Board title="Never agree" tone="text-hate" rows={feuds} />
      <Board title="Same mind" tone="text-love" rows={kindred} />
    </div>
  );
}

function Board({ title, tone, rows }: { title: string; tone: string; rows: Pair[] }) {
  return (
    <div>
      <p className={`label mb-2 ${tone}`}>{title}</p>
      <ul className="space-y-1">
        {rows.map((p) => (
          <li
            key={`${p.a}|${p.b}`}
            className="flex items-center gap-2 rounded-[var(--r-btn)] border border-line bg-surface-2/40 px-3 py-2"
          >
            <Country code={p.a} />
            <span className="text-[11px] text-mute">vs</span>
            <Country code={p.b} />
            <span className="flex-1" />
            <span className="num text-[13px] font-extrabold text-ink">{p.agreement}%</span>
            <span className="num w-16 shrink-0 text-right text-[11px] text-mute">
              {fmtInt(p.shared)} shared
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}
