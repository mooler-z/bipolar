import { useMemo, useState } from "react";
import { Check, MagnifyingGlass } from "@phosphor-icons/react";

import worldMap from "../../data/world-map.json";
import { cn } from "../../lib/cn";
import { Button } from "../../ui/Button";
import { Field } from "../../ui/Field";
import { Flag } from "../../ui/Flag";

/** Every country the map knows, alphabetical. */
const NATIONS = [...worldMap.countries]
  .map((c) => ({ code: c.code, name: c.name }))
  .sort((a, b) => a.name.localeCompare(b.name));

/**
 * The picker, filling the right-hand panel: a search on top and every flag
 * in a grid underneath, so a whole continent is visible at once rather than
 * one column scrolled past.
 */
export function CountryStep({
  country,
  onPick,
}: {
  country: string | null;
  onPick: (code: string) => void;
}) {
  const [query, setQuery] = useState("");

  const shown = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return NATIONS;
    return NATIONS.filter(
      (c) => c.name.toLowerCase().includes(q) || c.code.toLowerCase() === q,
    );
  }, [query]);

  return (
    <div className="flex h-full min-h-0 flex-col">
      <div className="relative shrink-0">
        <MagnifyingGlass className="pointer-events-none absolute top-1/2 left-3.5 size-4 -translate-y-1/2 text-mute" />
        <Field
          label="Find your country"
          value={query}
          placeholder="Start typing…"
          autoFocus
          onChange={(e) => setQuery(e.target.value)}
          className="pl-10"
        />
      </div>

      {shown.length === 0 ? (
        <p className="mt-6 text-[14px] text-mute">No country matches that.</p>
      ) : null}

      <ul className="col-scroll mt-4 grid flex-1 grid-cols-1 content-start gap-1.5 pr-1 sm:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-4">
        {shown.slice(0, 240).map((c, i) => {
          const on = country === c.code;
          return (
            <li
              key={c.code}
              className="stagger"
              style={{ animationDelay: `${Math.min(i, 24) * 18}ms` }}
            >
              <Button
                bare
                aria-pressed={on}
                onClick={() => onPick(c.code)}
                className={cn(
                  "flex min-h-12 w-full items-center gap-2.5 rounded-[var(--r-btn)] border px-3 text-left",
                  "transition-[background-color,border-color,transform] duration-150",
                  on
                    ? "border-go-fill bg-go-fill/15 text-go"
                    : "border-transparent hover:translate-x-0.5 hover:border-line-2 hover:bg-surface-3",
                )}
              >
                <Flag code={c.code} withCode />
                <span className="flex-1 truncate text-[14px] font-semibold">
                  {c.name}
                </span>
                {on ? <Check weight="bold" className="size-4" /> : null}
              </Button>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
