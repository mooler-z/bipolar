import { useState } from "react";
import { Heart, ThumbsDown } from "@phosphor-icons/react";

import { cn } from "../lib/cn";
import { fmtInt } from "../lib/format";
import {
  buildBoard,
  headline,
  phraseSparkGap,
  type CountryInsight,
  type CountryRow,
} from "../lib/insights";
import { Button } from "../ui/Button";
import { Flag } from "../ui/Flag";
import { Label } from "../ui/Label";
import { Split } from "../ui/Panel";
import { HeatMap } from "./HeatMap";

/**
 * Where the world stands, said out loud.
 *
 * The board leads with a sentence rather than a table, because the sentence is
 * the thing that travels: *"The world says love. Japan says hate — 71%."* The
 * numbers underneath are the evidence for it, and the map is the same evidence
 * arranged so a reader can find the outlier without reading a single row.
 */
export function CountryBoard({
  rows,
  globalLovePct,
}: {
  rows: CountryRow[];
  globalLovePct: number;
}) {
  const board = buildBoard(rows);
  const [sortBy, setSortBy] = useState<"love" | "hate">(
    globalLovePct >= 50 ? "love" : "hate",
  );

  if (board.countries.length === 0) {
    return (
      <p className="mt-6">
        <Label>No country has enough votes yet.</Label>
      </p>
    );
  }

  const line = headline(board, globalLovePct);
  const gap =
    (board.mostActive && phraseSparkGap(board.mostActive)) ??
    (board.mostPolarized && phraseSparkGap(board.mostPolarized)) ??
    null;

  const sorted = [...board.countries].sort((a, b) =>
    sortBy === "love" ? b.lovePct - a.lovePct : b.hatePct - a.hatePct,
  );

  return (
    <div className="mt-8">
      {line ? (
        <p className="rise mb-5 text-[19px] leading-snug font-bold text-balance">
          {line}
        </p>
      ) : null}

      {gap ? (
        <p className="mb-5 rounded-[var(--r-card)] border border-coin/30 bg-coin/8 px-4 py-3 text-[14px] leading-snug text-coin">
          {gap}
        </p>
      ) : null}

      <HeatMap countries={board.countries} />

      <div className="mt-7 grid grid-cols-1 gap-3 sm:grid-cols-2">
        <Extreme label="Loved it most" c={board.mostLoved} side="love" />
        <Extreme label="Hated it most" c={board.mostHated} side="hate" />
      </div>

      <div className="mt-6 mb-3 flex items-center justify-between gap-3">
        <h3 className="text-[15px] font-bold">Every country</h3>
        <div className="flex gap-1.5">
          <Button
            size="sm"
            variant={sortBy === "love" ? "love" : "steel"}
            onClick={() => setSortBy("love")}
          >
            <Heart weight={sortBy === "love" ? "fill" : "regular"} className="size-3.5" />
            Loving
          </Button>
          <Button
            size="sm"
            variant={sortBy === "hate" ? "hate" : "steel"}
            onClick={() => setSortBy("hate")}
          >
            <ThumbsDown weight={sortBy === "hate" ? "fill" : "regular"} className="size-3.5" />
            Hating
          </Button>
        </div>
      </div>

      <ol className="space-y-2.5">
        {sorted.map((c, i) => (
          <li
            key={c.code}
            className="stagger flex items-center gap-3 rounded-[var(--r-btn)] px-1.5 py-1 transition-colors hover:bg-surface-2"
            style={{ animationDelay: `${Math.min(i, 12) * 40}ms` }}
          >
            <Flag code={c.code} withCode />
            <span className="hidden w-28 shrink-0 truncate text-[13px] font-semibold sm:block">
              {c.name}
            </span>
            <span className="num w-8 shrink-0 text-right text-[12px] font-bold text-love">
              {c.lovePct}
            </span>
            <span className="flex-1">
              <Split love={c.love} hate={c.hate} height={8} />
            </span>
            <span className="num w-8 shrink-0 text-[12px] font-bold text-hate">
              {c.hatePct}
            </span>
            <span className="num hidden w-10 shrink-0 text-right text-[12px] text-mute sm:block">
              {fmtInt(c.total)}
            </span>
          </li>
        ))}
      </ol>

      <p className="mt-4 text-[12px] text-mute">
        A country colours on its first vote and is shown here from the first
        vote, but it is never <em>called</em> under three — one person is not a
        country&rsquo;s opinion.
      </p>
    </div>
  );
}

function Extreme({
  label,
  c,
  side,
}: {
  label: string;
  c: CountryInsight | null;
  side: "love" | "hate";
}) {
  if (!c) {
    return (
      <div className="rounded-[var(--r-card)] border border-line bg-surface-2 p-4">
        <Label>{label}</Label>
        <p className="mt-1 text-[14px] text-mute">
          No country has three votes yet.
        </p>
      </div>
    );
  }
  const pct = side === "love" ? c.lovePct : c.hatePct;
  return (
    <div
      className={cn(
        "rounded-[var(--r-card)] border p-4 transition-transform hover:-translate-y-0.5",
        side === "love"
          ? "border-love/35 bg-love/10"
          : "border-hate/35 bg-hate/10",
      )}
    >
      <Label tone={side}>{label}</Label>
      <p className="mt-2 flex items-center gap-2.5">
        <Flag code={c.code} withCode />
        <span className="truncate text-[15px] font-bold">{c.name}</span>
        <span className="flex-1" />
        <span
          className={cn(
            "num text-2xl font-extrabold",
            side === "love" ? "text-love" : "text-hate",
          )}
        >
          {pct}%
        </span>
      </p>
    </div>
  );
}
