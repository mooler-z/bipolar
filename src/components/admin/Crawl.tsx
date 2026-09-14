import { useEffect, useState } from "react";
import { useMutation, useQuery } from "convex/react";
import { Play, Robot, Warning } from "@phosphor-icons/react";

import { api } from "../../../convex/_generated/api";
import type { Id } from "../../../convex/_generated/dataModel";
import { cn } from "../../lib/cn";
import { fmtInt } from "../../lib/format";
import { Button } from "../../ui/Button";
import { Empty } from "./panes";

/**
 * The crawler, from the console: fire a session, and watch the ones that ran.
 *
 * The button opens the run row *before* the action is scheduled, so a session
 * appears in this list the instant it is pressed — with a pulse, no numbers
 * yet — and fills in as it goes. The story of the selected one is told line by
 * line in the aside. One session at a time: the server refuses a second press
 * while one is still out, and the button says so rather than letting you find
 * out from an error.
 */

export type SessionRow = {
  _id: Id<"ingestRuns">;
  seq: number | null;
  query: string;
  found: number;
  minted: number;
  rejected: number;
  duplicate: number;
  error: string | null;
  at: number | null;
  pending: number;
  running: boolean;
  startedBy: string | null;
};

function ago(ms: number | null): string {
  if (!ms) return "";
  const mins = Math.round((Date.now() - ms) / 60_000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  if (mins < 60 * 24) return `${Math.round(mins / 60)}h ago`;
  return `${Math.round(mins / (60 * 24))}d ago`;
}

export function CrawlPanel({
  permissions,
  sessions,
  selected,
  onSelect,
}: {
  permissions: string[];
  sessions: SessionRow[] | undefined;
  selected: Id<"ingestRuns"> | null;
  onSelect: (id: Id<"ingestRuns">) => void;
}) {
  const discovery = useQuery(api.settings.discovery);
  const fire = useMutation(api.adminQueue.fire);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  const mayFire = permissions.includes("ingest:run");
  const running = sessions?.find((s) => s.running) ?? null;

  /* Something is always open in the aside: the one that is out, or the last
     one back. A blank aside next to a list of sessions is a question nobody
     needs to be asked. */
  useEffect(() => {
    if (selected || !sessions?.length) return;
    onSelect(running?._id ?? sessions[0]!._id);
  }, [selected, sessions, running, onSelect]);

  async function go() {
    setBusy(true);
    setError("");
    try {
      onSelect(await fire({}));
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="rise">
      <div className="flex flex-wrap items-center gap-x-5 gap-y-3 border-b border-line pb-4">
        <span className="min-w-0 flex-1">
          <span className="display block text-[16px]">Run a session now</span>
          <span className="mt-0.5 block text-[12.5px] leading-snug text-mute">
            {discovery
              ? `The same sweep the clock runs ${fmtInt(discovery.runsPerDay)} times a day: up to ${fmtInt(discovery.topicsPerRun)} new questions, each with its picture, ${discovery.mode === "review" ? "landing as drafts in the queue." : "going straight into the feed."}`
              : "The same sweep the clock runs, on demand."}
          </span>
        </span>
        {mayFire ? (
          <Button
            variant="go"
            size="md"
            disabled={busy || !!running}
            onClick={() => void go()}
            title={running ? `Session ${running.seq ?? ""} is still out` : "Fire a crawling session"}
          >
            {running ? (
              <>
                <span aria-hidden className="pulse-dot size-2 rounded-full bg-on-go" />
                Session {running.seq} is out
              </>
            ) : (
              <>
                <Play weight="fill" className="size-4" /> Fire a session
              </>
            )}
          </Button>
        ) : (
          <span className="text-[12px] text-mute">Only an admin can fire one.</span>
        )}
      </div>

      {error ? (
        <p className="slide-up mt-3 flex items-center gap-2 rounded-[var(--r-sm)] border border-love-fill/40 bg-love-fill/12 px-3.5 py-2.5 text-[13px] font-semibold text-love">
          <Warning weight="fill" className="size-4 shrink-0" /> {error}
        </p>
      ) : null}

      <h2 className="mt-5 mb-2 text-[11px] font-extrabold tracking-[0.12em] text-hate uppercase">
        Sessions
      </h2>

      {sessions === undefined ? (
        <ul className="space-y-1.5">
          {Array.from({ length: 6 }, (_, i) => (
            <li key={i} className="shimmer h-14 rounded-[var(--r-btn)]" />
          ))}
        </ul>
      ) : sessions.length === 0 ? (
        <Empty
          icon={<Robot className="size-7" />}
          title="No sessions yet."
          hint="Fire one, or wait for the clock. Either way it appears here the moment it starts."
        />
      ) : (
        <ul className="space-y-1">
          {sessions.map((s, i) => {
            const on = s._id === selected;
            return (
              <li key={s._id}>
                <Button
                  bare
                  aria-current={on ? "true" : undefined}
                  onClick={() => onSelect(s._id)}
                  style={{ animationDelay: `${Math.min(i, 12) * 26}ms` }}
                  className={cn(
                    "stagger flex w-full items-center gap-3 rounded-[var(--r-btn)] p-2 pr-3 text-left transition-colors",
                    on ? "bg-surface-3 ring-2 ring-go-fill" : "bg-surface hover:bg-surface-2",
                  )}
                >
                  <span
                    className={cn(
                      "flex shrink-0 items-center gap-1.5 rounded-[var(--r-sm)] px-2.5 py-1.5",
                      s.running ? "bg-go-fill text-on-go" : "bg-surface-3 text-ink-2",
                    )}
                  >
                    {s.running ? (
                      <span aria-hidden className="pulse-dot size-2 rounded-full bg-on-go" />
                    ) : (
                      <Robot weight="fill" className="size-3.5" />
                    )}
                    <span className="display num text-[13px]">
                      {s.seq === null ? "Session" : `Session ${s.seq}`}
                    </span>
                  </span>

                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-[12.5px] font-bold">{s.query}</span>
                    <span className="mt-0.5 block text-[11px] text-mute">
                      {s.running ? "out now" : ago(s.at)}
                      {" · "}
                      {s.startedBy ? `fired by ${s.startedBy}` : "by the clock"}
                    </span>
                  </span>

                  <span className="num flex shrink-0 flex-wrap items-center justify-end gap-1.5 text-[11px] font-bold max-sm:hidden">
                    <span className="chip !bg-go-fill/15 !text-go">{fmtInt(s.minted)} minted</span>
                    {s.duplicate > 0 ? (
                      <span className="chip !bg-coin-fill/15 !text-coin">{fmtInt(s.duplicate)} asked</span>
                    ) : null}
                    {s.rejected > 0 ? <span className="chip">{fmtInt(s.rejected)} dull</span> : null}
                    <span className="chip">{fmtInt(s.found)} seen</span>
                    {s.error ? (
                      <span className="chip !bg-love-fill/12 !text-love">
                        <Warning weight="fill" className="size-3" /> {s.error}
                      </span>
                    ) : null}
                  </span>
                </Button>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
