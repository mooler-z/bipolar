import { cn } from "../../lib/cn";
import { fmtInt } from "../../lib/format";

/**
 * The crawler's heartbeat: one bar per session, newest on the right.
 *
 * Three colours stacked, and they are the three things a session can do with a
 * story: mint it (violet), drop it because the feed already carries that
 * argument (yellow), drop it because nobody would disagree (grey). A tall
 * yellow band on a bar is the duplicate check earning its keep; a run of short
 * bars is the query list going stale. Either is visible at a glance, which is
 * the point of drawing it rather than tabling it.
 *
 * Plain divs. A chart library for eight rectangles is a dependency for its own
 * sake, and the product's own tokens do the colouring.
 */
export type SessionBar = {
  seq: number | null;
  minted: number;
  duplicate: number;
  rejected: number;
  error: string | null;
};

export function SessionChart({
  sessions,
  height = 88,
}: {
  /** Newest first, as the query returns them. */
  sessions: SessionBar[];
  height?: number;
}) {
  const shown = [...sessions].slice(0, 14).reverse();
  const tallest = Math.max(
    1,
    ...shown.map((s) => s.minted + s.duplicate + s.rejected),
  );

  if (shown.length === 0) {
    return (
      <p className="rounded-[var(--r-btn)] bg-surface-2 px-4 py-6 text-center text-[13px] text-mute">
        No sessions yet. The first bar appears when the crawler has been out.
      </p>
    );
  }

  return (
    <div>
      <div className="flex items-end gap-1.5" style={{ height }}>
        {shown.map((s, i) => {
          const total = s.minted + s.duplicate + s.rejected;
          const px = (n: number) => Math.round((n / tallest) * (height - 4));
          return (
            <div
              key={s.seq ?? `x${i}`}
              title={`Session ${s.seq ?? "?"}: ${fmtInt(s.minted)} minted, ${fmtInt(s.duplicate)} already asked, ${fmtInt(s.rejected)} too dull${s.error ? ` — ${s.error}` : ""}`}
              className="group flex flex-1 flex-col justify-end"
              style={{ animationDelay: `${i * 40}ms` }}
            >
              <div
                className={cn(
                  "rise flex flex-col-reverse overflow-hidden rounded-[5px] transition-[filter] group-hover:brightness-125",
                  s.error && "ring-2 ring-love-fill",
                )}
                style={{ height: Math.max(4, px(total)) }}
              >
                <span className="block bg-go-fill" style={{ height: px(s.minted) }} />
                <span className="block bg-coin-fill" style={{ height: px(s.duplicate) }} />
                <span className="block bg-surface-4" style={{ height: px(s.rejected) }} />
              </div>
            </div>
          );
        })}
      </div>
      <div className="mt-1.5 flex gap-1.5">
        {shown.map((s, i) => (
          <span
            key={s.seq ?? `x${i}`}
            className="num flex-1 text-center text-[10.5px] font-bold text-mute"
          >
            {s.seq ?? "·"}
          </span>
        ))}
      </div>
      <p className="mt-2.5 flex flex-wrap items-center gap-x-4 gap-y-1 text-[11.5px] text-mute">
        <Key tone="bg-go-fill" label="minted" />
        <Key tone="bg-coin-fill" label="already asked" />
        <Key tone="bg-surface-4" label="too dull" />
      </p>
    </div>
  );
}

function Key({ tone, label }: { tone: string; label: string }) {
  return (
    <span className="flex items-center gap-1.5">
      <span aria-hidden className={cn("size-2.5 rounded-[3px]", tone)} />
      {label}
    </span>
  );
}
