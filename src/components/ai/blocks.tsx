import { ArrowsLeftRight } from "@phosphor-icons/react";

import { cn } from "../../lib/cn";
import { fmtInt } from "../../lib/format";
import { sideOf, strengthOf } from "../../lib/words";
import { Flag } from "../../ui/Flag";
import { WorldMap, leanFill, nameOf } from "../world/WorldMap";

/**
 * The seven shapes an answer can take.
 *
 * One answer is rarely one shape — "who hates China" wants a ranking *and* a
 * map, and a country's profile wants a dial, a ranking and a head-to-head —
 * so the server hands back a list of these and the panel draws them in order.
 *
 * None of them can be wrong about a number. Every figure here was read out of
 * the database by `insightViews.ts`; the model only chose which of these to
 * draw. That is the whole reason the charts can be trusted.
 */

export type Block =
  | { kind: "headline"; label: string; value: string; word: string; tone: string; flag: string | null }
  | {
      kind: "ranking";
      title: string;
      rows: { code: string; pct: number; votes?: number; sample?: string }[];
    }
  | { kind: "map"; title: string; focus: string | null; cells: { code: string; pct: number }[] }
  | {
      kind: "versus";
      a: { code: string; pct: number };
      b: { code: string; pct: number };
      agreement: number | null;
      shared: number;
    }
  | { kind: "bars"; title: string; rows: { label: string; pct: number; votes?: number }[] }
  | { kind: "donut"; title: string; lovePct: number; votes: number; flag: string | null }
  | {
      kind: "portrait";
      title: string;
      imageUrl: string | null;
      flag: string | null;
      marks?: string[];
      note: string;
    }
  | { kind: "note"; text: string };

const toneClass = (tone: string) =>
  tone === "love" ? "text-love" : tone === "hate" ? "text-hate" : "text-ink";

export function Blocks({ blocks }: { blocks: Block[] }) {
  return (
    <div className="space-y-3">
      {blocks.map((b, i) => (
        <div key={i} style={{ animationDelay: `${i * 60}ms` }} className="stagger">
          <One block={b} />
        </div>
      ))}
    </div>
  );
}

function One({ block }: { block: Block }) {
  switch (block.kind) {
    case "note":
      return <p className="text-[13px] leading-snug text-ink-3">{block.text}</p>;

    case "headline":
      return (
        <div className="flex items-center gap-3 rounded-[var(--r-btn)] border border-line bg-surface-2 px-3 py-2.5">
          {block.flag ? <Flag code={block.flag} size="h-8 w-11" /> : null}
          <div className="min-w-0 flex-1">
            <p className="label truncate">{block.label}</p>
            <p className="truncate text-[12.5px] font-bold text-ink-2">{block.word}</p>
          </div>
          <span className={cn("num display text-[clamp(1.4rem,4vw,1.9rem)]", toneClass(block.tone))}>
            {block.value}
          </span>
        </div>
      );

    /* A ranking: flags down the side, bars across. The thing somebody asked
       for when they typed "who hates China" — an order, not a paragraph. */
    case "portrait":
      return (
        <section className="overflow-hidden rounded-[var(--r-card)] border border-line bg-surface-2">
          {/* The picture is the answer's subject, not its decoration, so it
              takes the full width and the question sits on it. `cover` at a
              fixed ratio: these come from a dozen sources at a dozen shapes,
              and a row of charts under a ragged edge reads as broken. */}
          {block.imageUrl ? (
            <span className="relative block aspect-[16/7] w-full border-b border-line">
              <img
                src={block.imageUrl}
                alt=""
                loading="lazy"
                className="absolute inset-0 size-full object-cover object-[50%_30%]"
              />
            </span>
          ) : null}
          {/* The question under the picture rather than over it. A scrim to
              keep type legible on a photograph is a gradient on a surface, and
              the house has exactly one of those — the ground behind the
              question — which this is not. */}
          <div className="px-3 py-3">
            <p className="flex items-center gap-2">
              {block.flag ? <Flag code={block.flag} /> : null}
              <span className="text-[14px] leading-snug font-extrabold text-ink">
                {block.title}
              </span>
            </p>
            {/* What it is, before what the world made of it. */}
            {block.marks && block.marks.length > 0 ? (
              <p className="mt-1.5 flex flex-wrap gap-1">
                {block.marks.map((m) => (
                  <span
                    key={m}
                    className="rounded-[var(--r-pill)] border border-line-2 bg-surface-3 px-2 py-0.5 text-[10.5px] font-bold text-ink-3 capitalize"
                  >
                    {m}
                  </span>
                ))}
              </p>
            ) : null}
            {block.note ? (
              <p className="mt-1.5 text-[12.5px] leading-snug text-ink-3">{block.note}</p>
            ) : null}
          </div>
        </section>
      );

    case "ranking":
      return (
        <section>
          <p className="label mb-1.5">{block.title}</p>
          <ul className="space-y-1">
            {block.rows.map((r) => {
              const loves = sideOf(r.pct) === "love";
              return (
                <li key={r.code} className="flex items-center gap-2">
                  <Flag code={r.code} />
                  <span className="num w-6 shrink-0 text-[11px] font-bold text-mute">{r.code}</span>
                  <span className="relative h-3 min-w-0 flex-1 overflow-hidden rounded-full bg-hate-fill">
                    <span
                      className="absolute inset-y-0 left-0 bg-love-fill transition-[width] duration-700"
                      style={{ width: `${r.pct}%` }}
                    />
                  </span>
                  <span
                    className={cn(
                      "num w-8 shrink-0 text-right text-[11px] font-extrabold",
                      loves ? "text-love" : "text-hate",
                    )}
                  >
                    {strengthOf(r.pct)}%
                  </span>
                  {/* A count where there is one, and how much there is to
                      trust where a single question's counts are not ours to
                      publish. */}
                  <span className="num w-9 shrink-0 text-right text-[10px] text-mute">
                    {r.votes !== undefined ? fmtInt(r.votes) : (r.sample ?? "")}
                  </span>
                </li>
              );
            })}
          </ul>
        </section>
      );

    case "map":
      return (
        <section>
          <p className="label mb-1.5">{block.title}</p>
          <div className="overflow-hidden rounded-[var(--r-btn)] border border-line bg-surface-2 p-1.5">
            <WorldMap
              fill={(code) => {
                const cell = block.cells.find((c) => c.code === code);
                return cell ? leanFill(cell.pct) : null;
              }}
              active={block.focus}
            />
          </div>
        </section>
      );

    /* Two flags and the number between them. The shape of an argument. */
    case "versus":
      return (
        <section className="rounded-[var(--r-btn)] border border-line bg-surface-2 p-3">
          <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-2">
            <Side code={block.a.code} pct={block.a.pct} />
            <div className="text-center">
              {block.agreement === null ? (
                <ArrowsLeftRight weight="bold" className="mx-auto size-5 text-mute" />
              ) : (
                <>
                  <span className="num display block text-[clamp(1.2rem,3.5vw,1.7rem)] text-ink">
                    {block.agreement}%
                  </span>
                  <span className="label block">agree</span>
                </>
              )}
              {block.shared > 0 ? (
                <span className="num block text-[10px] text-mute">
                  {fmtInt(block.shared)} shared
                </span>
              ) : null}
            </div>
            <Side code={block.b.code} pct={block.b.pct} right />
          </div>
        </section>
      );

    /* Subjects, as a plain bar chart. The one block that is not about a
       country, so it carries words rather than flags. */
    case "bars":
      return (
        <section>
          <p className="label mb-1.5">{block.title}</p>
          <ul className="space-y-1">
            {block.rows.map((r) => (
              <li key={r.label} className="flex items-center gap-2">
                {/* A category slug is one lowercase word and wants a capital;
                    a question is already written and does not. */}
                <span
                  className={cn(
                    "w-28 shrink-0 truncate text-[11.5px] font-bold text-ink",
                    r.label.includes(" ") ? "" : "capitalize",
                  )}
                  title={r.label}
                >
                  {r.label}
                </span>
                <span className="relative h-3 min-w-0 flex-1 overflow-hidden rounded-full bg-hate-fill">
                  <span
                    className="absolute inset-y-0 left-0 bg-love-fill transition-[width] duration-700"
                    style={{ width: `${r.pct}%` }}
                  />
                </span>
                <span
                  className={cn(
                    "num w-8 shrink-0 text-right text-[11px] font-extrabold",
                    sideOf(r.pct) === "love" ? "text-love" : "text-hate",
                  )}
                >
                  {strengthOf(r.pct)}%
                </span>
              </li>
            ))}
          </ul>
        </section>
      );

    /* A dial. Drawn with a conic gradient rather than an SVG arc, because the
       only thing it has to do is show one proportion at a glance. */
    case "donut":
      return (
        <section className="flex items-center gap-4 rounded-[var(--r-btn)] border border-line bg-surface-2 p-3">
          <span
            className="relative grid size-20 shrink-0 place-items-center rounded-full"
            style={{
              background: `conic-gradient(var(--love-fill) 0 ${block.lovePct}%, var(--hate-fill) ${block.lovePct}% 100%)`,
            }}
          >
            <span className="grid size-[3.1rem] place-items-center rounded-full bg-surface-2">
              <span
                className={cn(
                  "num text-[15px] font-extrabold",
                  sideOf(block.lovePct) === "love" ? "text-love" : "text-hate",
                )}
              >
                {strengthOf(block.lovePct)}%
              </span>
            </span>
          </span>
          <div className="min-w-0 flex-1">
            <p className="flex items-center gap-1.5">
              {block.flag ? <Flag code={block.flag} /> : null}
              <span className="truncate text-[13px] font-bold text-ink">
                {block.flag ? nameOf(block.flag) : block.title}
              </span>
            </p>
            <p className="mt-0.5 text-[11.5px] text-mute">{block.title}</p>
            <p className="num mt-1 text-[11px] text-mute">{fmtInt(block.votes)} votes</p>
          </div>
        </section>
      );
  }
}

function Side({ code, pct, right = false }: { code: string; pct: number; right?: boolean }) {
  return (
    <div className={cn("min-w-0", right && "text-right")}>
      <Flag code={code} size="h-7 w-10" className={cn(right && "flex-row-reverse")} />
      <p className="num mt-1 truncate text-[12px] font-extrabold text-ink">{code}</p>
      <p
        className={cn(
          "num text-[11px] font-bold",
          sideOf(pct) === "love" ? "text-love" : "text-hate",
        )}
      >
        {strengthOf(pct)}%
      </p>
    </div>
  );
}
