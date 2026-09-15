import { useEffect, useMemo, useState } from "react";
import { useMutation, usePaginatedQuery, useQuery } from "convex/react";
import { ClipboardText, Robot, Scroll, Stack, Warning } from "@phosphor-icons/react";

import { api } from "../../../convex/_generated/api";
import type { Id } from "../../../convex/_generated/dataModel";
import { PAGE } from "../../../convex/lib/page";
import { fmtInt } from "../../lib/format";
import { useAutoLoad } from "../../lib/useAutoLoad";
import { More } from "../../ui/More";
import { AuditRecord } from "./AuditRecord";
import { CrawlPanel } from "./Crawl";
import { CrawlFeed } from "./CrawlFeed";
import { Inspector } from "./Inspector";
import { Aside, Empty, Work } from "./panes";
import { BulkBar, SessionHead, groupBySession } from "./queue";
import { TopicRow, type AdminTopic } from "./TopicRow";
import { TopicToolbar } from "./TopicToolbar";

/**
 * The work: a filtered list of topics, and whatever one of them is open.
 *
 * Two sections come out of this one component, because they are the same job
 * seen through a different filter: **Topics** is everything, **Review queue**
 * is the drafts, grouped into the crawling sessions they arrived in. Building
 * the queue as its own screen would have meant two lists, two selection models
 * and two sets of actions drifting apart.
 *
 * **Two kinds of selection.** Opening a row fills the aside;
 * picking a row puts it in a batch. They are different jobs — one is "what is
 * this", the other is "these fifteen, yes" — and a list where they are the same
 * gesture makes the second one dangerous.
 *
 * Search and the filter are local state rather than URL state, because this
 * console has no router. Everything else is a live Convex query, so an archive
 * lands on screen without a refetch, in the list and in the aside at once.
 */

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
  const [open, setOpen] = useState<string | null>(null);
  const [picked, setPicked] = useState<Set<string>>(() => new Set());
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  const queue = fixedStatus === "draft";
  const crawl = !fixedStatus && status === "crawl"; // its own tab, not a filter
  const [session, setSession] = useState<Id<"ingestRuns"> | null>(null);
  const q = { search: search.trim() || undefined, status: fixedStatus ?? status ?? undefined };
  const filter = crawl ? ("skip" as const) : q;
  const list = usePaginatedQuery(api.adminTopics.list, filter, { initialNumItems: PAGE });
  const { status: paging, loadMore } = list;
  const sentinel = useAutoLoad(paging, loadMore, PAGE);
  const sessions = useQuery(
    api.adminQueue.sessions,
    queue || crawl ? { limit: crawl ? 30 : 20 } : "skip",
  );
  const decide = useMutation(api.adminQueue.decideMany);

  const rows = useMemo(() => list.results as AdminTopic[], [list.results]);
  const current = rows.find((r) => r._id === open) ?? null;
  const waves = useMemo(
    () => (queue ? groupBySession(rows) : [{ seq: null, rows }]),
    [queue, rows],
  );
  const sessionOf = useMemo(
    () => new Map((sessions ?? []).map((s) => [s.seq, s])),
    [sessions],
  );

  const can = {
    publish: permissions.includes("topics:publish"),
    archive: permissions.includes("topics:archive"),
  };
  const batching = can.publish || can.archive;

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

      if (e.key === "Escape") {
        setOpen(null);
        setPicked(new Set());
        return;
      }
      if (e.key !== "ArrowDown" && e.key !== "ArrowUp") return;
      if (rows.length === 0) return;
      e.preventDefault();
      const at = rows.findIndex((r) => r._id === open);
      const next =
        e.key === "ArrowDown"
          ? Math.min(at + 1, rows.length - 1)
          : Math.max(at - 1, 0);
      setOpen(rows[at === -1 ? 0 : next]!._id);
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  });

  function toggle(id: string) {
    setPicked((was) => {
      const next = new Set(was);
      if (!next.delete(id)) next.add(id);
      return next;
    });
  }

  /** All of a wave, or none of it, depending on where it already stands. */
  function toggleWave(ids: string[], allIn: boolean) {
    setPicked((was) => {
      const next = new Set(was);
      for (const id of ids) {
        if (allIn) next.delete(id);
        else next.add(id);
      }
      return next;
    });
  }

  async function decideAll(to: "active" | "archived") {
    setBusy(true);
    setError("");
    try {
      const out = await decide({
        topicIds: [...picked] as Id<"topics">[],
        status: to,
      });
      setPicked(new Set());
      if (out.skipped > 0) {
        setError(
          `${fmtInt(out.changed)} changed. ${fmtInt(out.skipped)} left alone — already there, or not yours.`,
        );
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setBusy(false);
    }
  }

  const toolbar = (
    <TopicToolbar
      search={search}
      onSearch={setSearch}
      status={status}
      onStatus={setStatus}
      fixed={fixedStatus}
      total={rows.length}
      permissions={permissions}
    />
  );

  if (crawl) {
    const current = sessions?.find((s) => s._id === session) ?? null;
    return (
      <>
        <Work toolbar={toolbar}>
          <CrawlPanel
            permissions={permissions}
            sessions={sessions}
            selected={session}
            onSelect={setSession}
          />
        </Work>
        <Aside title="The session" icon={<Robot weight="fill" className="size-4 text-mute" />}>
          <CrawlFeed session={current} />
        </Aside>
      </>
    );
  }

  return (
    <>
      <Work
        toolbar={toolbar}
        footer={
          <BulkBar
            count={picked.size}
            busy={busy}
            canPublish={can.publish}
            canArchive={can.archive}
            onPublish={() => void decideAll("active")}
            onArchive={() => void decideAll("archived")}
            onClear={() => setPicked(new Set())}
          />
        }
      >
        {error ? (
          <p className="slide-up mb-3 flex items-center gap-2 rounded-[var(--r-sm)] border border-love-fill/40 bg-love-fill/12 px-3.5 py-2.5 text-[13px] font-semibold text-love">
            <Warning weight="fill" className="size-4 shrink-0" />
            {error}
          </p>
        ) : null}

        {paging === "LoadingFirstPage" ? (
          <ul className="space-y-1.5">
            {Array.from({ length: PAGE }, (_, i) => (
              <li key={i} className="shimmer h-14 rounded-[var(--r-btn)]" />
            ))}
          </ul>
        ) : rows.length === 0 ? (
          <Empty
            icon={queue ? <ClipboardText className="size-7" /> : <Stack className="size-7" />}
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
                  ? "Every draft the crawler proposed has been decided on."
                  : "Discovery runs several times a day and mints what it finds."
            }
          />
        ) : (
          waves.map((wave) => {
            const ids = wave.rows.map((r) => r._id);
            const allIn = ids.every((id) => picked.has(id));
            return (
              <div key={wave.seq ?? "none"}>
                {queue ? (
                  <SessionHead
                    seq={wave.seq}
                    session={sessionOf.get(wave.seq)}
                    count={ids.length}
                    allChecked={allIn}
                    onToggleAll={() => toggleWave(ids, allIn)}
                  />
                ) : null}
                <ul className="space-y-1">
                  {wave.rows.map((t, i) => (
                    <TopicRow
                      key={t._id}
                      index={i}
                      topic={t}
                      selected={open === t._id}
                      checked={picked.has(t._id)}
                      onSelect={() => setOpen(t._id === open ? null : t._id)}
                      onCheck={batching ? () => toggle(t._id) : undefined}
                    />
                  ))}
                </ul>
              </div>
            );
          })
        )}

        {crawl ? null : (
          <More
            sentinel={sentinel}
            status={paging}
            onMore={() => loadMore(PAGE)}
            count={rows.length}
            noun="topics"
          />
        )}
      </Work>

      <Aside
        title={current ? "The topic" : "The record"}
        icon={current ? null : <Scroll weight="fill" className="size-4 text-mute" />}
        sheet={!!current}
        onClose={current ? () => setOpen(null) : undefined}
      >
        {current ? (
          <Inspector topic={current} permissions={permissions} />
        ) : permissions.includes("audit:read") ? (
          /* Nothing open, so the column shows what the console has been used
             for. It is the one screen that makes "every action here is
             recorded" something you can see rather than something you are told. */
          <AuditRecord dense />
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
