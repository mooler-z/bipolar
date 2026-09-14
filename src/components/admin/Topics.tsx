import { useState } from "react";
import { useMutation, useQuery } from "convex/react";
import { MagnifyingGlass, Warning } from "@phosphor-icons/react";

import { api } from "../../../convex/_generated/api";
import type { Id } from "../../../convex/_generated/dataModel";
import { cn } from "../../lib/cn";
import { fmtInt } from "../../lib/format";
import { Button } from "../../ui/Button";
import { Field } from "../../ui/Field";
import { Discovery } from "./Discovery";
import { TopicRow, type AdminTopic } from "./TopicRow";

/**
 * The topic list.
 *
 * Search and the status filter are local state rather than URL state, because
 * this console has no router — one honest limitation stated once beats a
 * half-built one. Everything else is a live Convex query, so an archive lands
 * on screen without a refetch.
 */

const FILTERS = [
  { id: "", label: "All" },
  { id: "active", label: "Live" },
  { id: "draft", label: "Draft" },
  { id: "archived", label: "Archived" },
] as const;

export function Topics({
  permissions,
  onOpen,
}: {
  permissions: string[];
  onOpen: (slug: string) => void;
}) {
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState<string>("");
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState("");

  const data = useQuery(api.adminTopics.list, {
    search: search.trim() || undefined,
    status: status || undefined,
    limit: 80,
  });

  const setStatusFor = useMutation(api.adminTopics.setStatus);
  const setFeatured = useMutation(api.adminTopics.setFeatured);
  const setLocked = useMutation(api.adminTopics.setLocked);

  const can = {
    archive: permissions.includes("topics:archive"),
    feature: permissions.includes("topics:feature"),
    lock: permissions.includes("topics:lock"),
    publish: permissions.includes("topics:publish"),
  };

  /** Every action reports its own failure. A refusal must never be silent. */
  async function run(id: string, work: () => Promise<unknown>) {
    setBusy(id);
    setError("");
    try {
      await work();
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setBusy(null);
    }
  }

  return (
    <div className="space-y-4">
      <Discovery
        permissions={permissions}
        onShowDrafts={() => {
          setStatus("draft");
          setSearch("");
        }}
      />

      <div className="flex flex-wrap items-center gap-3">
        <span className="flex min-h-10 min-w-[16rem] flex-1 items-center gap-2.5 rounded-[var(--r-pill)] border border-line bg-surface-2 px-3.5">
          <MagnifyingGlass className="size-4 shrink-0 text-mute" />
          <Field
            bare
            label="Search topics"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Question, slug, or Wikipedia title…"
          />
        </span>

        <span className="flex items-center gap-1 rounded-[var(--r-pill)] border border-line bg-surface-2 p-1">
          {FILTERS.map((f) => (
            <Button
              key={f.id}
              bare
              onClick={() => setStatus(f.id)}
              className={cn(
                "min-h-8 rounded-[var(--r-pill)] px-3 text-[12.5px] font-bold transition-colors",
                status === f.id
                  ? "bg-surface-3 text-ink"
                  : "text-mute hover:text-ink-3",
              )}
            >
              {f.label}
            </Button>
          ))}
        </span>

        {data ? (
          <span className="num text-[12.5px] text-mute">
            {fmtInt(data.total)} {data.total === 1 ? "topic" : "topics"}
          </span>
        ) : null}
      </div>

      {error ? (
        <p className="flex items-center gap-2 rounded-[var(--r-btn)] bg-love/12 px-3.5 py-2.5 text-[13px] font-semibold text-love">
          <Warning weight="fill" className="size-4 shrink-0" />
          {error}
        </p>
      ) : null}

      {data === undefined ? (
        <ul className="space-y-2">
          {Array.from({ length: 8 }, (_, i) => (
            <li key={i} className="shimmer h-[4.5rem] rounded-[var(--r-card)]" />
          ))}
        </ul>
      ) : data.rows.length === 0 ? (
        <p className="card px-6 py-14 text-center text-[14px] text-mute">
          {search || status
            ? "Nothing matches that."
            : "No topics yet. Discovery runs every six hours."}
        </p>
      ) : (
        <ul className="space-y-2">
          {data.rows.map((t) => (
            <TopicRow
              key={t._id}
              topic={t as AdminTopic}
              can={can}
              busy={busy === t._id}
              onOpen={() => onOpen(t.slug)}
              onStatus={(next) =>
                void run(t._id, () =>
                  setStatusFor({
                    topicId: t._id as Id<"topics">,
                    status: next,
                  }),
                )
              }
              onFeature={(featured) =>
                void run(t._id, () =>
                  setFeatured({ topicId: t._id as Id<"topics">, featured }),
                )
              }
              onLock={(locked) =>
                void run(t._id, () =>
                  setLocked({ topicId: t._id as Id<"topics">, locked }),
                )
              }
            />
          ))}
        </ul>
      )}

      {/* The list is bounded. Say so, rather than presenting a cap as a total. */}
      {data?.capped ? (
        <p className="text-center text-[12px] text-mute">
          Showing the most recent {fmtInt(data.rows.length)}. Narrow the search
          to reach older topics.
        </p>
      ) : null}
    </div>
  );
}
