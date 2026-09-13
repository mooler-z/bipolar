import { useMemo, useState } from "react";
import { useMutation, useQuery } from "convex/react";
import {
  ArrowLeft,
  ArrowRight,
  Check,
  MagnifyingGlass,
} from "@phosphor-icons/react";

import { api } from "../../convex/_generated/api";
import worldMap from "../data/world-map.json";
import { cn } from "../lib/cn";
import { Button } from "../ui/Button";
import { Field } from "../ui/Field";
import { Flag } from "../ui/Flag";
import { Label } from "../ui/Label";

/**
 * Two questions, once: where you are, and what you care about.
 *
 * Both feed the ranker and neither can be guessed. Country drives the "your
 * country disagrees with the world" signal and every per-country board;
 * interests seed affinity before there is any behaviour to learn from. After
 * that the answers matter less and less — every vote and skip nudges a live
 * taste weight that the ranker blends with what was said here.
 *
 * Both answers save in one mutation, because marking the account onboarded
 * halfway would strand anyone who closed the tab between the steps.
 */

const NATIONS = [...worldMap.countries]
  .map((c) => ({ code: c.code, name: c.name }))
  .sort((a, b) => a.name.localeCompare(b.name));

export function Welcome({ onDone }: { onDone: () => void }) {
  const me = useQuery(api.users.me);
  const categories = useQuery(api.interests.categories);
  const save = useMutation(api.interests.save);

  const [step, setStep] = useState<"country" | "interests">("country");
  const [country, setCountry] = useState<string | null>(null);
  const [chosen, setChosen] = useState<Set<string>>(() => new Set());
  const [query, setQuery] = useState("");
  const [busy, setBusy] = useState(false);

  const shown = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return NATIONS;
    return NATIONS.filter(
      (c) => c.name.toLowerCase().includes(q) || c.code.toLowerCase() === q,
    );
  }, [query]);

  async function finish(slugs: string[]) {
    if (busy) return;
    setBusy(true);
    try {
      await save({
        countryCode: country ?? undefined,
        categorySlugs: slugs,
      });
      onDone();
    } finally {
      setBusy(false);
    }
  }

  if (step === "country") {
    return (
      <div className="mx-auto flex min-h-[80svh] w-full max-w-2xl flex-col px-4 py-10 sm:px-6">
        <Label>Step 1 of 2</Label>
        <h1 className="display mt-2 text-[clamp(2rem,6vw,3rem)]">
          Where are you voting from?
        </h1>
        <p className="mt-3 text-[15px] text-ink-3">
          It decides which country you count towards, and it is how the app can
          tell you when your country disagrees with the world. Two changes a
          month after this.
        </p>

        <div className="relative mt-6">
          <MagnifyingGlass className="pointer-events-none absolute top-1/2 left-3.5 size-4 -translate-y-1/2 text-mute" />
          <Field
            label="Find your country"
            value={query}
            placeholder="Start typing…"
            onChange={(e) => setQuery(e.target.value)}
            className="pl-10"
          />
        </div>

        <ul className="mt-4 grid max-h-[46svh] grid-cols-1 gap-1.5 overflow-y-auto pr-1 sm:grid-cols-2">
          {shown.slice(0, 240).map((c) => (
            <li key={c.code}>
              <Button
                bare
                onClick={() => setCountry(c.code)}
                className={cn(
                  "flex min-h-11 w-full items-center gap-2.5 rounded-[var(--r-btn)] px-2.5 text-left",
                  "transition-[background-color,transform] duration-150 hover:translate-x-0.5 hover:bg-surface-3",
                  country === c.code && "bg-go/15 text-go",
                )}
              >
                <Flag code={c.code} withCode />
                <span className="flex-1 truncate text-[14px] font-medium">
                  {c.name}
                </span>
                {country === c.code ? (
                  <Check weight="bold" className="size-4" />
                ) : null}
              </Button>
            </li>
          ))}
        </ul>

        <div className="mt-6 flex items-center justify-between gap-3">
          <Button variant="ghost" size="sm" onClick={() => setStep("interests")}>
            Skip
          </Button>
          <Button
            variant="go"
            size="lg"
            disabled={!country}
            onClick={() => setStep("interests")}
          >
            Continue <ArrowRight className="size-4" />
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto flex min-h-[80svh] w-full max-w-2xl flex-col px-4 py-10 sm:px-6">
      <Button
        variant="ghost"
        size="sm"
        className="mb-2 self-start"
        onClick={() => setStep("country")}
      >
        <ArrowLeft className="size-4" /> Back
      </Button>
      <Label>Step 2 of 2</Label>
      <h1 className="display mt-2 text-[clamp(2rem,6vw,3rem)]">
        What do you argue about?
      </h1>
      <p className="mt-3 text-[15px] text-ink-3">
        A head start for the feed, not a filter — it will keep learning from what
        you actually vote on, and you will still see everything else.
        {me ? "" : ""}
      </p>

      <ul className="mt-6 flex flex-wrap gap-2.5">
        {(categories ?? []).map((c) => {
          const on = chosen.has(c.slug);
          return (
            <li key={c._id}>
              <Button
                variant={on ? "go" : "steel"}
                onClick={() =>
                  setChosen((prev) => {
                    const next = new Set(prev);
                    if (next.has(c.slug)) next.delete(c.slug);
                    else next.add(c.slug);
                    return next;
                  })
                }
                className="capitalize"
              >
                {on ? <Check weight="bold" className="size-4" /> : null}
                {c.name}
              </Button>
            </li>
          );
        })}
      </ul>

      <div className="mt-auto flex items-center justify-between gap-3 pt-8">
        <Button variant="ghost" size="sm" onClick={() => void finish([])}>
          Skip
        </Button>
        <Button
          variant="go"
          size="lg"
          disabled={busy}
          onClick={() => void finish([...chosen])}
        >
          {busy ? "Saving…" : `Start voting${chosen.size ? ` · ${chosen.size}` : ""}`}
          <ArrowRight className="size-4" />
        </Button>
      </div>
    </div>
  );
}
