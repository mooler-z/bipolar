import { useEffect, useRef } from "react";
import { useQuery } from "convex/react";
import {
  ChatCircle,
  Heart,
  Lightning,
  LockSimple,
  HeartBreak,
} from "@phosphor-icons/react";

import { api } from "../../../convex/_generated/api";
import { cn } from "../../lib/cn";
import { ago, useNow } from "../../lib/motion";
import { Button } from "../../ui/Button";
import { Flag } from "../../ui/Flag";

/**
 * Every vote and comment as it lands — at the bottom, the way a room fills.
 *
 * Oldest at the top, newest at the foot, and the list follows the newest row
 * the way a chat does: it stays pinned to the bottom unless the reader has
 * scrolled up to read, in which case nothing yanks them back. A row that
 * lands after the rail is open is lit green for five seconds and then the
 * light dissolves, so the eye finds what just happened without being told.
 *
 * A row is a ticket: a coloured edge that says what is known about it, the
 * country, the question, and how long ago. The side of a vote is drawn only
 * when the payload carries it — the server withholds it for any topic this
 * reader has not earned, and this file never guesses.
 */

const WINDOW_MS = 10 * 60_000;

type Row = NonNullable<
  ReturnType<typeof useQuery<typeof api.leaderboards.activity>>
>[number];

function edgeOf(r: Row): string {
  if (r.kind === "comment") return "border-l-ink-3/40";
  if (r.choice === "love") return "border-l-love";
  if (r.choice === "hate") return "border-l-hate";
  if (r.paid) return "border-l-coin";
  return "border-l-line-2";
}

function Mark({ r }: { r: Row }) {
  if (r.kind === "comment") {
    return <ChatCircle weight="fill" className="size-3.5 shrink-0 text-mute" />;
  }
  if (r.choice === "love") {
    return <Heart weight="fill" className="size-3.5 shrink-0 text-love" />;
  }
  if (r.choice === "hate") {
    return <HeartBreak weight="fill" className="size-3.5 shrink-0 text-hate" />;
  }
  return (
    <LockSimple
      className={cn(
        "size-3.5 shrink-0 text-mute opacity-45",
        "transition-[color,opacity] duration-150",
        "group-hover/row:text-coin group-hover/row:opacity-100",
      )}
    />
  );
}

function Ticket({
  r,
  here,
  fresh,
  now,
  index,
  onOpen,
}: {
  r: Row;
  here: boolean;
  /** Landed after the rail opened: lit, then dissolving. */
  fresh: boolean;
  now: number;
  index: number;
  onOpen: (slug: string) => void;
}) {
  const unknown = r.kind === "vote" && r.choice === null;
  return (
    <li
      className={fresh ? "roll" : "stagger"}
      style={fresh ? undefined : { animationDelay: `${Math.min(index, 14) * 28}ms` }}
    >
      <Button
        bare
        onClick={() => onOpen(r.slug)}
        title={unknown ? "Vote on this to see which way it went" : undefined}
        className={cn(
          "group/row flex w-full flex-col items-start gap-0.5 overflow-hidden rounded-r-[9px] border-l-[3px] py-2 pr-2 pl-2.5 text-left",
          "transition-[background-color,transform] duration-150",
          "hover:translate-x-1 hover:bg-surface-3",
          edgeOf(r),
          here && "bg-surface-2",
        )}
      >
        {fresh ? <span aria-hidden className="fresh-glow absolute inset-0 bg-go-fill/18" /> : null}
        <span className="relative flex w-full items-center gap-2">
          {r.countryCode ? (
            <Flag code={r.countryCode} />
          ) : (
            <span aria-hidden className="w-[17px] shrink-0" />
          )}
          <span
            className={cn(
              "min-w-0 flex-1 truncate text-[12.5px] leading-tight transition-colors",
              here ? "text-ink" : "text-ink-3 group-hover/row:text-ink",
            )}
          >
            {r.question}
          </span>
          {r.paid ? (
            <Lightning weight="fill" className="size-3 shrink-0 text-coin" />
          ) : null}
          <Mark r={r} />
          <span className="num w-6 shrink-0 text-right text-[10.5px] font-semibold text-mute">
            {ago(r.at, now)}
          </span>
        </span>
        {here ? (
          <span className="relative pl-[25px] text-[10px] font-extrabold tracking-[0.08em] text-go uppercase">
            this one
          </span>
        ) : null}
        {r.kind === "comment" && r.body ? (
          <span className="relative line-clamp-2 pl-[25px] text-[11.5px] leading-snug text-mute italic">
            &ldquo;{r.body}&rdquo; &mdash; {r.author}
          </span>
        ) : null}
      </Button>
    </li>
  );
}

export function Live({
  slug,
  onOpen,
  className,
}: {
  /** The topic in the middle, so its own rows read as this one. */
  slug: string;
  onOpen: (slug: string) => void;
  className?: string;
}) {
  const rows = useQuery(api.leaderboards.activity, { limit: 30 });
  const now = useNow(10_000);
  const list = useRef<HTMLUListElement | null>(null);
  const stuck = useRef(true);
  const first = useRef(true);
  /* The rows that were already there when the rail opened. Everything that
     arrives after them is fresh; nothing on the first paint is. */
  const opening = useRef<Set<string> | null>(null);
  if (rows && opening.current === null) opening.current = new Set(rows.map((r) => r.id));

  const newest = rows?.[0]?.id;
  useEffect(() => {
    const el = list.current;
    if (!el || !newest) return;
    if (first.current || stuck.current) {
      el.scrollTo({ top: el.scrollHeight, behavior: first.current ? "auto" : "smooth" });
      first.current = false;
    }
  }, [newest]);

  if (rows === undefined) {
    return (
      <ul className={cn("space-y-2 p-3", className)}>
        {Array.from({ length: 8 }, (_, i) => (
          <li key={i} className="shimmer h-8 rounded-[8px]" />
        ))}
      </ul>
    );
  }

  const recent = rows.filter((r) => now - r.at < WINDOW_MS);
  const votes = recent.filter((r) => r.kind === "vote").length;
  const comments = recent.length - votes;
  // The query is newest-first; the room fills from the top down.
  const ordered = [...rows].reverse();

  return (
    <div className={cn("flex min-h-0 flex-col", className)}>
      <p className="flex shrink-0 items-center gap-2 border-b border-line bg-surface px-3 py-2 text-[11.5px] font-bold text-ink-3">
        <span aria-hidden className="pulse-dot size-2 shrink-0 rounded-full bg-go-fill" />
        <span className="num">{votes}</span> {votes === 1 ? "vote" : "votes"}
        <span className="text-mute">&middot;</span>
        <span className="num">{comments}</span>{" "}
        {comments === 1 ? "comment" : "comments"}
        <span className="truncate font-semibold text-mute">in the last 10 min</span>
      </p>
      {rows.length === 0 ? (
        <p className="p-4 text-[13px] leading-snug text-mute">
          Nothing has landed yet today. The first vote shows here the moment it does.
        </p>
      ) : (
        <ul
          ref={list}
          onScroll={(e) => {
            const el = e.currentTarget;
            stuck.current = el.scrollHeight - el.scrollTop - el.clientHeight < 80;
          }}
          className="col-scroll flex flex-1 flex-col justify-end space-y-1 p-2"
        >
          {ordered.map((r, i) => (
            <Ticket
              key={r.id}
              r={r}
              here={r.slug === slug}
              fresh={!opening.current?.has(r.id)}
              now={now}
              index={i}
              onOpen={onOpen}
            />
          ))}
        </ul>
      )}
    </div>
  );
}
