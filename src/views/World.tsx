import { useMemo, useState } from "react";
import { useQuery } from "convex/react";

import { api } from "../../convex/_generated/api";
import { fmtInt } from "../lib/format";
import { Button } from "../ui/Button";
import { Country, verdictWord } from "../components/world/bars";
import { NationCard, nationFill, type Nation } from "../components/world/Nations";
import { RecordCards, records } from "../components/world/Records";
import { RivalryCard, agreementWith } from "../components/world/Rivalries";
import { SubjectCard, SubjectList } from "../components/world/SubjectsTab";
import { Versus } from "../components/world/Versus";
import { BARE, Tabs, WorldMap, leanFill, nameOf } from "../components/world/WorldMap";

/**
 * The atlas.
 *
 * One map, four ways of colouring it, and a panel beside it that says what
 * the colour means for whatever the pointer is on. The map is the page — it
 * runs the width a desk gives it — and the tabs change the question it is
 * answering rather than swapping it for a list:
 *
 *   **Nations** — each country by its own temperament. Click one and it is
 *   pinned; click a second and the two go head to head.
 *   **Rivalries** — pick one; the world by how often it agrees with it.
 *   **Subjects** — pick a subject; the world by its lean on that alone.
 *   **Records** — the superlatives, and the map lights whoever holds one.
 *
 * Everything is summed across many questions, which is what keeps a page like
 * this public: a nation's lean over ninety questions gives away none of them.
 */

type Tab = "nations" | "rivalries" | "subjects" | "records";

const TABS: { id: Tab; label: string; hint: string }[] = [
  { id: "nations", label: "Nations", hint: "Each country by its own mood" },
  { id: "rivalries", label: "Rivalries", hint: "Who agrees with whom" },
  { id: "subjects", label: "Subjects", hint: "What each country makes of a subject" },
  { id: "records", label: "Records", hint: "The superlatives" },
];

export function World({ onDone }: { onDone: () => void }) {
  const board = useQuery(api.world.board);
  const [tab, setTab] = useState<Tab>("nations");
  const [hover, setHover] = useState<string | null>(null);
  /* Up to two. The second click is what makes the page fun — one nation has
     a mood, two have a relationship — and a third replaces the older. */
  const [pins, setPins] = useState<string[]>([]);
  const [subject, setSubject] = useState<string | null>(null);
  const [lit, setLit] = useState<string[] | null>(null);

  const nations: Nation[] = board?.countries ?? [];
  const byCode = useMemo(() => new Map(nations.map((n) => [n.code, n])), [nations]);
  const busiest = nations[0]?.code ?? null;
  const picked = pins.filter((c) => byCode.has(c));
  const pick = picked[0] ?? busiest;
  const second = picked[1] ?? null;
  const active = hover && byCode.has(hover) ? hover : pick;
  const versus = tab === "nations" && pick && second ? [pick, second] : null;

  const agreement = useMemo(
    () => (board && pick ? agreementWith(board.pairs, pick) : new Map()),
    [board, pick],
  );
  const chosenSubject = subject ?? board?.categories[0]?.slug ?? null;
  const subjectLean = useMemo(() => {
    const m = new Map<string, { lovePct: number; votes: number }>();
    for (const s of board?.subjects ?? []) {
      if (s.slug === chosenSubject) m.set(s.code, { lovePct: s.lovePct, votes: s.votes });
    }
    return m;
  }, [board, chosenSubject]);
  const recs = useMemo(
    () => (board ? records(nations, board.pairs, board.verdicts) : []),
    [board, nations],
  );

  if (board === undefined) {
    return (
      <div className="space-y-4 px-[clamp(1.25rem,3vw,3rem)] py-8">
        <span className="shimmer block h-12 w-96 max-w-full rounded-[var(--r-btn)]" />
        <span className="shimmer block aspect-[960/500] w-full rounded-[var(--r-card)]" />
      </div>
    );
  }

  const t = board.totals;

  /* The four questions the map can answer, as a colour per country. */
  function fill(code: string): string | null {
    const n = byCode.get(code);
    if (tab === "nations") return nationFill(n);
    if (tab === "rivalries") {
      if (code === pick) return "var(--coin-fill)";
      const p = agreement.get(code);
      return p ? leanFill(p.agreement, Math.min(100, 50 + p.shared)) : null;
    }
    if (tab === "subjects") {
      const s = subjectLean.get(code);
      return s ? leanFill(s.lovePct, Math.min(100, 40 + s.votes * 6)) : null;
    }
    if (!n) return null;
    if (lit) return lit.includes(code) ? leanFill(n.lovePct) : BARE;
    return nationFill({ ...n, votes: Math.min(n.votes, 12) });
  }

  const caption = (() => {
    if (versus && !hover) {
      return `${nameOf(versus[0])} against ${nameOf(versus[1])}.`;
    }
    if (!active) return "Point at a country.";
    const n = byCode.get(active);
    if (tab === "rivalries" && active !== pick) {
      const p = agreement.get(active);
      return p
        ? `${nameOf(pick!)} and ${nameOf(active)} agree ${p.agreement}% of the time, over ${fmtInt(p.shared)} shared questions.`
        : `${nameOf(active)} has not answered enough of the same questions as ${nameOf(pick!)} yet.`;
    }
    if (tab === "subjects") {
      const s = subjectLean.get(active);
      return s
        ? `${nameOf(active)} ${verdictWord(s.lovePct)} ${chosenSubject} — ${s.lovePct}% love over ${fmtInt(s.votes)} votes.`
        : `${nameOf(active)} has not answered enough about ${chosenSubject} yet.`;
    }
    return n
      ? `${nameOf(active)} ${verdictWord(n.lovePct)} what it is shown — ${n.lovePct}% love over ${fmtInt(n.votes)} votes.`
      : `${nameOf(active)} has not voted yet.`;
  })();

  return (
    <div className="px-[clamp(1.25rem,3vw,3rem)] py-6 sm:py-8">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="label mb-1">The world so far</p>
          <p className="flex flex-wrap items-baseline gap-x-3">
            <span
              className={`num display text-[clamp(2.4rem,5vw,4rem)] ${t.lovePct < 50 ? "text-hate" : "text-love"}`}
            >
              {t.lovePct}%
            </span>
            <span className="display text-[clamp(1.1rem,1.8vw,1.5rem)] text-ink">in love</span>
            <span className="text-[13px] text-mute">
              · {fmtInt(t.votes)} votes · {fmtInt(t.countries)} countries · {fmtInt(t.topics)}{" "}
              questions
            </span>
          </p>
        </div>
        <Tabs tabs={TABS} at={tab} onTab={setTab} />
      </header>

      <div className="mt-6 grid gap-6 xl:grid-cols-[minmax(0,1.7fr)_minmax(19rem,0.8fr)]">
        <div>
          <div className="rounded-[var(--r-card)] border border-line bg-surface p-2">
            <WorldMap
              fill={fill}
              active={tab === "records" ? null : versus ? versus : active}
              onHover={setHover}
              onPick={(code) => {
                if (tab === "records" || !byCode.has(code)) return;
                setPins((was) =>
                  was.includes(code)
                    ? was.filter((c) => c !== code)
                    : tab === "nations"
                      ? [...was, code].slice(-2)
                      : [code],
                );
              }}
            />
          </div>
          <p className="mt-3 flex min-h-6 items-center gap-2 text-[13.5px] text-ink-3">
            {active && tab !== "records" ? <Country code={active} /> : null}
            <span>{caption}</span>
          </p>
          {tab === "rivalries" ? (
            <p className="mt-1 text-[11.5px] text-mute">
              Gold is the pick. Red agrees with it, cyan does not. Click a country to compare
              against it instead.
            </p>
          ) : tab === "nations" && versus ? (
            <p className="mt-1 text-[11.5px] text-mute">
              Gold against violet. Click either to let it go.
            </p>
          ) : null}
        </div>

        <aside className="rounded-[var(--r-card)] border border-line bg-surface p-4 sm:p-5">
          {tab === "nations" && versus ? (
            <Versus
              a={byCode.get(versus[0])!}
              b={byCode.get(versus[1])!}
              pairs={board.pairs}
              verdicts={board.verdicts}
              subjects={board.subjects}
            />
          ) : tab === "nations" && active && byCode.get(active) ? (
            <NationCard
              nation={byCode.get(active)!}
              verdicts={board.verdicts.filter((v) => v.from === active)}
              pairs={board.pairs}
              subjects={board.subjects}
            />
          ) : null}
          {tab === "rivalries" && pick ? <RivalryCard pick={pick} pairs={agreement} /> : null}
          {tab === "subjects" ? (
            <div className="space-y-5">
              {chosenSubject ? (
                <SubjectCard slug={chosenSubject} rows={board.subjects} />
              ) : null}
              <SubjectList rows={board.categories} pick={chosenSubject} onPick={setSubject} />
            </div>
          ) : null}
          {tab === "records" ? (
            <p className="text-[13px] leading-relaxed text-ink-3">
              Every card is one claim about one nation or one pair. Point at a card and the map
              lights whoever holds it. A nation needs six votes to hold anything.
            </p>
          ) : null}
          {tab === "nations" && !active ? (
            <p className="text-[13px] text-mute">Nobody has voted yet.</p>
          ) : null}
        </aside>
      </div>

      {tab === "records" ? (
        <div className="mt-6">
          <RecordCards rows={recs} onHover={setLit} />
        </div>
      ) : null}

      <div className="mt-10 flex justify-center">
        <Button variant="go" size="lg" onClick={onDone}>
          Go and change one of these numbers
        </Button>
      </div>
    </div>
  );
}
