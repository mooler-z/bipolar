import { useState } from "react";
import { useQuery } from "convex/react";
import { ArrowLeft, Lock } from "@phosphor-icons/react";

import { api } from "../../convex/_generated/api";
import { cn } from "../lib/cn";
import { fmtInt } from "../lib/format";
import { navigate } from "../lib/nav";
import { leanWord, moodWord, sideOf, strengthOf } from "../lib/words";
import { Button } from "../ui/Button";
import { Flag } from "../ui/Flag";
import { WorldMap, leanFill, nameOf } from "../components/world/WorldMap";

/**
 * How the world feels about one question.
 *
 * The page a search result opens. Somebody who typed a name wants to know
 * where that name is loved and where it is not — so the map leads, the two
 * boards under it name the ends, and the question's own picture sits beside
 * the title because a face is what makes a name a person.
 *
 * **The country lean is public; the answer is not.** Every board here is the
 * per-country split that `seo.ts` already publishes for a pasted link — it is
 * the shareable half, and hiding it would break the mechanic the product
 * spreads by. What stays behind a vote is the thing a vote buys: the topic's
 * own two-layer aggregate, which is shown only once this reader has earned it
 * and is a button to go and earn it otherwise.
 */
export function TopicWorld({ slug }: { slug: string }) {
  const page = useQuery(api.topics.bySlug, { slug });
  const [hover, setHover] = useState<string | null>(null);

  if (page === undefined) {
    return (
      <div className="space-y-4 px-[clamp(1.25rem,3vw,3rem)] py-8">
        <span className="shimmer block h-24 w-full max-w-2xl rounded-[var(--r-card)]" />
        <span className="shimmer block aspect-[960/500] w-full rounded-[var(--r-card)]" />
      </div>
    );
  }

  if (page === null) {
    return (
      <div className="grid min-h-[60vh] place-items-center px-6 text-center">
        <div>
          <p className="display text-[clamp(1.4rem,3vw,2rem)]">No such question.</p>
          <Button variant="go" className="mt-5" onClick={() => navigate("/")}>
            Back to the run
          </Button>
        </div>
      </div>
    );
  }

  const { topic, countries } = page;
  const ranked = [...countries].sort((a, b) => b.lovePct - a.lovePct);
  const loves = ranked.slice(0, 6);
  const hates = [...ranked].reverse().slice(0, 6);
  const byCode = new Map(countries.map((c) => [c.countryCode, c]));
  const on = hover ? byCode.get(hover) : undefined;

  /* Earned, or not. `stats` is null in the payload until this reader has
     voted or paid — the gate is the server's, and this only draws it. */
  const stats = topic.stats;
  const worldPct = stats
    ? Math.round(
        ((stats.freeLove + stats.paidLove) /
          Math.max(1, stats.freeLove + stats.freeHate + stats.paidLove + stats.paidHate)) *
          100,
      )
    : null;

  return (
    <div className="px-[clamp(1.25rem,3vw,3rem)] py-6 sm:py-8">
      <Button
        bare
        onClick={() => navigate("/")}
        className="lift mb-5 flex items-center gap-1.5 text-[12.5px] font-bold text-mute hover:text-ink"
      >
        <ArrowLeft weight="bold" className="size-3.5" /> the run
      </Button>

      <header className="flex flex-wrap items-start gap-5">
        {topic.imageUrl ? (
          <img
            src={topic.imageUrl}
            alt=""
            aria-hidden
            className="size-24 shrink-0 rounded-[var(--r-card)] object-cover sm:size-32"
          />
        ) : null}
        <div className="min-w-0 flex-1">
          <p className="label mb-1.5">
            {topic.scopeCountry ? `${nameOf(topic.scopeCountry)} · ` : ""}
            {topic.categorySlug}
          </p>
          <h1 className="display text-[clamp(1.7rem,4.5vw,3.2rem)] text-balance">
            {topic.question}
          </h1>
          {topic.description ? (
            <p className="mt-2 max-w-[62ch] text-[14px] leading-relaxed text-ink-3">
              {topic.description}
            </p>
          ) : null}
          <p className="mt-3 flex flex-wrap items-center gap-3 text-[12.5px] text-mute">
            <span className="num font-bold text-ink-3">{fmtInt(topic.voteCount)} votes</span>
            <span>·</span>
            <span className="num font-bold text-ink-3">{countries.length} countries</span>
            {worldPct !== null ? (
              <>
                <span>·</span>
                <span
                  className={cn(
                    "font-extrabold",
                    sideOf(worldPct) === "love" ? "text-love" : "text-hate",
                  )}
                >
                  the world {leanWord(worldPct)} this
                </span>
                <span className="num font-bold text-mute">{strengthOf(worldPct)}%</span>
              </>
            ) : null}
          </p>
        </div>
      </header>

      <div className="mt-8 grid gap-6 xl:grid-cols-[minmax(0,1.7fr)_minmax(18rem,0.8fr)]">
        <div>
          <div className="rounded-[var(--r-card)] border border-line bg-surface p-2">
            <WorldMap
              fill={(code) => {
                const c = byCode.get(code);
                return c ? leanFill(c.lovePct, c.sample === "few" ? 55 : 100) : null;
              }}
              active={hover}
              onHover={setHover}
            />
          </div>
          <p className="mt-3 flex min-h-6 items-center gap-2 text-[13.5px] text-ink-3">
            {on ? (
              <>
                <Flag code={on.countryCode} />
                <span className="num font-extrabold text-ink">{on.countryCode}</span>
                <span
                  className={cn(
                    "font-extrabold",
                    sideOf(on.lovePct) === "love" ? "text-love" : "text-hate",
                  )}
                >
                  {leanWord(on.lovePct)}
                </span>
                <span>this</span>
                <span className="num text-[11px] font-bold text-mute">
                  {strengthOf(on.lovePct)}%{on.sample === "few" ? " · too few to call" : ""}
                </span>
              </>
            ) : (
              <span className="text-mute">
                Red where it is loved, cyan where it is not. Point at a country.
              </span>
            )}
          </p>
        </div>

        <aside className="space-y-6 rounded-[var(--r-card)] border border-line bg-surface p-4 sm:p-5">
          {worldPct === null ? (
            <div className="rounded-[var(--r-btn)] border-2 border-go-fill/40 bg-go-fill/[0.08] p-4">
              <p className="flex items-center gap-2 text-[13px] font-extrabold text-ink">
                <Lock weight="fill" className="size-4 shrink-0 text-go" />
                The split is behind a vote.
              </p>
              <p className="mt-1.5 text-[12.5px] leading-snug text-ink-3">
                Where the world stands is above. How it actually split — the crowd against the
                people who paid to be counted — is what taking a side buys.
              </p>
              <Button
                variant="go"
                block
                className="mt-3"
                onClick={() => navigate(`/t/${topic.slug}`)}
              >
                Take a side
              </Button>
            </div>
          ) : null}

          <Board title="Loves it most" tone="!text-love" rows={loves} onHover={setHover} />
          <Board title="Hates it most" tone="!text-hate" rows={hates} onHover={setHover} />
        </aside>
      </div>
    </div>
  );
}

function Board({
  title,
  tone,
  rows,
  onHover,
}: {
  title: string;
  tone: string;
  rows: { countryCode: string; lovePct: number; sample: string }[];
  onHover: (code: string | null) => void;
}) {
  if (rows.length === 0) {
    return (
      <div>
        <p className={`label mb-2 ${tone}`}>{title}</p>
        <p className="text-[12.5px] text-mute">Nobody has voted here yet.</p>
      </div>
    );
  }
  return (
    <div>
      <p className={`label mb-2 ${tone}`}>{title}</p>
      <ul className="space-y-1">
        {rows.map((c) => (
          <li key={c.countryCode}>
            <Button
              bare
              onMouseEnter={() => onHover(c.countryCode)}
              onMouseLeave={() => onHover(null)}
              className={cn(
                "lift flex w-full items-center gap-2 rounded-[var(--r-btn)] border border-line bg-surface-2/40 px-2.5 py-1.5 text-left hover:border-line-2",
                c.sample === "few" && "opacity-70",
              )}
            >
              <Flag code={c.countryCode} />
              <span className="num text-[12px] font-bold text-ink">{c.countryCode}</span>
              <span className="min-w-0 flex-1 truncate text-[11.5px] text-mute">
                {nameOf(c.countryCode)}
              </span>
              <span
                className={cn(
                  "text-[11.5px] font-extrabold",
                  sideOf(c.lovePct) === "love" ? "text-love" : "text-hate",
                )}
              >
                {moodWord(c.lovePct)}
              </span>
              <span className="num w-7 shrink-0 text-right text-[10px] font-bold text-mute">
                {strengthOf(c.lovePct)}%
              </span>
            </Button>
          </li>
        ))}
      </ul>
    </div>
  );
}
