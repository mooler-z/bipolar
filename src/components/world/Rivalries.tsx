import { fmtInt } from "../../lib/format";
import { Flag } from "../../ui/Flag";
import { Country } from "./bars";
import { Figure } from "./Nations";
import type { Pair } from "./Rivals";
import { nameOf } from "./WorldMap";

/**
 * One country against everybody, on the map.
 *
 * Pick a country and the whole world is recoloured by how often it lands on
 * the same side as the pick — red where they think alike, cyan where they
 * never do. It is the agreement table turned into the one thing a table
 * cannot do, which is show a country's friends and enemies as a shape.
 */

/** Agreement between a pick and another country, from the pair list. */
export function agreementWith(pairs: Pair[], pick: string): Map<string, Pair> {
  const out = new Map<string, Pair>();
  for (const p of pairs) {
    if (p.a === pick) out.set(p.b, p);
    else if (p.b === pick) out.set(p.a, p);
  }
  return out;
}

export function RivalryCard({
  pick,
  pairs,
}: {
  pick: string;
  pairs: Map<string, Pair>;
}) {
  const ranked = [...pairs.entries()].sort((x, y) => y[1].agreement - x[1].agreement);
  const friends = ranked.slice(0, 4);
  const enemies = [...ranked].reverse().slice(0, 4);
  const mean =
    ranked.length === 0
      ? null
      : Math.round(ranked.reduce((n, [, p]) => n + p.agreement, 0) / ranked.length);

  return (
    <div className="rise space-y-5">
      <div className="flex items-center gap-4">
        <Flag code={pick} size="h-12 w-16" />
        <div className="min-w-0">
          <p className="display truncate text-[clamp(1.4rem,2.2vw,2rem)] text-ink">
            {nameOf(pick)}
          </p>
          <p className="text-[13px] text-ink-3">
            against <span className="num font-bold text-ink">{fmtInt(ranked.length)}</span> other
            {ranked.length === 1 ? " country" : " countries"}
          </p>
        </div>
      </div>

      {mean === null ? (
        <p className="text-[12.5px] text-mute">
          Has not answered enough of the same questions as anybody else to be compared yet.
        </p>
      ) : (
        <>
          <div className="grid grid-cols-2 gap-2">
            <Figure label="agrees with the room" value={`${mean}%`} />
            <Figure
              label={enemies[0] ? `least with ${enemies[0][0]}` : "least with"}
              value={enemies[0] ? `${enemies[0][1].agreement}%` : "—"}
              tone="text-hate"
            />
          </div>

          <List title="Same mind" tone="!text-love" rows={friends} />
          <List title="Never agree" tone="!text-hate" rows={enemies} />
        </>
      )}
    </div>
  );
}

function List({
  title,
  tone,
  rows,
}: {
  title: string;
  tone: string;
  rows: [string, Pair][];
}) {
  if (rows.length === 0) return null;
  return (
    <div>
      <p className={`label mb-2 ${tone}`}>{title}</p>
      <ul className="space-y-1">
        {rows.map(([code, p]) => (
          <li
            key={code}
            className="flex items-center gap-2 rounded-[var(--r-btn)] border border-line bg-surface-2/40 px-2.5 py-1.5"
          >
            <Country code={code} />
            <span className="min-w-0 flex-1 truncate text-[12px] text-mute">
              {fmtInt(p.shared)} shared
            </span>
            <span className="num text-[12.5px] font-extrabold text-ink">{p.agreement}%</span>
          </li>
        ))}
      </ul>
    </div>
  );
}
