import { useEffect, useState } from "react";
import { MagnifyingGlass } from "@phosphor-icons/react";

import { cn } from "../../lib/cn";
import { pathOf, reachable } from "../../lib/admin-nav";
import { Button } from "../../ui/Button";
import { Field } from "../../ui/Field";

/**
 * The command palette.
 *
 * Seeded from the same nav list and filtered by the same permissions as the
 * sidebar, so it can never offer a page the role cannot reach. A palette that
 * knows more than the rail is a palette that eventually offers a 403.
 */
export function Palette({
  open,
  onClose,
  permissions,
  onGo,
}: {
  open: boolean;
  onClose: () => void;
  permissions: string[];
  onGo: (path: string) => void;
}) {
  const [q, setQ] = useState("");
  const [cursor, setCursor] = useState(0);

  const hits = reachable(permissions).filter(
    (n) => n.ready && n.label.toLowerCase().includes(q.trim().toLowerCase()),
  );

  useEffect(() => {
    if (open) {
      setQ("");
      setCursor(0);
    }
  }, [open]);

  useEffect(() => {
    if (!open) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") {
        e.preventDefault();
        onClose();
      } else if (e.key === "ArrowDown") {
        e.preventDefault();
        setCursor((c) => Math.min(c + 1, hits.length - 1));
      } else if (e.key === "ArrowUp") {
        e.preventDefault();
        setCursor((c) => Math.max(c - 1, 0));
      } else if (e.key === "Enter") {
        const hit = hits[cursor];
        if (hit) {
          e.preventDefault();
          onGo(pathOf(hit.id));
          onClose();
        }
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  });

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-start justify-center bg-black/60 px-6 pt-[18vh] backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-label="Command palette"
        onClick={(e) => e.stopPropagation()}
        className="rise w-full max-w-lg overflow-hidden rounded-[var(--r-card)] border border-line bg-surface"
      >
        <label className="flex items-center gap-2.5 border-b border-line px-4">
          <MagnifyingGlass className="size-4 shrink-0 text-mute" />
          <Field
            bare
            label="Jump to a section"
            autoFocus
            value={q}
            onChange={(e) => {
              setQ(e.target.value);
              setCursor(0);
            }}
            placeholder="Jump to a section…"
            className="h-12"
          />
          <kbd className="rounded-[5px] bg-surface-3 px-1.5 py-0.5 text-[10px] font-bold text-mute">
            esc
          </kbd>
        </label>

        <ul className="col-scroll max-h-[46vh] p-2">
          {hits.length === 0 ? (
            <li className="px-2 py-6 text-center text-[13px] text-mute">
              Nothing here matches that.
            </li>
          ) : (
            hits.map((hit, i) => {
              const Icon = hit.icon;
              return (
                <li key={hit.id}>
                  <Button
                    bare
                    onMouseEnter={() => setCursor(i)}
                    onClick={() => {
                      onGo(pathOf(hit.id));
                      onClose();
                    }}
                    className={cn(
                      "flex min-h-10 w-full items-center gap-2.5 rounded-[var(--r-btn)] px-2.5",
                      "text-[13px] font-bold transition-colors",
                      i === cursor ? "bg-surface-3 text-ink" : "text-ink-3",
                    )}
                  >
                    <Icon className="size-4 shrink-0" />
                    <span className="flex-1 text-left">{hit.label}</span>
                    {i === cursor ? (
                      <kbd className="text-[10px] text-mute">&crarr;</kbd>
                    ) : null}
                  </Button>
                </li>
              );
            })
          )}
        </ul>
      </div>
    </div>
  );
}
