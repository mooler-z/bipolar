import { useQuery } from "convex/react";
import { ArrowSquareOut, Scroll } from "@phosphor-icons/react";

import { api } from "../../../convex/_generated/api";
import { cn } from "../../lib/cn";
import { fmtShortDate } from "../../lib/format";
import { Avatar } from "../../ui/Avatar";
import { Aside, Empty, Work } from "./panes";

/**
 * The record, as a timeline.
 *
 * Rule 8 makes the table append-only and makes every privileged mutation write
 * into it inside the same transaction as the thing it describes. This screen is
 * what turns that from a promise into something a person can check.
 *
 * It is drawn as a day-by-day timeline rather than a log, and it reads in
 * **plain words**: who, what they did, and to which question — the question
 * itself, resolved on the server, because `topics/k97…` is a fact and "Golden
 * passports?" is what the person reading at eleven at night is looking for.
 *
 * Two shapes, one list: wide as its own section, dense in the aside.
 */

const SAID: Record<string, string> = {
  "topic.status": "changed the status of",
  "topic.lock": "froze or unfroze",
  "topic.feature": "changed what is featured:",
  "topic.edit": "edited",
  "topic.minted": "minted",
  "topic.imported": "imported topics",
  "topic.seeded": "seeded topics",
  "topic.retired": "retired",
  "comment.removed": "removed a comment on",
  "vote.retract": "took a vote back on",
  "wallet.grant": "granted credit",
  "settings.discovery": "changed how discovery publishes",
  "settings.change": "changed a setting:",
  "settings.reset": "reset a setting:",
  "role.bootstrap": "took the first admin role",
};

/* What the line is about, as a colour on the avatar's edge. The families are
   the product's own: violet for the feed, red for anything taken away, yellow
   for money and settings, blue for a vote. */
function toneOf(action: string): string {
  if (action.startsWith("comment.") || action === "topic.retired") return "ring-love-fill";
  if (action.startsWith("wallet.") || action.startsWith("settings.")) return "ring-coin-fill";
  if (action.startsWith("topic.")) return "ring-go-fill";
  if (action.startsWith("vote.")) return "ring-hate-fill";
  return "ring-line-2";
}

function facts(metadata: unknown): string[] {
  if (!metadata || typeof metadata !== "object") return [];
  return Object.entries(metadata as Record<string, unknown>)
    .filter(([, v]) => v !== undefined && v !== null && v !== "")
    .slice(0, 3)
    .map(([k, v]) => `${k} ${typeof v === "boolean" ? (v ? "on" : "off") : String(v)}`);
}

function clock(ms: number): string {
  return new Date(ms).toLocaleTimeString(undefined, { hour: "2-digit", minute: "2-digit" });
}

/** "Today", "Yesterday", or the date. The unit a record is read in. */
function dayOf(ms: number): string {
  const day = 86_400_000;
  const start = (t: number) => Math.floor(t / day);
  const diff = start(Date.now()) - start(ms);
  if (diff === 0) return "Today";
  if (diff === 1) return "Yesterday";
  return fmtShortDate(ms);
}

export function AuditRecord({
  limit = 60,
  dense = false,
}: {
  limit?: number;
  /** The aside's shape: narrower, tighter, no target column. */
  dense?: boolean;
}) {
  const rows = useQuery(api.auditLog.recent, { limit });

  if (rows === undefined) {
    return (
      <ul className={cn("space-y-2", dense ? "p-3" : "")}>
        {Array.from({ length: dense ? 8 : 12 }, (_, i) => (
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

  const days: { day: string; rows: typeof rows }[] = [];
  for (const row of rows) {
    const day = dayOf(row.at);
    const last = days[days.length - 1];
    if (last && last.day === day) last.rows.push(row);
    else days.push({ day, rows: [row] });
  }

  return (
    <div className={cn(dense ? "px-4 py-3" : "")}>
      {days.map((group) => (
        <section key={group.day} className="mb-5 last:mb-0">
          <h3
            className={cn(
              "mb-2 text-[10.5px] font-extrabold tracking-[0.12em] text-mute uppercase",
              dense ? "" : "px-1",
            )}
          >
            {group.day}
          </h3>
          <ol className="relative ml-[15px] border-l border-line">
            {group.rows.map((row, i) => (
              <li
                key={row._id}
                style={{ animationDelay: `${Math.min(i, 12) * 24}ms` }}
                className={cn(
                  "stagger relative flex items-start gap-3 pl-5",
                  dense ? "py-2" : "py-2.5",
                )}
              >
                <span className="absolute top-2.5 -left-[17px]">
                  <Avatar
                    name={row.actor}
                    className={cn("ring-2 ring-offset-2 ring-offset-surface", toneOf(row.action))}
                  />
                </span>

                <span className="min-w-0 flex-1">
                  <span className="block text-[13px] leading-snug">
                    <span className="font-extrabold">{row.actor}</span>
                    <span className="text-ink-3">
                      {" "}
                      {SAID[row.action] ?? row.action.replace(/[._]/g, " ")}
                    </span>
                    {row.target ? (
                      <>
                        {" "}
                        <a
                          href={`/t/${row.target.slug}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="font-bold text-ink underline decoration-line-2 underline-offset-4 hover:decoration-go"
                        >
                          {row.target.label}
                        </a>
                      </>
                    ) : row.targetId && row.targetType !== "topic" && row.targetType !== "topics" ? (
                      <span className="num text-ink-2"> {row.targetId}</span>
                    ) : null}
                  </span>
                  <span className="mt-1 flex flex-wrap items-center gap-1.5">
                    <span className="rounded-[4px] bg-surface-3 px-1.5 py-px text-[10px] font-extrabold tracking-[0.06em] text-mute uppercase">
                      {row.actorRole}
                    </span>
                    {facts(row.metadata).map((f) => (
                      <span key={f} className="num text-[11px] text-mute">
                        {f}
                      </span>
                    ))}
                  </span>
                </span>

                <span className="num shrink-0 pt-0.5 text-[11px] font-bold text-mute">
                  {clock(row.at)}
                </span>
              </li>
            ))}
          </ol>
        </section>
      ))}
    </div>
  );
}

/**
 * The record as its own section. Nothing to select: every line is already the
 * whole fact, and a row that opened into a detail pane would be pretending
 * there is more to know than was written.
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
            Every privileged write in bipolar lands here, in the{" "}
            <strong className="text-ink">same transaction</strong> as the thing
            it describes. There is no code path that changes something
            privileged and leaves no line.
          </p>
          <p>
            Nothing updates a row and nothing deletes one. A record that can be
            tidied up is a record nobody can rely on, so the table is
            append-only and stays that way even when a line is embarrassing.
          </p>
          <p>
            A question named on a line opens on the site{" "}
            <ArrowSquareOut className="inline size-3.5" /> — the site as it is
            now, which may not be as it was when the line was written.
          </p>
          <p className="!mt-4 border-t border-line pt-3 text-[12px] text-mute">
            Reading this is an admin capability. The record is what a moderator
            is accountable to.
          </p>
        </div>
      </Aside>
    </>
  );
}
