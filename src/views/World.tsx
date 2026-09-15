import { useQuery } from "convex/react";
import { ArrowUpRight, Globe, Scales, Users } from "@phosphor-icons/react";

import { api } from "../../convex/_generated/api";
import { fmtInt } from "../lib/format";
import { navigate } from "../lib/nav";
import { Button } from "../ui/Button";
import { Section } from "../ui/Section";
import { Country, Lean, verdictWord } from "../components/world/bars";
import { Rivals } from "../components/world/Rivals";
import { Verdicts } from "../components/world/Verdicts";

/**
 * The world, as the room has left it.
 *
 * Everything on this page is summed across many topics, which is the whole
 * reason it can be public: a country's lean over eighty questions gives away
 * none of them, and a topic's own answer is still what a vote buys. So the
 * questions named here carry how busy they are and never how they went — the
 * page is a reason to go and vote, not a way around it.
 *
 * It is drawn to be honest at any size. With two countries on it, the boards
 * that need more say what they need rather than rendering an empty frame that
 * reads as broken. That matters more than it sounds: this page will be at its
 * thinnest on the day it matters most, which is the day somebody first opens
 * it.
 */
export function World({ onDone }: { onDone: () => void }) {
  const board = useQuery(api.world.board);

  if (board === undefined) {
    return (
      <div className="mx-auto max-w-5xl space-y-6 px-[clamp(1.25rem,4vw,3rem)] py-10">
        <span className="shimmer block h-28 rounded-[var(--r-card)]" />
        <span className="shimmer block h-64 rounded-[var(--r-card)]" />
      </div>
    );
  }

  const t = board.totals;
  const hating = t.lovePct < 50;

  return (
    <div className="mx-auto max-w-5xl px-[clamp(1.25rem,4vw,3rem)] py-8 sm:py-12">
      {/* The mood of the whole room, in one line somebody can repeat. */}
      <header>
        <p className="label mb-2">The world so far</p>
        <h1 className="display max-w-[20ch] text-[clamp(1.9rem,5.5vw,3.4rem)] text-balance">
          The room is{" "}
          <span className={hating ? "text-hate" : "text-love"}>
            {t.lovePct}% in love
          </span>{" "}
          with everything it has been asked.
        </h1>
        <p className="mt-3 max-w-[52ch] text-[14px] leading-relaxed text-ink-3">
          {fmtInt(t.votes)} votes from {fmtInt(t.countries)}{" "}
          {t.countries === 1 ? "country" : "countries"} across {fmtInt(t.topics)} questions
          {t.aboutSomewhere > 0 ? (
            <>
              {" "}— {fmtInt(t.aboutSomewhere)} of them about somewhere in particular, which
              is what makes the board below possible.
            </>
          ) : null}
        </p>

        <div className="mt-6 grid grid-cols-2 gap-2.5 sm:grid-cols-4">
          <Figure icon={<Globe weight="fill" />} value={fmtInt(t.countries)} label="countries" />
          <Figure icon={<Users weight="fill" />} value={fmtInt(t.votes)} label="votes cast" />
          <Figure
            icon={<Scales weight="fill" />}
            value={`${t.lovePct}%`}
            label="love, worldwide"
            tone={hating ? "text-hate" : "text-love"}
          />
          <Figure icon={<Globe weight="fill" />} value={fmtInt(t.topics)} label="questions answered" />
        </div>
      </header>

      <div className="mt-12 space-y-12">
        <Section label="What each country thinks of another" tone="text-hate">
          <Verdicts rows={board.verdicts} />
        </Section>

        <Section label="Who agrees with whom" tone="text-go">
          <Rivals rows={board.pairs} />
        </Section>

        <Section label="Every country that has voted" tone="text-ink-3">
          <ul className="space-y-1">
            {board.countries.map((c) => (
              <li
                key={c.code}
                className="flex flex-wrap items-center gap-x-3 gap-y-2 rounded-[var(--r-btn)] border border-line bg-surface-2/40 px-3 py-2.5"
              >
                <Country code={c.code} />
                <span className="min-w-0 flex-1 text-[12.5px] text-ink-3">
                  <span className="font-bold text-ink">{verdictWord(c.lovePct)}</span> what it
                  has been shown
                  <span className="text-mute"> · {fmtInt(c.topics)} questions</span>
                </span>
                <Lean lovePct={c.lovePct} votes={c.votes} className="w-full sm:w-[12rem]" />
              </li>
            ))}
          </ul>
        </Section>

        <Section label="What the world came here to argue about" tone="text-coin">
          <ul className="space-y-1">
            {board.categories.map((c) => (
              <li
                key={c.slug}
                className="flex flex-wrap items-center gap-x-3 gap-y-2 px-1 py-1.5"
              >
                <span className="w-28 shrink-0 text-[13px] font-bold text-ink capitalize">
                  {c.slug}
                </span>
                <span className="min-w-0 flex-1 text-[12px] text-mute">
                  {fmtInt(c.topics)} {c.topics === 1 ? "question" : "questions"}
                </span>
                <Lean lovePct={c.lovePct} votes={c.votes} className="w-full sm:w-[14rem]" />
              </li>
            ))}
          </ul>
        </Section>

        <Section
          label="The busiest questions"
          tone="text-streak"
          action={
            <span className="text-[11px] text-mute">how they went is what a vote buys</span>
          }
        >
          <ul className="space-y-1">
            {board.loudest.map((q) => (
              <li key={q.slug}>
                <Button
                  bare
                  onClick={() => navigate(`/t/${q.slug}`)}
                  className="lift flex w-full items-center gap-3 rounded-[var(--r-btn)] border border-line bg-surface-2/40 px-3 py-2.5 text-left hover:border-line-2 hover:bg-surface-2"
                >
                  {q.about ? <Country code={q.about} /> : null}
                  <span className="min-w-0 flex-1 truncate text-[13px] font-bold text-ink">
                    {q.question}
                  </span>
                  <span className="num shrink-0 text-[11.5px] text-mute">
                    {fmtInt(q.votes)} {q.votes === 1 ? "vote" : "votes"}
                  </span>
                  <ArrowUpRight weight="bold" className="size-3.5 shrink-0 text-mute" />
                </Button>
              </li>
            ))}
          </ul>
        </Section>
      </div>

      {board.capped ? (
        <p className="mt-10 text-center text-[11px] text-mute">
          Counted over the most recent slice of the record, not all of it.
        </p>
      ) : null}

      <div className="mt-12 flex justify-center">
        <Button variant="go" size="lg" onClick={onDone}>
          Go and change one of these numbers
        </Button>
      </div>
    </div>
  );
}

function Figure({
  icon,
  value,
  label,
  tone,
}: {
  icon: React.ReactNode;
  value: string;
  label: string;
  tone?: string;
}) {
  return (
    <span className="rounded-[var(--r-btn)] border border-line bg-surface-2 px-3.5 py-3">
      <span className="mb-1 flex items-center gap-1.5 text-mute">
        <span className="grid size-3.5 place-items-center [&>svg]:size-3.5">{icon}</span>
        <span className="label">{label}</span>
      </span>
      <span className={`num block text-[clamp(1.2rem,2.4vw,1.7rem)] font-extrabold ${tone ?? "text-ink"}`}>
        {value}
      </span>
    </span>
  );
}
