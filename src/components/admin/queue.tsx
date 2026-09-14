import { Check, CheckCircle, Robot, Warning, X } from "@phosphor-icons/react";

import { cn } from "../../lib/cn";
import { fmtInt } from "../../lib/format";
import { Button } from "../../ui/Button";
import type { AdminTopic } from "./TopicRow";

/**
 * The queue, by the wave it arrived in.
 *
 * Drafts do not trickle in: a crawling session lands fifteen at once, out of
 * one sweep of the web, about the same handful of stories. The wave is the unit
 * a moderator actually works through — so it gets a heading, a number that can
 * be said out loud, and a way to take the whole thing in one press.
 */

export type Session = {
  seq: number | null;
  query: string;
  at: number | null;
  found: number;
  minted: number;
  rejected: number;
  duplicate: number;
  error: string | null;
};

/** Rows in waves, newest session first. Anything unstamped falls to the end. */
export function groupBySession(
  rows: AdminTopic[],
): { seq: number | null; rows: AdminTopic[] }[] {
  const waves = new Map<number | null, AdminTopic[]>();
  for (const row of rows) {
    const key = row.runSeq ?? null;
    const bucket = waves.get(key);
    if (bucket) bucket.push(row);
    else waves.set(key, [row]);
  }
  return [...waves.entries()]
    .sort((a, b) => (b[0] ?? -1) - (a[0] ?? -1))
    .map(([seq, rows]) => ({ seq, rows }));
}

function ago(ms: number | null): string {
  if (!ms) return "";
  const mins = Math.round((Date.now() - ms) / 60_000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  if (mins < 60 * 24) return `${Math.round(mins / 60)}h ago`;
  return `${Math.round(mins / (60 * 24))}d ago`;
}

/**
 * The wave's heading: a solid violet block with the number in it, the session's
 * own tally as chips, and the way to take the whole wave at once. It is drawn
 * as a bar rather than a line of text because a list of forty drafts needs its
 * seams to be visible from across the room.
 */
export function SessionHead({
  seq,
  session,
  count,
  allChecked,
  onToggleAll,
}: {
  seq: number | null;
  session?: Session;
  /** Rows of this wave currently on screen. */
  count: number;
  allChecked: boolean;
  onToggleAll: () => void;
}) {
  const decided = session ? Math.max(0, session.minted - count) : 0;
  const share = session && session.minted > 0 ? Math.round((decided / session.minted) * 100) : 0;

  return (
    <div className="mt-5 mb-2 first:mt-0">
      <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
        <span
          className={cn(
            "flex items-center gap-2 rounded-[var(--r-sm)] px-2.5 py-1.5",
            seq === null ? "bg-surface-3 text-ink-2" : "bg-go-fill text-on-go",
          )}
        >
          <Robot weight="fill" className="size-4" />
          <span className="display num text-[13.5px]">
            {seq === null ? "Not from a crawl" : `Session ${seq}`}
          </span>
        </span>

        {session ? (
          <span className="flex flex-wrap items-center gap-1.5">
            <span className="chip">{ago(session.at)}</span>
            <span className="chip !bg-go-fill/15 !text-go" title="Questions minted">
              <span className="num font-extrabold">{fmtInt(session.minted)}</span> minted
            </span>
            {session.duplicate > 0 ? (
              <span
                className="chip !bg-coin-fill/15 !text-coin"
                title="Dropped: the feed already carries that argument"
              >
                <span className="num font-extrabold">{fmtInt(session.duplicate)}</span> already asked
              </span>
            ) : null}
            {session.rejected > 0 ? (
              <span className="chip" title="Dropped: nobody would actually disagree">
                <span className="num font-extrabold">{fmtInt(session.rejected)}</span> too dull
              </span>
            ) : null}
            {session.error ? (
              <span className="chip !bg-love-fill/12 !text-love">
                <Warning weight="fill" className="size-3" /> {session.error}
              </span>
            ) : null}
          </span>
        ) : null}

        <span className="flex-1" />

        <Button
          bare
          onClick={onToggleAll}
          className="lift flex items-center gap-2 rounded-[var(--r-sm)] px-2 py-1 text-[12px] font-extrabold text-ink-3 hover:bg-surface-3 hover:text-ink"
        >
          <Box checked={allChecked} />
          {allChecked ? "Clear the wave" : `Take all ${fmtInt(count)}`}
        </Button>
      </div>

      {/* How much of the wave has been decided. A wave is worked through, and
          a moderator halfway through one should be able to see that. */}
      {session && session.minted > 0 ? (
        <div className="mt-2 flex items-center gap-2.5 px-0.5">
          <span className="bar h-1.5 flex-1">
            <span className="bar-fill" style={{ width: `${share}%` }} />
          </span>
          <span className="num shrink-0 text-[11px] font-bold text-mute">
            {fmtInt(decided)} of {fmtInt(session.minted)} decided
          </span>
        </div>
      ) : null}
    </div>
  );
}

/** The house checkbox. Rule 4: a control, so it is a Button wearing a box. */
export function Box({ checked }: { checked: boolean }) {
  return (
    <span
      aria-hidden
      className={cn(
        "grid size-[18px] shrink-0 place-items-center rounded-[5px] border-2 transition-colors",
        checked
          ? "border-go-fill bg-go-fill text-on-go"
          : "border-line-2 text-transparent",
      )}
    >
      <Check weight="bold" className="size-3" />
    </span>
  );
}

/**
 * What to do with the ones you picked.
 *
 * Appears only when something is selected, and names the count in every label —
 * "Publish 12" is a sentence somebody can check before they press it, where
 * "Publish" over a list of eighty is a dare.
 */
export function BulkBar({
  count,
  busy,
  canPublish,
  canArchive,
  onPublish,
  onArchive,
  onClear,
}: {
  count: number;
  busy: boolean;
  canPublish: boolean;
  canArchive: boolean;
  onPublish: () => void;
  onArchive: () => void;
  onClear: () => void;
}) {
  if (count === 0) return null;
  return (
    <div className="slide-up flex shrink-0 items-center gap-2 border-t border-line bg-surface-2 px-4 py-2.5">
      <span className="num text-[13px] font-extrabold">
        {fmtInt(count)} selected
      </span>
      <span className="flex-1" />
      {canPublish ? (
        <Button variant="go" size="sm" disabled={busy} onClick={onPublish}>
          <CheckCircle weight="fill" className="size-4" /> Publish {fmtInt(count)}
        </Button>
      ) : null}
      {canArchive ? (
        <Button variant="steel" size="sm" disabled={busy} onClick={onArchive}>
          Archive {fmtInt(count)}
        </Button>
      ) : null}
      <Button
        bare
        aria-label="Clear the selection"
        onClick={onClear}
        className="grid size-9 place-items-center rounded-[var(--r-sm)] text-mute transition-colors hover:bg-surface-3 hover:text-ink"
      >
        <X weight="bold" className="size-4" />
      </Button>
    </div>
  );
}
