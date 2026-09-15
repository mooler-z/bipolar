import worldMap from "../../data/world-map.json";
import { cn } from "../../lib/cn";
import { Button } from "../../ui/Button";

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

  return (
    <svg
      viewBox={worldMap.viewBox}
      role="img"
      aria-label="The world"
      className={cn("h-auto w-full", className)}
      onMouseLeave={() => onHover?.(null)}
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
            className={cn(
              "transition-[fill,opacity] duration-300",
              onPick || onHover ? "cursor-pointer" : "",
              picked.length > 0 && !isPicked.has(c.code) && "opacity-80",
            )}
            onMouseEnter={() => onHover?.(c.code)}
            onClick={() => onPick?.(c.code)}
          >
            <title>{c.name}</title>
          </path>
        );
      })}

      {/* The chosen countries, once more on top, so their outlines are whole.
          The first is gold and the second violet, so a head-to-head reads as
          two things rather than one thing twice. */}
      {chosen.map((c, i) => (
        <path
          key={c.code}
          d={c.d}
          fill="none"
          stroke={i === 0 ? "var(--coin-fill)" : "var(--go-fill)"}
          strokeWidth={2}
          strokeLinejoin="round"
          className="pointer-events-none pop-in"
        />
      ))}
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
  tabs: { id: T; label: string; hint: string }[];
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
          {t.label}
        </Button>
      ))}
    </nav>
  );
}
