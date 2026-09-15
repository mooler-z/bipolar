import type { ReactNode } from "react";
import { useQuery } from "convex/react";
import { ChatCircle, Crown, Fire, Globe, Lightning } from "@phosphor-icons/react";

import { api } from "../../../convex/_generated/api";
import { cn } from "../../lib/cn";
import { fmtInt, fmtMoney } from "../../lib/format";
import { leanWord } from "../../lib/words";
import { nameOf } from "../world/WorldMap";
import { Button } from "../../ui/Button";
import { Flag } from "../../ui/Flag";

/**
 * The boards: who reads the room best, where the money is, who backs most.
 *
 * Each is a podium rather than a table — the top row is larger, edged in mint
 * and crowned, because a board exists to make one name legible from across the
 * room. Every person is shown with their flag: a country is never named
 * without one. Topics are doors; people are not, yet.
 *
 * **A board with nobody on it is not shown.** Three headings over three lines
 * of "nobody on this board yet" is a rail that looks broken rather than a rail
 * that is early, and the one board that is genuinely empty until people start
 * calling results was sitting at the top of it.
 */

type Row = {
  key: string;
  name: string;
  value: string;
  sub?: string;
  countryCode?: string | null;
  slug?: string;
};

function RowBody({ r, rank }: { r: Row; rank: number }) {
  const top = rank === 1;
  return (
    <>
      {top ? (
        <Crown weight="fill" className="size-5 shrink-0 text-coin" />
      ) : (
        <span className="num grid size-5 shrink-0 place-items-center rounded-[5px] bg-surface-3 text-[10px] font-bold text-mute">
          {rank}
        </span>
      )}
      {r.countryCode ? <Flag code={r.countryCode} /> : null}
      <span className="min-w-0 flex-1">
        <span
          className={cn(
            "block truncate font-semibold",
            top ? "text-[13.5px] text-ink" : "text-[12.5px] text-ink-2",
          )}
        >
          {r.name}
        </span>
        {r.sub ? (
          <span className="block truncate text-[11px] text-mute">{r.sub}</span>
        ) : null}
      </span>
      <span
        className={cn(
          "num shrink-0 font-bold",
          top ? "text-[13px] text-coin" : "text-[11.5px] text-ink-3",
        )}
      >
        {r.value}
      </span>
    </>
  );
}

function BoardRow({
  r,
  rank,
  onOpen,
}: {
  r: Row;
  rank: number;
  onOpen?: (slug: string) => void;
}) {
  const top = rank === 1;
  const frame = cn(
    "flex w-full items-center gap-2.5 rounded-r-[9px] border-l-[3px] px-2 text-left",
    top ? "min-h-12 border-l-coin bg-coin-fill/10 py-2" : "min-h-10 border-l-transparent py-1.5",
  );
  return (
    <li className="stagger" style={{ animationDelay: `${(rank - 1) * 35}ms` }}>
      {r.slug && onOpen ? (
        <Button
          bare
          onClick={() => onOpen(r.slug!)}
          className={cn(
            frame,
            "transition-[background-color,transform] duration-150 hover:translate-x-1 hover:bg-surface-3",
          )}
        >
          <RowBody r={r} rank={rank} />
        </Button>
      ) : (
        <div className={frame}>
          <RowBody r={r} rank={rank} />
        </div>
      )}
    </li>
  );
}

function Section({
  title,
  icon,
  tone,
  rows,
  onOpen,
}: {
  title: string;
  icon: ReactNode;
  tone: string;
  rows: Row[] | undefined;
  onOpen?: (slug: string) => void;
}) {
  if (rows !== undefined && rows.length === 0) return null;
  return (
    <section className="p-3">
      <h3
        className={cn(
          "mb-2 flex items-center gap-1.5 px-1 text-[11px] font-extrabold tracking-[0.08em] uppercase",
          tone,
        )}
      >
        {icon}
        {title}
      </h3>
      {rows === undefined ? (
        <ul className="space-y-1.5">
          {Array.from({ length: 3 }, (_, i) => (
            <li key={i} className="shimmer h-9 rounded-[8px]" />
          ))}
        </ul>
      ) : (
        <ol className="space-y-1">
          {rows.map((r, i) => (
            <BoardRow key={r.key} r={r} rank={i + 1} onOpen={onOpen} />
          ))}
        </ol>
      )}
    </section>
  );
}

export function Boards({ onOpen }: { onOpen: (slug: string) => void }) {
  const readers = useQuery(api.calls.readers, { limit: 6 });
  const hottest = useQuery(api.leaderboards.hottest, { limit: 6 });
  const backers = useQuery(api.leaderboards.backers, { limit: 6 });
  const countries = useQuery(api.boards.countries, { limit: 8 });
  const argued = useQuery(api.boards.argued, { limit: 5 });

  const loaded = [readers, hottest, backers, countries, argued];
  const empty = loaded.every((r) => r !== undefined && r.length === 0);

  return (
    <div className="divide-y divide-line">
      <Section
        title="Hottest"
        icon={<Fire weight="fill" className="size-3.5" />}
        tone="text-streak"
        rows={hottest?.map((t) => ({
          key: t.slug,
          name: t.question,
          value: fmtInt(t.votes),
          sub: [
            `${t.votes === 1 ? "vote" : "votes"}`,
            t.comments > 0 ? `${fmtInt(t.comments)} arguing` : null,
            t.stakedCents > 0 ? `${fmtMoney(t.stakedCents)} staked` : null,
          ]
            .filter(Boolean)
            .join(" · "),
          countryCode: t.countryCode,
          slug: t.slug,
        }))}
        onOpen={onOpen}
      />
      <Section
        title="Loudest countries"
        icon={<Globe weight="fill" className="size-3.5" />}
        tone="text-hate"
        rows={countries?.map((c) => ({
          key: c.code,
          name: nameOf(c.code),
          value: fmtInt(c.votes),
          sub: `${leanWord(c.lovePct)} what it sees · ${fmtInt(c.topics)} questions`,
          countryCode: c.code,
        }))}
      />
      <Section
        title="Most argued"
        icon={<ChatCircle weight="fill" className="size-3.5" />}
        tone="text-go"
        rows={argued?.map((t) => ({
          key: t.slug,
          name: t.question,
          value: fmtInt(t.comments),
          sub: `${t.comments === 1 ? "reply" : "replies"} · ${fmtInt(t.votes)} voted`,
          slug: t.slug,
        }))}
        onOpen={onOpen}
      />
      <Section
        title="Best readers"
        icon={<Crown weight="fill" className="size-3.5" />}
        tone="text-coin"
        rows={readers?.map((r, i) => ({
          key: `${r.displayName}-${i}`,
          name: r.displayName,
          value: `${r.accuracy}%`,
          sub: `${fmtInt(r.made)} calls${r.streak > 1 ? ` · ${r.streak} in a row` : ""}`,
          countryCode: r.countryCode,
        }))}
      />
      <Section
        title="Top backers"
        icon={<Lightning weight="fill" className="size-3.5" />}
        tone="text-love"
        rows={backers?.map((b, i) => ({
          key: `${b.displayName}-${i}`,
          name: b.displayName,
          value: `${fmtInt(b.topicsBacked)} backed`,
          countryCode: b.countryCode,
        }))}
      />
      {empty ? (
        <p className="p-4 text-[12.5px] text-mute">
          Nothing on the boards yet. They fill as people vote.
        </p>
      ) : null}
    </div>
  );
}
