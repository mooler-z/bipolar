import { useMemo, useState } from "react";
import { Lightning, Users } from "@phosphor-icons/react";

import worldMap from "../data/world-map.json";
import { cn } from "../lib/cn";
import { flagEmoji, fmtInt } from "../lib/format";
import type { CountryInsight } from "../lib/insights";
import { Button } from "../ui/Button";
import { Label } from "../ui/Label";

/**
 * The world, coloured by verdict.
 *
 * A diverging choropleth — love at one end, hate at the other, a dead-grey
 * middle — because the interesting fact about a topic is almost never the
 * global number, it is which country went the other way. A table of forty rows
 * hides that; a map hands it over in a glance.
 *
 * Two floors, deliberately different:
 *
 * **One vote colours a country.** An earlier build required three, which meant
 * a young topic rendered an entirely grey map that looked broken — and worse,
 * a map showing nothing while the table underneath showed a country at 100%.
 * Data that exists should be visible.
 *
 * **Three votes let a country be *called*.** Below that the hover says so in
 * as many words, the fill is muted, and the headline cards refuse to name it.
 * Showing a number is not the same as making a claim about a nation.
 *
 * Every country responds to a cursor, coloured or not — a map where most of
 * the world is inert is not a map, it is a picture. Tapping pins a country, so
 * this works on a phone where there is no hover at all.
 */

type Lens = "all" | "spark";
type Bucket =
  | "hate3" | "hate2" | "hate1" | "split" | "love1" | "love2" | "love3" | "none";

const FILL: Record<Bucket, string> = {
  love3: "var(--love-fill)",
  love2: "color-mix(in srgb, var(--love-fill) 66%, var(--surface))",
  love1: "color-mix(in srgb, var(--love-fill) 36%, var(--surface))",
  split: "color-mix(in srgb, var(--ink) 24%, var(--surface))",
  hate1: "color-mix(in srgb, var(--hate-fill) 36%, var(--surface))",
  hate2: "color-mix(in srgb, var(--hate-fill) 66%, var(--surface))",
  hate3: "var(--hate-fill)",
  // Light enough to read as land rather than as background.
  none: "color-mix(in srgb, var(--ink) 9%, var(--surface))",
};

const SCALE: Bucket[] = [
  "hate3", "hate2", "hate1", "split", "love1", "love2", "love3",
];

/** Votes before a country's fill is shown at full strength. */
const CALL_FLOOR = 3;

function bucketOf(lovePct: number, total: number): Bucket {
  if (total < 1) return "none";
  if (lovePct >= 80) return "love3";
  if (lovePct >= 65) return "love2";
  if (lovePct >= 55) return "love1";
  if (lovePct > 45) return "split";
  if (lovePct > 35) return "hate1";
  if (lovePct > 20) return "hate2";
  return "hate3";
}

export function HeatMap({ countries }: { countries: CountryInsight[] }) {
  const [lens, setLens] = useState<Lens>("all");
  const [hover, setHover] = useState<string | null>(null);
  const [pinned, setPinned] = useState<string | null>(null);

  const byCode = useMemo(() => {
    const map = new Map<string, { lovePct: number; total: number }>();
    for (const c of countries) {
      map.set(
        c.code,
        lens === "all"
          ? { lovePct: c.lovePct, total: c.total }
          : { lovePct: c.sparkLovePct, total: c.sparkTotal },
      );
    }
    return map;
  }, [countries, lens]);

  const active = pinned ?? hover;
  const stat = active ? byCode.get(active) : undefined;
  const insight = countries.find((c) => c.code === active) ?? null;
  const name =
    worldMap.countries.find((c) => c.code === active)?.name ?? active ?? "";

  const withVotes = [...byCode.values()].filter((s) => s.total > 0).length;
  const callable = [...byCode.values()].filter((s) => s.total >= CALL_FLOOR).length;

  return (
    <section>
      <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
        <h3 className="text-[12px] font-extrabold tracking-[0.06em] text-ink-3 uppercase">The world</h3>
        <div className="flex gap-1.5">
          <Button
            size="sm"
            variant={lens === "all" ? "go" : "steel"}
            onClick={() => setLens("all")}
          >
            <Users className="size-4" /> All votes
          </Button>
          <Button
            size="sm"
            variant={lens === "spark" ? "coin" : "steel"}
            onClick={() => setLens("spark")}
          >
            <Lightning weight="fill" className="size-4" /> Sparks only
          </Button>
        </div>
      </div>

      <div className="card overflow-hidden p-2">
        <svg
          viewBox={worldMap.viewBox}
          role="img"
          aria-label="World map coloured by each country's love or hate share"
          className="block w-full"
          onMouseLeave={() => setHover(null)}
        >
          {worldMap.countries.map((country) => {
            const s = byCode.get(country.code);
            const total = s?.total ?? 0;
            const bucket = bucketOf(s?.lovePct ?? 50, total);
            const focused = active === country.code;
            const thin = total > 0 && total < CALL_FLOOR;
            return (
              <path
                key={country.code}
                d={country.d}
                fill={FILL[bucket]}
                // A country with data but not enough to call is drawn at
                // reduced strength: present, visibly provisional.
                fillOpacity={thin ? 0.55 : 1}
                stroke={focused ? "var(--ink)" : "var(--canvas)"}
                strokeWidth={focused ? 1.8 : 0.4}
                className={cn(
                  "cursor-pointer transition-[fill,stroke,stroke-width,opacity] duration-150",
                  active && !focused && "opacity-60",
                )}
                onMouseEnter={() => setHover(country.code)}
                onClick={() =>
                  setPinned((p) => (p === country.code ? null : country.code))
                }
              >
                <title>
                  {flagEmoji(country.code)} {country.name}
                </title>
              </path>
            );
          })}
        </svg>
      </div>

      {/* The strip: whatever is under the cursor or pinned, else the scale. */}
      <div className="mt-3 min-h-[3.5rem]">
        {active ? (
          <p className="roll text-[15px] leading-snug">
            <span className="font-bold">
              {flagEmoji(active)} {name}
            </span>{" "}
            {total(stat) === 0 ? (
              <span className="text-mute">
                has not {lens === "spark" ? "backed this with money" : "voted"}{" "}
                yet.
              </span>
            ) : insight && total(stat) >= CALL_FLOOR ? (
              <span>
                {describe(insight, lens)} — {fmtInt(total(stat))}{" "}
                {total(stat) === 1 ? "vote" : "votes"}.
              </span>
            ) : (
              <span className="text-mute">
                {stat?.lovePct}% love, but only {fmtInt(total(stat))}{" "}
                {total(stat) === 1 ? "vote" : "votes"} — too few to call.
              </span>
            )}
            {pinned ? (
              <Button
                variant="link"
                size="sm"
                className="ml-2 !min-h-0 !px-0 align-baseline text-[13px]"
                onClick={() => setPinned(null)}
              >
                clear
              </Button>
            ) : null}
          </p>
        ) : (
          <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
            <span className="flex items-center gap-1.5">
              <Label tone="hate">Hate</Label>
              <span className="flex">
                {SCALE.map((b) => (
                  <span
                    key={b}
                    className="h-3 w-5 first:rounded-l-[3px] last:rounded-r-[3px]"
                    style={{ background: FILL[b] }}
                  />
                ))}
              </span>
              <Label tone="love">Love</Label>
            </span>
            <span className="flex items-center gap-1.5">
              <span
                className="h-3 w-5 rounded-[3px]"
                style={{ background: FILL.none }}
              />
              <Label>No votes</Label>
            </span>
            <Label>
              {fmtInt(withVotes)} voting · {fmtInt(callable)} with enough to call
            </Label>
          </div>
        )}
      </div>
    </section>
  );
}

function total(s: { total: number } | undefined): number {
  return s?.total ?? 0;
}

function describe(c: CountryInsight, lens: Lens): string {
  const pct = lens === "spark" ? c.sparkLovePct : c.lovePct;
  if (pct >= 55) return `loves it, ${pct}%`;
  if (pct <= 45) return `hates it, ${100 - pct}%`;
  return `is split, ${pct}/${100 - pct}`;
}
