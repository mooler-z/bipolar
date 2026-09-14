import { useQuery } from "convex/react";
import { Scroll } from "@phosphor-icons/react";

import { api } from "../../../convex/_generated/api";
import { cn } from "../../lib/cn";
import { fmtShortDate } from "../../lib/format";
import { Aside, Empty, Work } from "./panes";

/**
 * The record: every privileged write, newest first.
 *
 * Rule 8 makes the table append-only and makes every privileged mutation write
 * into it inside the same transaction as the thing it describes. This screen is
 * what turns that from a promise into something a person can check — including
 * checking on themselves, which is the only kind of accountability that works.
 *
 * It reads in **plain words**, not in event names. `topic.status` with a
 * metadata blob is a log line; "archived a topic" is a sentence, and the person
 * reading it at eleven at night is trying to answer "who took that down".
 *
 * Two shapes, one list: wide as its own section, dense in the aside of the
 * topic list, where it is what the column shows when nothing is selected.
 */

/* The verb, in the console's own voice. Anything unmapped falls back to a
   prettified event name rather than being hidden — a record with holes in it
   is worse than one with an ugly line in it. */
const SAID: Record<string, string> = {
  "topic.status": "changed a topic's status",
  "topic.lock": "froze or unfroze a topic",
  "topic.feature": "changed what is featured",
  "topic.edit": "edited a topic",
  "topic.minted": "minted a topic from a story",
  "topic.imported": "imported topics",
  "topic.seeded": "seeded topics",
  "topic.retired": "retired a topic",
  "comment.removed": "removed a comment",
  "vote.retract": "took a vote back",
  "wallet.grant": "granted credit",
  "settings.discovery": "changed how discovery publishes",
  "role.bootstrap": "took the first admin role",
};

/* What the line is about, as a colour. The families are the product's own:
   violet for the feed, red for anything taken away, yellow for money, blue for
   everything that only changes a setting. */
function toneOf(action: string): string {
  if (action.startsWith("comment.") || action === "topic.retired") return "bg-love-fill";
  if (action.startsWith("wallet.")) return "bg-coin-fill";
  if (action.startsWith("topic.")) return "bg-go-fill";
  if (action.startsWith("vote.")) return "bg-hate-fill";
  return "bg-line-2";
}

/**
 * How long ago, at the resolution the reader actually needs.
 *
 * A log is read to answer "what just happened" far more often than "what
 * happened on the ninth", so the recent end is counted in minutes and only the
 * far end falls back to a date.
 */
function when(ms: number): string {
  const mins = Math.round((Date.now() - ms) / 60_000);
  if (mins < 1) return "now";
  if (mins < 60) return `${mins}m`;
  if (mins < 60 * 24) return `${Math.round(mins / 60)}h`;
  if (mins < 60 * 24 * 7) return `${Math.round(mins / (60 * 24))}d`;
  return fmtShortDate(ms);
}

/** Up to three facts off the metadata blob, in the order they were written. */
function facts(metadata: unknown): string[] {
  if (!metadata || typeof metadata !== "object") return [];
  return Object.entries(metadata as Record<string, unknown>)
    .filter(([, v]) => v !== undefined && v !== null && v !== "")
    .slice(0, 3)
    .map(([k, v]) => `${k} ${typeof v === "boolean" ? (v ? "on" : "off") : String(v)}`);
}

export function AuditRecord({
  limit = 60,
  dense = false,
}: {
  limit?: number;
  /** The aside's shape: narrower, and no target column. */
  dense?: boolean;
}) {
  const rows = useQuery(api.auditLog.recent, { limit });

  if (rows === undefined) {
    return (
      <ul className={cn("space-y-1.5", dense ? "p-3" : "")}>
        {Array.from({ length: dense ? 8 : 14 }, (_, i) => (
          <li key={i} className="shimmer h-12 rounded-[var(--r-btn)]" />
        ))}
      </ul>
    );
  }

  if (rows.length === 0) {
    return (
      <Empty
        icon={<Scroll className="size-7" />}
        title="Nothing has been done yet."
        hint="Every privileged write lands here the moment it happens, in the same transaction as the thing it describes."
      />
    );
  }

  return (
    <ul className={cn(dense ? "divide-y divide-line" : "space-y-1")}>
      {rows.map((row, i) => (
        <li
          key={row._id}
          style={{ animationDelay: `${Math.min(i, 12) * 24}ms` }}
          className={cn(
            "stagger flex items-start gap-3",
            dense
              ? "px-4 py-2.5"
              : "rounded-[var(--r-btn)] border border-line bg-surface p-3 transition-colors hover:border-line-2",
          )}
        >
          <span
            aria-hidden
            className={cn("mt-1.5 size-2 shrink-0 rounded-full", toneOf(row.action))}
          />

          <span className="min-w-0 flex-1">
            <span className="block text-[13px] leading-snug">
              <span className="font-extrabold">{row.actor}</span>
              <span className="text-mute"> {SAID[row.action] ?? row.action.replace(/[._]/g, " ")}</span>
            </span>
            <span className="mt-0.5 flex flex-wrap items-center gap-x-2 gap-y-0.5 text-[11px] text-mute">
              <span className="font-bold tracking-[0.06em] uppercase">{row.actorRole}</span>
              {facts(row.metadata).map((f) => (
                <span key={f} className="num truncate">{f}</span>
              ))}
              {!dense && row.targetId ? (
                <span className="num truncate opacity-70">{row.targetType}/{row.targetId}</span>
              ) : null}
            </span>
          </span>

          <span className="num shrink-0 text-[11px] text-mute">
            {when(row.at)}
          </span>
        </li>
      ))}
    </ul>
  );
}

/**
 * The record as its own section.
 *
 * The aside explains what the reader is looking at, because an append-only
 * table is an unusual promise and a console that makes one should be able to
 * say why. There is nothing to select here: every line is already the whole
 * fact, and a row that opened into a detail pane would be pretending there is
 * more to know than was written.
 */
export function RecordSection() {
  return (
    <>
      <Work>
        <AuditRecord limit={120} />
      </Work>

      <Aside title="What this is" icon={<Scroll weight="fill" className="size-4 text-mute" />}>
        <div className="space-y-3 p-4 text-[13px] leading-relaxed text-ink-3">
          <p>
            Every privileged write in bi-polar lands here, in the{" "}
            <strong className="text-ink">same transaction</strong> as the thing
            it describes. There is no code path that changes something
            privileged and leaves no line.
          </p>
          <p>
            Nothing updates a row and nothing deletes one. A record that can be
            tidied up is a record nobody can rely on, so the table is
            append-only and stays that way even when a row is embarrassing.
          </p>
          <p>
            That is why <strong className="text-ink">a comment is soft-deleted</strong>{" "}
            rather than removed: the row survives so the quill it was paid for
            stays accounted for.
          </p>
          <p className="!mt-4 border-t border-line pt-3 text-[12px] text-mute">
            Reading this is an admin capability. A moderator cannot open it —
            the record is what a moderator is accountable to.
          </p>
        </div>
      </Aside>
    </>
  );
}
