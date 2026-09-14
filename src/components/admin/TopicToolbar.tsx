import { MagnifyingGlass } from "@phosphor-icons/react";

import { cn } from "../../lib/cn";
import { fmtInt } from "../../lib/format";
import { Button } from "../../ui/Button";
import { Field } from "../../ui/Field";
import { ModeSwitch } from "./ModeSwitch";

/**
 * The strip above the list: what you are looking for, and what you are looking
 * at. Split out because the list itself was at the line budget, and because
 * these controls answer to the section rather than to any row in it.
 */

const FILTERS = [
  { id: "", label: "All" },
  { id: "active", label: "Live" },
  { id: "draft", label: "Draft" },
  { id: "archived", label: "Archived" },
  /* Not a filter: the crawler itself, on the same strip, because "where do
     these come from" is a question asked while looking at the list. */
  { id: "crawl", label: "Crawl" },
] as const;

export function TopicToolbar({
  search,
  onSearch,
  status,
  onStatus,
  /** Set when the section pins one status, which hides the filter. */
  fixed,
  total,
  permissions,
}: {
  search: string;
  onSearch: (value: string) => void;
  status: string;
  onStatus: (status: string) => void;
  fixed?: string;
  total?: number;
  permissions: string[];
}) {
  return (
    <>
      {status === "crawl" ? (
        <span className="flex-1" />
      ) : (
        <span className="flex min-h-9 min-w-0 flex-1 items-center gap-2 rounded-[var(--r-btn)] border border-line-2 bg-surface-2 px-3 transition-colors focus-within:border-hate-fill">
          <MagnifyingGlass className="size-4 shrink-0 text-mute" />
          <Field
            bare
            label="Search topics"
            value={search}
            onChange={(e) => onSearch(e.target.value)}
            placeholder="Question, slug, or picture title…"
          />
        </span>
      )}

      {fixed ? null : (
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
              onClick={() => onStatus(f.id)}
              className={cn(
                "relative min-h-8 rounded-[9px] px-3 text-[12.5px] font-bold transition-colors",
                f.id === "crawl" && "ml-1 border-l border-line pl-4",
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
                  status === f.id ? (f.id === "crawl" ? "bg-hate-fill" : "bg-go-fill") : "bg-transparent",
                )}
              />
            </Button>
          ))}
        </span>
      )}

      {/* How new topics arrive belongs on the screens where they are dealt
          with, not only on the overview. The same component as the panel there,
          so the two can never disagree about what the setting is. */}
      <span className="max-md:hidden">
        <ModeSwitch permissions={permissions} compact />
      </span>

      {total === undefined || status === "crawl" ? null : (
        <span className="chip shrink-0 max-xl:hidden">
          <span className="num font-extrabold text-ink">{fmtInt(total)}</span>
          {total === 1 ? "topic" : "topics"}
        </span>
      )}
    </>
  );
}
