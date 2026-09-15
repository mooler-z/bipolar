import { useState } from "react";

import { cn } from "../../lib/cn";
import { buildBoard, headline, phraseCountry, type CountryRow } from "../../lib/insights";
import { Button } from "../../ui/Button";
import { Flag } from "../../ui/Flag";
import { WorldMap, leanFill } from "../world/WorldMap";

/**
 * Where the world stands on this one question.
 *
 * The map leads and the sentence sits on it: *"The world says love. Japan
 * says hate — 71%."* Under the map, every country that voted as a row of
 * flags ordered by how far it sits from the world — the outliers first,
 * because the interesting fact about a result is never the global number,
 * it is who went the other way. Pointing at a flag lights its country; the
 * caption says the sentence for it.
 *
 * Three votes before a country can be called. Under that the colour is
 * faint and the words say so — a number is not a claim about a nation.
 */
export function Atlas({ rows, globalLovePct }: { rows: CountryRow[]; globalLovePct: number }) {
  const board = buildBoard(rows);
  const [hover, setHover] = useState<string | null>(null);
  const line = headline(board, globalLovePct);

  if (board.countries.length === 0) return null;

  const byCode = new Map(board.countries.map((c) => [c.code, c]));
  const ranked = [...board.countries].sort(
    (a, b) => Math.abs(b.lovePct - globalLovePct) - Math.abs(a.lovePct - globalLovePct),
  );
  const on = hover ? byCode.get(hover) : undefined;

  return (
    <section className="tile-in" style={{ animationDelay: "160ms" }}>
      {line ? (
        <p className="display mb-3 text-[clamp(1.1rem,1.8vw,1.5rem)] text-ink text-balance">
          {line}
        </p>
      ) : null}

      <div className="rounded-[var(--r-card)] border border-line bg-surface p-2">
        <WorldMap
          fill={(code) => {
            const c = byCode.get(code);
            return c ? leanFill(c.lovePct, c.total >= 3 ? 100 : 45) : null;
          }}
          active={hover}
          onHover={setHover}
        />
      </div>

      <p className="mt-2 min-h-5 text-[12.5px] text-ink-3">
        {on
          ? `${phraseCountry(on)}${on.total < 3 ? " Too few to call." : ""}`
          : "The furthest from the world, first."}
      </p>

      <ul className="mt-2 flex flex-wrap gap-1.5">
        {ranked.map((c) => {
          const loves = c.lovePct >= 50;
          return (
            <li key={c.code}>
              <Button
                bare
                onMouseEnter={() => setHover(c.code)}
                onMouseLeave={() => setHover(null)}
                onFocus={() => setHover(c.code)}
                onClick={() => setHover((was) => (was === c.code ? null : c.code))}
                aria-label={phraseCountry(c)}
                className={cn(
                  "lift flex items-center gap-1.5 rounded-[var(--r-pill)] border px-2 py-1",
                  hover === c.code
                    ? "border-coin-fill bg-surface-2"
                    : "border-line bg-surface-2/40 hover:border-line-2",
                  c.total < 3 && "opacity-60",
                )}
              >
                <Flag code={c.code} />
                <span className={cn("num text-[11.5px] font-extrabold", loves ? "text-love" : "text-hate")}>
                  {loves ? c.lovePct : c.hatePct}%
                </span>
              </Button>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
