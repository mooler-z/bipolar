import { cn } from "../../lib/cn";
import { fmtInt } from "../../lib/format";
import { Button } from "../../ui/Button";
import { Country, Lean } from "./bars";

/**
 * What the world argues about, and who argues which way.
 *
 * The list is every subject with its worldwide lean; picking one paints the
 * map by each country's lean on that subject alone. Football is one map and
 * politics is another, and the difference between them is the point.
 */

export type Subject = { code: string; slug: string; votes: number; lovePct: number };

export function SubjectList({
  rows,
  pick,
  onPick,
}: {
  rows: { slug: string; votes: number; lovePct: number; topics: number }[];
  pick: string | null;
  onPick: (slug: string) => void;
}) {
  return (
    <ul className="space-y-1">
      {rows.map((c) => (
        <li key={c.slug}>
          <Button
            bare
            onClick={() => onPick(c.slug)}
            aria-current={pick === c.slug ? "true" : undefined}
            className={cn(
              "lift flex w-full items-center gap-3 rounded-[var(--r-btn)] border px-3 py-2 text-left",
              pick === c.slug
                ? "border-coin-fill bg-surface-2"
                : "border-line bg-surface-2/40 hover:border-line-2 hover:bg-surface-2",
            )}
          >
            <span className="w-24 shrink-0 truncate text-[13px] font-bold text-ink capitalize">
              {c.slug}
            </span>
            <span className="num w-12 shrink-0 text-[11px] text-mute">
              {fmtInt(c.topics)} q
            </span>
            <Lean lovePct={c.lovePct} votes={c.votes} className="min-w-0 flex-1" />
          </Button>
        </li>
      ))}
    </ul>
  );
}

/** Who feels a subject hardest, each way. */
export function SubjectCard({ slug, rows }: { slug: string; rows: Subject[] }) {
  const mine = rows.filter((s) => s.slug === slug).sort((a, b) => b.lovePct - a.lovePct);
  if (mine.length === 0) {
    return (
      <p className="text-[12.5px] text-mute">
        No country has answered enough about this yet to be placed on the map.
      </p>
    );
  }
  const loves = mine.slice(0, 4);
  const hates = [...mine].reverse().slice(0, 4);

  return (
    <div className="rise space-y-4">
      <p className="display text-[clamp(1.3rem,2vw,1.8rem)] text-ink capitalize">{slug}</p>
      <Side title="Likes it most" tone="!text-love" rows={loves} />
      <Side title="Likes it least" tone="!text-hate" rows={hates} />
    </div>
  );
}

function Side({ title, tone, rows }: { title: string; tone: string; rows: Subject[] }) {
  return (
    <div>
      <p className={`label mb-2 ${tone}`}>{title}</p>
      <ul className="space-y-1">
        {rows.map((s) => (
          <li
            key={s.code}
            className="flex items-center gap-2 rounded-[var(--r-btn)] border border-line bg-surface-2/40 px-2.5 py-1.5"
          >
            <Country code={s.code} />
            <span className="flex-1" />
            <Lean lovePct={s.lovePct} votes={s.votes} className="w-[13rem]" />
          </li>
        ))}
      </ul>
    </div>
  );
}
