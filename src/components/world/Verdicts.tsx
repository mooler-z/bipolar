import { ArrowRight } from "@phosphor-icons/react";

import { cn } from "../../lib/cn";
import { fmtInt } from "../../lib/format";
import { Country, Lean, NotYet, verdictWord } from "./bars";

/**
 * What one country thinks of another.
 *
 * The board the whole page exists for, and the reason it can exist at all is
 * that a topic here knows which country it is about. So this is not inferred
 * from two countries disagreeing — it is one country's actual lean across
 * every question that was about another, which is a different and much better
 * claim.
 *
 * Summed over topics, never one of them. A row saying Ethiopia can't stand the
 * United States is fourteen questions averaged; it reveals no single answer,
 * which is what keeps this page public.
 *
 * Harshest first, because that is the row somebody came to read.
 */

export type Verdict = {
  from: string;
  about: string;
  votes: number;
  lovePct: number;
  topics: number;
};

export function Verdicts({ rows }: { rows: Verdict[] }) {
  if (rows.length === 0) {
    return (
      <NotYet
        what="Nobody has said enough about anywhere yet."
        need="A country needs three votes on questions about another before its opinion counts as one."
      />
    );
  }

  return (
    <ul className="space-y-1">
      {rows.map((r) => {
        const self = r.from === r.about;
        return (
          <li
            key={`${r.from}>${r.about}`}
            className={cn(
              "flex flex-wrap items-center gap-x-3 gap-y-2 rounded-[var(--r-btn)] px-3 py-2.5",
              "border border-line bg-surface-2/40",
            )}
          >
            <span className="flex shrink-0 items-center gap-2">
              <Country code={r.from} />
              <ArrowRight weight="bold" className="size-3 shrink-0 text-mute" />
              <Country code={r.about} />
            </span>

            <span className="min-w-0 flex-1 text-[12.5px] text-ink-3">
              {/* The sentence, so the bar is never the only thing saying it. */}
              {self ? "on itself — " : ""}
              <span className="font-bold text-ink">{verdictWord(r.lovePct)}</span>
              <span className="text-mute">
                {" "}
                · {fmtInt(r.topics)} {r.topics === 1 ? "question" : "questions"}
              </span>
            </span>

            <Lean lovePct={r.lovePct} votes={r.votes} className="w-full sm:w-[12rem]" />
          </li>
        );
      })}
    </ul>
  );
}
