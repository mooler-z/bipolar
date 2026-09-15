import { useState, type ReactNode } from "react";

import worldMap from "../../data/world-map.json";
import { cn } from "../../lib/cn";
import { Button } from "../../ui/Button";

import "./map.css";

/**
 * The world, as a surface anything can be painted on.
 *
 * One map for every page that needs one. It knows nothing about votes: the
 * caller hands it a colour per country and gets back which country the pointer
 * is on. That is what lets the same map show a nation's mood on one tab and
 * its agreement with somebody else on the next without being rewritten.
 *
 * Every country answers the cursor, painted or not — a map where most of the
 * world is inert is a picture, not a map. The active one is drawn last so its
 * outline sits on top of its neighbours', and a press pins it, which is the
 * whole interface on a phone where there is no hover.
 *
 * Nothing on this map moves. A country under the pointer lights up in its own
 * colour and that is all: the pointer crosses a dozen countries on its way
 * anywhere, and anything that scales or springs turns that into the page
 * twitching. The glow lives in `map.css`.
 */

/** The land with nothing on it. Light enough to read as land, not background. */
export const BARE = "color-mix(in srgb, var(--ink) 9%, var(--surface))";

/** Love from red, hate from cyan, in proportion; faded toward the ground by
    how little is behind it. */
export function leanFill(lovePct: number, strength = 100): string {
  const mixed = `color-mix(in srgb, var(--love-fill) ${lovePct}%, var(--hate-fill))`;
  return strength >= 100
    ? mixed
    : `color-mix(in srgb, ${mixed} ${strength}%, var(--surface))`;
}

export function WorldMap({
  fill,
  active,
  onHover,
  onPick,
  className,
}: {
  /** A colour for a country, or null for bare land. */
  fill: (code: string) => string | null;
  /** The countries drawn as chosen — up to two, the second in a second colour. */
  active?: string | string[] | null;
  onHover?: (code: string | null) => void;
  onPick?: (code: string) => void;
  className?: string;
}) {
  const countries = worldMap.countries;
  const picked = (Array.isArray(active) ? active : active ? [active] : []).slice(0, 2);
  const chosen = picked
    .map((code) => countries.find((c) => c.code === code))
    .filter((c): c is NonNullable<typeof c> => !!c);
  const isPicked = new Set(picked);

  /* Held here rather than left to the caller. Every page wires `onHover` to
     something of its own — a panel, a pinned pair, nothing at all — and the
     light under the cursor is the map's own business either way. */
  const [over, setOver] = useState<string | null>(null);

  return (
    <svg
      viewBox={worldMap.viewBox}
      role="img"
      aria-label="The world"
      className={cn("h-auto w-full", className)}
      onMouseLeave={() => {
        setOver(null);
        onHover?.(null);
      }}
    >
      {countries.map((c) => {
        const colour = fill(c.code);
        return (
          <path
            key={c.code}
            d={c.d}
            fill={colour ?? BARE}
            stroke="var(--canvas)"
            strokeWidth={0.6}
            style={{ ["--map-glow" as string]: colour ?? "var(--ink-3)" }}
            className={cn(
              "map-country",
              onPick || onHover ? "cursor-pointer" : "",
              picked.length > 0 && !isPicked.has(c.code) && "opacity-80",
              (over === c.code || isPicked.has(c.code)) && "map-lit",
            )}
            onMouseEnter={() => {
              setOver(c.code);
              onHover?.(c.code);
            }}
            onClick={() => onPick?.(c.code)}
          >
            <title>{c.name}</title>
          </path>
        );
      })}

      {/* The chosen countries, once more on top, so their outlines are whole.
          The first is mint and the second violet, so a head-to-head reads as
          two things rather than one thing twice. The ring fades on — it used
          to pop, which on a board where hovering changes the choice meant the
          whole map flinching once per country crossed. */}
      {chosen.map((c, i) => {
        const ink = i === 0 ? "var(--coin-fill)" : "var(--go-fill)";
        return (
          <path
            key={c.code}
            d={c.d}
            fill="none"
            stroke={ink}
            strokeWidth={2}
            strokeLinejoin="round"
            style={{ ["--map-glow" as string]: ink }}
            className="map-ring map-lit pointer-events-none"
          />
        );
      })}
    </svg>
  );
}

/** A country's name, from the map's own list. */
export function nameOf(code: string): string {
  return worldMap.countries.find((c) => c.code === code)?.name ?? code;
}

/** The tab strip. Buttons, because they are the house's one control. */
export function Tabs<T extends string>({
  tabs,
  at,
  onTab,
}: {
  /** `icon` is optional and sits before the label — the AI tab wears the mark
      of the thing behind it, the way every other AI surface here does. */
  tabs: { id: T; label: string; hint: string; icon?: ReactNode }[];
  at: T;
  onTab: (id: T) => void;
}) {
  return (
    <nav aria-label="Boards" className="flex flex-wrap gap-1.5">
      {tabs.map((t) => (
        <Button
          key={t.id}
          size="md"
          variant={at === t.id ? "go" : "steel"}
          aria-current={at === t.id ? "page" : undefined}
          onClick={() => onTab(t.id)}
          title={t.hint}
        >
          {t.icon}
          {t.label}
        </Button>
      ))}
    </nav>
  );
}
