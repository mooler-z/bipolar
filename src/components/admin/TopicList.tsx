import { useEffect, useState } from "react";
import { useQuery } from "convex/react";
import { ClipboardText, MagnifyingGlass, Scroll, Stack } from "@phosphor-icons/react";

import { api } from "../../../convex/_generated/api";
import { cn } from "../../lib/cn";
import { fmtInt } from "../../lib/format";
import { Button } from "../../ui/Button";
import { Field } from "../../ui/Field";
import { Inspector } from "./Inspector";
import { AuditRecord } from "./AuditRecord";
import { Aside, Empty, Work } from "./panes";
import { TopicRow, type AdminTopic } from "./TopicRow";

/**
 * The work: a filtered list of topics, and whatever one of them is open.
 *
 * Two sections come out of this one component, because they are the same job
 * seen through a different filter: **Topics** is everything, **Review queue**
 * is the drafts. Building the queue as its own screen would have meant two
 * lists, two selection models and two sets of actions drifting apart.
 *
 * Search and the filter are local state rather than URL state, because this
 * console has no router — one honest limitation stated once beats a half-built
 * one. Everything else is a live Convex query, so an archive lands on screen
 * without a refetch, in the list and in the aside at the same time.
 */

const FILTERS = [
  { id: "", label: "All" },
  { id: "active", label: "Live" },
  { id: "draft", label: "Draft" },
  { id: "archived", label: "Archived" },
] as const;

export function TopicList({
  permissions,
  /** The queue is this list locked to one status. */
  fixedStatus,
}: {
  permissions: string[];
  fixedStatus?: string;
}) {
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState<string>("");
  const [selected, setSelected] = useState<string | null>(null);

  const data = useQuery(api.adminTopics.list, {
    search: search.trim() || undefined,
    status: fixedStatus ?? status ?? undefined,
    limit: 80,
  });

  const rows = (data?.rows ?? []) as AdminTopic[];
  const current = rows.find((r) => r._id === selected) ?? null;

  /* The keyboard is a real path here: a moderator working a queue should never
     have to go back to the mouse between one topic and the next. */
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      const el = e.target as HTMLElement | null;
      if (el && (el.tagName === "INPUT" || el.tagName === "TEXTAREA")) {
        if (e.key === "Escape") el.blur();
        return;
      }
      if (e.metaKey || e.ctrlKey || e.altKey) return;

      if (e.key === "Escape") return setSelected(null);
      if (e.key !== "ArrowDown" && e.key !== "ArrowUp") return;
      if (rows.length === 0) return;
      e.preventDefault();
      const at = rows.findIndex((r) => r._id === selected);
      const next =
        e.key === "ArrowDown"
          ? Math.min(at + 1, rows.length - 1)
          : Math.max(at - 1, 0);
      setSelected(rows[at === -1 ? 0 : next]!._id);
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  });

  const queue = fixedStatus === "draft";

  return (
    <>
      <Work
        toolbar={
          <>
            <span className="flex min-h-9 min-w-0 flex-1 items-center gap-2 rounded-[var(--r-btn)] border border-line-2 bg-surface-2 px-3 transition-colors focus-within:border-hate-fill">
              <MagnifyingGlass className="size-4 shrink-0 text-mute" />
              <Field
                bare
                label="Search topics"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Question, slug, or picture title…"
              />
            </span>

            {fixedStatus ? null : (
              <span
                role="tablist"
                className="flex shrink-0 items-center gap-1 rounded-[var(--r-btn)] bg-surface-2 p-1 max-lg:hidden"
              >
                {FILTERS.map((f) => (
                  <Button
                    key={f.id}
                    bare
                    role="tab"
                    aria-selected={status === f.id}
                    onClick={() => setStatus(f.id)}
                    className={cn(
                      "relative min-h-8 rounded-[9px] px-3 text-[12.5px] font-bold transition-colors",
                      status === f.id
                        ? "bg-surface-4 text-ink"
                        : "text-mute hover:bg-surface-3/70 hover:text-ink-3",
                    )}
                  >
                    {f.label}
                    <span
                      aria-hidden
                      className={cn(
                        "absolute inset-x-2.5 bottom-0 h-[3px] rounded-full transition-colors",
                        status === f.id ? "bg-go-fill" : "bg-transparent",
                      )}
                    />
                  </Button>
                ))}
              </span>
            )}

            {data ? (
              <span className="chip shrink-0 max-sm:hidden">
                <span className="num font-extrabold text-ink">
                  {fmtInt(data.total)}
                </span>
                {data.total === 1 ? "topic" : "topics"}
              </span>
            ) : null}
          </>
        }
      >
        {data === undefined ? (
          <ul className="space-y-1.5">
            {Array.from({ length: 10 }, (_, i) => (
              <li key={i} className="shimmer h-14 rounded-[var(--r-btn)]" />
            ))}
          </ul>
        ) : rows.length === 0 ? (
          <Empty
            icon={
              queue ? (
                <ClipboardText className="size-7" />
              ) : (
                <Stack className="size-7" />
              )
            }
            title={
              search
                ? "Nothing matches that."
                : queue
                  ? "The queue is clear."
                  : "No topics yet."
            }
            hint={
              search
                ? undefined
                : queue
                  ? "Every draft discovery proposed has been decided on."
                  : "Discovery runs every six hours and mints what it finds."
            }
          />
        ) : (
          <ul className="space-y-1">
            {rows.map((t, i) => (
              <TopicRow
                key={t._id}
                index={i}
                topic={t}
                selected={selected === t._id}
                onSelect={() => setSelected(t._id === selected ? null : t._id)}
              />
            ))}
          </ul>
        )}

        {/* The list is bounded. Say so, rather than presenting a cap as a total. */}
        {data?.capped ? (
          <p className="pt-4 text-center text-[12px] text-mute">
            Showing the most recent {fmtInt(rows.length)}. Narrow the search to
            reach older topics.
          </p>
        ) : null}
      </Work>

      <Aside
        title={current ? "The topic" : "The record"}
        icon={
          current ? null : <Scroll weight="fill" className="size-4 text-mute" />
        }
        sheet={!!current}
        onClose={current ? () => setSelected(null) : undefined}
      >
        {current ? (
          <Inspector topic={current} permissions={permissions} />
        ) : permissions.includes("audit:read") ? (
          /* Nothing selected, so the column shows what the console has been
             used for. It is the one screen that makes "every action here is
             recorded" something you can see rather than something you are told. */
          <AuditRecord limit={30} dense />
        ) : (
          <Empty
            title="Pick a topic"
            hint="Everything you can do to one is in here, with room to say what it does."
          />
        )}
      </Aside>
    </>
  );
}
