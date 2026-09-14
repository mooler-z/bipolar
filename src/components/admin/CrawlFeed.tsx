import { useEffect, useRef, useState } from "react";
import { useQuery } from "convex/react";
import { ArrowSquareOut, Robot } from "@phosphor-icons/react";

import { api } from "../../../convex/_generated/api";
import { cn } from "../../lib/cn";
import { fmtInt } from "../../lib/format";
import type { SessionRow } from "./Crawl";
import { Empty } from "./panes";

/**
 * A session, told line by line as it happens.
 *
 * Every line is written by the session itself, from inside the loop, so this
 * is the thing being watched rather than a log read back afterwards. The
 * colours are the chart's: violet for a question minted, yellow for one the
 * feed already carried, grey for one nobody would argue about, red for a stop.
 *
 * **It is something to use, not only to watch.** The bar says how far through
 * its own target the session is, the stage says what it is doing right now,
 * the clock runs while it runs, and every question it mints is a link that
 * opens on the site — the point of watching a crawl is to catch the one
 * question you would not have published.
 *
 * The feed follows the newest line while the session is out and stops
 * following the moment it is back, so a finished story can be read from the
 * top without being dragged to the bottom.
 */

const DOT: Record<string, string> = {
  search: "bg-hate-fill",
  read: "bg-surface-4",
  draft: "bg-ink-3",
  minted: "bg-go-fill",
  duplicate: "bg-coin-fill",
  rejected: "bg-surface-4",
  failed: "bg-love-fill",
  picture: "bg-streak-fill",
  done: "bg-go-fill",
  error: "bg-love-fill",
};

/** What the session is doing, from the last line it wrote. */
const STAGE: Record<string, string> = {
  search: "Searching the web",
  read: "Reading a page",
  draft: "Asking the model",
  minted: "Writing a question",
  duplicate: "Checking for repeats",
  rejected: "Weighing a story",
  failed: "Weighing a story",
  picture: "Fetching pictures",
  done: "Back",
  error: "Stopped",
};

function clock(ms: number): string {
  return new Date(ms).toLocaleTimeString(undefined, {
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  });
}

function elapsed(from: number, to: number): string {
  const secs = Math.max(0, Math.round((to - from) / 1000));
  return `${Math.floor(secs / 60)}:${String(secs % 60).padStart(2, "0")}`;
}

export function CrawlFeed({ session }: { session: SessionRow | null }) {
  const events = useQuery(
    api.adminQueue.events,
    session ? { runId: session._id } : "skip",
  );
  const target = useQuery(api.settings.discovery)?.topicsPerRun ?? 15;
  const tail = useRef<HTMLSpanElement>(null);

  /* A clock that runs. Nothing else on this panel moves between lines, and a
     session that takes two minutes to write its next line should not look
     like one that has died. */
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    if (!session?.running) return;
    const beat = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(beat);
  }, [session?.running]);

  useEffect(() => {
    if (session?.running) tail.current?.scrollIntoView({ block: "end" });
  }, [events?.length, session?.running]);

  if (!session) {
    return <Empty icon={<Robot className="size-7" />} title="Pick a session." />;
  }

  const first = events?.[0]?.at ?? session.at ?? now;
  const last = events?.[events.length - 1];
  const share = Math.min(100, Math.round((session.minted / Math.max(1, target)) * 100));

  return (
    <div className="flex min-h-full flex-col">
      <div className="sticky top-0 z-10 border-b border-line bg-surface px-4 py-3">
        <p className="flex items-center gap-2">
          {session.running ? (
            <span aria-hidden className="pulse-dot size-2 rounded-full bg-go-fill" />
          ) : null}
          <span className="display text-[14px]">
            {session.seq === null ? "Session" : `Session ${session.seq}`}
          </span>
          <span className="flex-1" />
          <span className="num text-[12px] font-bold text-mute">
            {elapsed(first, session.running ? now : (last?.at ?? now))}
          </span>
        </p>

        {/* Against its own target, which is the number that was asked for. */}
        <div className="mt-2.5 flex items-center gap-2.5">
          <span className="bar h-2 flex-1">
            <span
              className={cn("bar-fill", session.error && "!bg-love-fill")}
              style={{ width: `${share}%` }}
            />
          </span>
          <span className="num shrink-0 text-[12px] font-extrabold">
            {fmtInt(session.minted)}
            <span className="text-mute">/{fmtInt(target)}</span>
          </span>
        </div>

        <p className="mt-2 flex flex-wrap items-center gap-1.5">
          <span
            className={cn(
              "chip !py-1 !text-[11px] !font-extrabold",
              session.running
                ? "!bg-go-fill/15 !text-go"
                : session.error
                  ? "!bg-love-fill/12 !text-love"
                  : "",
            )}
          >
            {session.running ? (STAGE[last?.kind ?? "search"] ?? "Working") : session.error ? "Stopped" : "Back"}
          </span>
          <span className="chip !py-1 !text-[11px] !bg-coin-fill/15 !text-coin">
            <span className="num font-extrabold">{fmtInt(session.duplicate)}</span> already asked
          </span>
          <span className="chip !py-1 !text-[11px]">
            <span className="num font-extrabold">{fmtInt(session.rejected)}</span> too dull
          </span>
          <span className="chip !py-1 !text-[11px]">
            <span className="num font-extrabold">{fmtInt(session.found)}</span> results
          </span>
        </p>
      </div>

      {events === undefined ? (
        <ul className="space-y-2 p-4">
          {Array.from({ length: 6 }, (_, i) => (
            <li key={i} className="shimmer h-5 rounded-[var(--r-sm)]" />
          ))}
        </ul>
      ) : events.length === 0 ? (
        <p className="flex items-center gap-2 px-4 py-6 text-[12.5px] text-mute">
          {session.running ? (
            <>
              <span aria-hidden className="pulse-dot size-2 rounded-full bg-go-fill" />
              Waiting for the first line…
            </>
          ) : (
            "This session ran before lines were kept."
          )}
        </p>
      ) : (
        <ol className="px-4 py-3">
          {events.map((e, i) => (
            <li
              key={e._id}
              style={{ animationDelay: `${Math.min(i, 10) * 18}ms` }}
              className="stagger flex items-start gap-2.5 py-1"
            >
              <span
                aria-hidden
                className={cn("mt-[6px] size-2 shrink-0 rounded-full", DOT[e.kind] ?? "bg-line-2")}
              />
              <span
                className={cn(
                  "min-w-0 flex-1 text-[12.5px] leading-snug",
                  e.kind === "done" && "font-extrabold text-go",
                  (e.kind === "error" || e.kind === "failed") && "font-semibold text-love",
                  e.kind === "duplicate" && "text-coin",
                  (e.kind === "read" || e.kind === "draft" || e.kind === "rejected") && "text-mute",
                  e.kind === "search" && "text-hate",
                  e.kind === "picture" && "text-streak",
                )}
              >
                {e.topic ? (
                  <a
                    href={`/t/${e.topic.slug}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="group inline-flex items-start gap-1 font-bold text-ink hover:text-go"
                  >
                    <span>{e.text}</span>
                    <ArrowSquareOut className="mt-0.5 size-3 shrink-0 opacity-0 transition-opacity group-hover:opacity-100" />
                  </a>
                ) : (
                  e.text
                )}
              </span>
              <span className="num shrink-0 text-[10.5px] text-mute">{clock(e.at)}</span>
            </li>
          ))}
        </ol>
      )}
      <span ref={tail} aria-hidden />
    </div>
  );
}
