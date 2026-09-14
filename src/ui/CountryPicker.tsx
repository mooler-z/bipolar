import { useEffect, useMemo, useRef, useState } from "react";
import { CaretDown, Check, MagnifyingGlass } from "@phosphor-icons/react";

import worldMap from "../data/world-map.json";
import { cn } from "../lib/cn";
import { Button } from "./Button";
import { Field } from "./Field";
import { Flag } from "./Flag";

/**
 * Pick a country by name, not by code.
 *
 * Two letters is what the server stores and a terrible thing to ask a person
 * for: half the world does not know its own ISO code, and the ones who guess
 * get `UK` wrong. This is the list, filtered as you type, with the flag beside
 * every name — and the code still shown, because somebody who does know theirs
 * should be able to confirm it at a glance.
 *
 * A listbox rather than a `<select>`: the native one cannot carry a flag, and
 * on a phone it becomes a wheel of two hundred names with no search at all.
 */

const NATIONS = [...worldMap.countries]
  .map((c) => ({ code: c.code, name: c.name }))
  .sort((a, b) => a.name.localeCompare(b.name));

export function CountryPicker({
  value,
  onPick,
  label = "Country",
  disabled = false,
}: {
  /** The current code, or undefined when nothing is set. */
  value?: string;
  onPick: (code: string) => void;
  label?: string;
  disabled?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [cursor, setCursor] = useState(0);
  const box = useRef<HTMLDivElement>(null);

  const current = NATIONS.find((c) => c.code === value) ?? null;

  const shown = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return NATIONS;
    return NATIONS.filter(
      (c) => c.name.toLowerCase().includes(q) || c.code.toLowerCase() === q,
    );
  }, [query]);

  /* Pressing anywhere else is a decision not to choose. Without this the list
     stays open behind whatever the reader went on to do. */
  useEffect(() => {
    if (!open) return;
    function away(e: PointerEvent) {
      if (!box.current?.contains(e.target as Node)) setOpen(false);
    }
    window.addEventListener("pointerdown", away);
    return () => window.removeEventListener("pointerdown", away);
  }, [open]);

  useEffect(() => {
    if (open) {
      setQuery("");
      setCursor(0);
    }
  }, [open]);

  function choose(code: string) {
    onPick(code);
    setOpen(false);
  }

  return (
    <div ref={box} className="relative">
      <span className="label mb-1.5 block">{label}</span>

      <Button
        bare
        role="combobox"
        aria-expanded={open}
        aria-haspopup="listbox"
        disabled={disabled}
        onClick={() => setOpen((o) => !o)}
        className={cn(
          "flex h-12 w-full items-center gap-2.5 rounded-[var(--r-btn)] border-2 px-3.5 text-left",
          "bg-surface-2 text-[15px] font-medium transition-colors",
          open ? "border-hate-fill" : "border-line hover:border-line-2",
          disabled && "opacity-50",
        )}
      >
        {current ? (
          <>
            <Flag code={current.code} />
            <span className="min-w-0 flex-1 truncate">{current.name}</span>
            <span className="num text-[12px] font-bold text-mute">{current.code}</span>
          </>
        ) : (
          <span className="flex-1 text-mute">Choose a country…</span>
        )}
        <CaretDown
          weight="bold"
          className={cn("size-4 shrink-0 text-mute transition-transform", open && "rotate-180")}
        />
      </Button>

      {open ? (
        <div className="rise absolute inset-x-0 top-full z-40 mt-1.5 overflow-hidden rounded-[var(--r-card)] border-2 border-line-2 bg-surface shadow-[0_18px_40px_-12px_rgba(0,0,0,0.6)]">
          <label className="flex items-center gap-2.5 border-b border-line px-3.5">
            <MagnifyingGlass className="size-4 shrink-0 text-mute" />
            <Field
              bare
              label="Find a country"
              autoFocus
              value={query}
              placeholder="Start typing…"
              onChange={(e) => {
                setQuery(e.target.value);
                setCursor(0);
              }}
              onKeyDown={(e) => {
                if (e.key === "Escape") setOpen(false);
                if (e.key === "ArrowDown") {
                  e.preventDefault();
                  setCursor((c) => Math.min(c + 1, shown.length - 1));
                }
                if (e.key === "ArrowUp") {
                  e.preventDefault();
                  setCursor((c) => Math.max(c - 1, 0));
                }
                if (e.key === "Enter" && shown[cursor]) {
                  e.preventDefault();
                  choose(shown[cursor]!.code);
                }
              }}
              className="h-11"
            />
          </label>

          <ul role="listbox" className="col-scroll max-h-[16rem] p-1.5">
            {shown.length === 0 ? (
              <li className="px-2 py-5 text-center text-[13px] text-mute">
                No country matches that.
              </li>
            ) : (
              shown.slice(0, 260).map((c, i) => {
                const on = c.code === value;
                return (
                  <li key={c.code}>
                    <Button
                      bare
                      role="option"
                      aria-selected={on}
                      onMouseEnter={() => setCursor(i)}
                      onClick={() => choose(c.code)}
                      className={cn(
                        "flex min-h-10 w-full items-center gap-2.5 rounded-[var(--r-sm)] px-2.5 text-left text-[13.5px] font-semibold",
                        i === cursor ? "bg-surface-3 text-ink" : "text-ink-3",
                      )}
                    >
                      <Flag code={c.code} />
                      <span className="min-w-0 flex-1 truncate">{c.name}</span>
                      {on ? <Check weight="bold" className="size-4 shrink-0 text-go" /> : null}
                      <span className="num text-[11px] font-bold text-mute">{c.code}</span>
                    </Button>
                  </li>
                );
              })
            )}
          </ul>
        </div>
      ) : null}
    </div>
  );
}
