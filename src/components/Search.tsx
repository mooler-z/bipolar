import { useEffect, useRef, useState } from "react";
import { useQuery } from "convex/react";
import { MagnifyingGlass, X } from "@phosphor-icons/react";

import { api } from "../../convex/_generated/api";
import { cn } from "../lib/cn";
import { fmtInt } from "../lib/format";
import { navigate } from "../lib/nav";
import { Button } from "../ui/Button";
import { Field } from "../ui/Field";
import { Flag } from "../ui/Flag";

/**
 * Finding a question by name.
 *
 * Ten results under the box, each one a face and a line — the picture is what
 * makes a list of names scannable, and every person topic has one. Pressing a
 * result opens **the world page for that question** rather than the run: if
 * somebody typed a name, they want to know how the room feels about that name,
 * not to be handed the next unrelated card.
 *
 * The dropdown shows how busy a question is and never how it went. A search
 * result carrying the split would be the easiest way around the gate in the
 * whole product, and the one nobody would have to look for.
 *
 * Arrows move, enter opens, escape closes — a box that can only be used with a
 * mouse is a box that is slower than the address bar.
 */
export function Search({ className }: { className?: string }) {
  const [q, setQ] = useState("");
  const [open, setOpen] = useState(false);
  const [at, setAt] = useState(0);
  const box = useRef<HTMLDivElement>(null);
  const field = useRef<HTMLInputElement>(null);

  const results = useQuery(api.search.topics, q.trim().length >= 2 ? { q } : "skip");
  const rows = results ?? [];

  // A click anywhere else closes it; a dropdown that outlives its box is a
  // menu floating over a page nobody asked.
  useEffect(() => {
    function away(e: MouseEvent) {
      if (!box.current?.contains(e.target as Node)) setOpen(false);
    }
    window.addEventListener("mousedown", away);
    return () => window.removeEventListener("mousedown", away);
  }, []);

  useEffect(() => setAt(0), [q]);

  function go(slug: string) {
    setOpen(false);
    setQ("");
    field.current?.blur();
    navigate(`/t/${slug}/world`);
  }

  return (
    <div ref={box} className={cn("relative", className)}>
      <span
        className={cn(
          "flex min-h-9 items-center gap-2 rounded-[var(--r-btn)] border px-3 transition-colors",
          open ? "border-hate-fill bg-surface-2" : "border-line bg-surface-2/60 hover:border-line-2",
        )}
      >
        <MagnifyingGlass className="size-4 shrink-0 text-mute" />
        <Field
          ref={field}
          bare
          label="Search topics"
          value={q}
          placeholder="Search a name…"
          onFocus={() => setOpen(true)}
          onChange={(e) => {
            setQ(e.target.value);
            setOpen(true);
          }}
          onKeyDown={(e) => {
            if (e.key === "Escape") {
              setOpen(false);
              field.current?.blur();
            }
            if (rows.length === 0) return;
            if (e.key === "ArrowDown") {
              e.preventDefault();
              setAt((i) => (i + 1) % rows.length);
            }
            if (e.key === "ArrowUp") {
              e.preventDefault();
              setAt((i) => (i - 1 + rows.length) % rows.length);
            }
            if (e.key === "Enter") {
              e.preventDefault();
              go(rows[at]?.slug ?? rows[0]!.slug);
            }
          }}
          className="!min-h-0 !border-0 !bg-transparent !px-0 !py-1.5 !text-[13px]"
        />
        {q ? (
          <Button
            bare
            aria-label="Clear"
            onClick={() => {
              setQ("");
              field.current?.focus();
            }}
            className="grid size-5 shrink-0 place-items-center rounded-full text-mute hover:bg-surface-3 hover:text-ink"
          >
            <X weight="bold" className="size-3" />
          </Button>
        ) : null}
      </span>

      {open && q.trim().length >= 2 ? (
        <ul
          role="listbox"
          aria-label="Search results"
          className="slide-up absolute top-full right-0 left-0 z-50 mt-1.5 max-h-[70vh] overflow-y-auto rounded-[var(--r-card)] border border-line-2 bg-surface py-1 shadow-[0_14px_40px_rgba(0,0,0,0.45)]"
        >
          {results === undefined ? (
            <li className="px-3 py-2.5 text-[12.5px] text-mute">Looking…</li>
          ) : rows.length === 0 ? (
            <li className="px-3 py-2.5 text-[12.5px] text-mute">
              Nothing here answers to that.
            </li>
          ) : (
            rows.map((row, i) => (
              <li key={row.slug} role="option" aria-selected={i === at}>
                <Button
                  bare
                  onMouseEnter={() => setAt(i)}
                  onClick={() => go(row.slug)}
                  className={cn(
                    "flex w-full items-center gap-3 px-2.5 py-2 text-left transition-colors",
                    i === at ? "bg-surface-3" : "hover:bg-surface-2",
                  )}
                >
                  {row.imageUrl ? (
                    <img
                      src={row.imageUrl}
                      alt=""
                      aria-hidden
                      loading="lazy"
                      className="size-9 shrink-0 rounded-[8px] object-cover"
                    />
                  ) : (
                    <span className="size-9 shrink-0 rounded-[8px] bg-surface-3" />
                  )}
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-[13px] font-bold text-ink">
                      {row.question}
                    </span>
                    <span className="flex items-center gap-1.5 text-[11px] text-mute">
                      {row.about ? <Flag code={row.about} /> : null}
                      <span className="capitalize">{row.categorySlug}</span>
                      <span>·</span>
                      <span className="num">
                        {fmtInt(row.votes)} {row.votes === 1 ? "vote" : "votes"}
                      </span>
                    </span>
                  </span>
                </Button>
              </li>
            ))
          )}
        </ul>
      ) : null}
    </div>
  );
}
