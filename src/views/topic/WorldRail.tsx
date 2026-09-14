import {
  ArrowLeft,
  ArrowSquareOut,
  GlobeHemisphereWest,
  ShareNetwork,
} from "@phosphor-icons/react";

import { cn } from "../../lib/cn";
import { Button } from "../../ui/Button";
import { Flag } from "../../ui/Flag";
import { Split } from "../../ui/Panel";

/**
 * The left column of a topic's own page: the world, before you have voted.
 *
 * A pasted link opens here, and the reader has not earned the aggregate yet.
 * What they *can* see is the country lean — the shareable half of the product
 * — and it is shown up front rather than after the vote, because "which
 * country hates this most" is why the link was pasted in the first place.
 * It is never split by layer; that is what stays behind the gate.
 */

type Lean = { countryCode: string; lovePct: number; sample: "few" | "some" | "many" };
type Source = { url: string; title: string };

const DOTS: Record<Lean["sample"], number> = { few: 1, some: 2, many: 3 };

export function WorldRail({
  countries,
  sources,
  onBack,
  onShare,
}: {
  countries: Lean[];
  sources: Source[];
  onBack: () => void;
  onShare: () => void;
}) {
  return (
    <aside className="rail flex h-full min-h-0 flex-col xl:border-r xl:border-line">
      <div className="flex shrink-0 items-center gap-2 border-b border-line px-3 py-2">
        <Button variant="ghost" size="sm" onClick={onBack}>
          <ArrowLeft weight="bold" className="size-3.5" /> The run
        </Button>
        <span className="flex-1" />
        <Button variant="steel" size="sm" onClick={onShare}>
          <ShareNetwork weight="fill" className="size-3.5" /> Share
        </Button>
      </div>

      <div className="col-scroll flex-1 p-4">
        <h2 className="flex items-center gap-1.5 text-[12px] font-extrabold tracking-[0.06em] text-ink-3 uppercase">
          <GlobeHemisphereWest weight="fill" className="size-4 text-hate" />
          Around the world
        </h2>
        <p className="mt-1 text-[12px] text-mute">
          Always public. Never split by layer — that stays behind the gate.
        </p>

        {countries.length === 0 ? (
          <p className="tile mt-4 text-[13px] text-mute">
            No country has voted yet. Yours would be the first flag on this board.
          </p>
        ) : (
          <ol className="mt-4 space-y-1">
            {countries.slice(0, 24).map((c, i) => (
              <li
                key={c.countryCode}
                className="stagger flex items-center gap-2.5 rounded-[8px] px-1.5 py-1.5 transition-colors hover:bg-surface-2"
                style={{ animationDelay: `${Math.min(i, 12) * 35}ms` }}
                title={`${c.sample} votes`}
              >
                <Flag code={c.countryCode} withCode />
                <span className="flex-1">
                  <Split love={c.lovePct} hate={100 - c.lovePct} height={8} />
                </span>
                <span
                  className={cn(
                    "num w-9 shrink-0 text-right text-[12px] font-extrabold",
                    c.lovePct >= 55 ? "text-love" : c.lovePct <= 45 ? "text-hate" : "text-ink-3",
                  )}
                >
                  {c.lovePct}%
                </span>
                <span className="flex w-5 shrink-0 gap-0.5" aria-label={`${c.sample} votes`}>
                  {[1, 2, 3].map((n) => (
                    <span
                      key={n}
                      className={cn("size-1.5 rounded-full", n <= DOTS[c.sample] ? "bg-ink-3" : "bg-surface-4")}
                    />
                  ))}
                </span>
              </li>
            ))}
          </ol>
        )}

        {sources.length > 0 ? (
          <div className="mt-6">
            <h3 className="text-[12px] font-extrabold tracking-[0.06em] text-ink-3 uppercase">
              Made from
            </h3>
            <ul className="mt-2 space-y-1">
              {sources.map((s) => (
                <li key={s.url}>
                  <a
                    href={s.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-start gap-1.5 rounded-[8px] px-1.5 py-1.5 text-[12.5px] leading-snug text-ink-3 transition-colors hover:bg-surface-2 hover:text-ink"
                  >
                    <ArrowSquareOut className="mt-0.5 size-3.5 shrink-0 text-mute" />
                    <span className="line-clamp-2">{s.title || s.url}</span>
                  </a>
                </li>
              ))}
            </ul>
          </div>
        ) : null}
      </div>
    </aside>
  );
}
