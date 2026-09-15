import { useState } from "react";
import { useMutation, useQuery } from "convex/react";
import { ArrowLeft, ArrowRight } from "@phosphor-icons/react";

import { api } from "../../convex/_generated/api";
import { cn } from "../lib/cn";
import { Button } from "../ui/Button";
import { Label } from "../ui/Label";
import { Wordmark } from "../ui/Wordmark";
import { CountryStep } from "./welcome/CountryStep";
import { InterestStep } from "./welcome/InterestStep";

/**
 * Two questions, once: where you are, and what you care about.
 *
 * Both feed the ranker and neither can be guessed. Country drives the "your
 * country disagrees with the world" signal and every per-country board;
 * interests seed affinity before there is any behaviour to learn from.
 *
 * Two panels that fill the window: the question and its controls on the
 * left, the picker taking the rest. A 640px column floating in a black sea
 * is the layout Rule 5 exists to ban, and it was this page.
 *
 * Both answers save in one mutation, because marking the account onboarded
 * halfway would strand anyone who closed the tab between the steps.
 */
export function Welcome({ onDone }: { onDone: () => void }) {
  const categories = useQuery(api.interests.categories);
  const save = useMutation(api.interests.save);

  const [step, setStep] = useState<"country" | "interests">("country");
  const [country, setCountry] = useState<string | null>(null);
  const [chosen, setChosen] = useState<Set<string>>(() => new Set());
  const [busy, setBusy] = useState(false);

  async function finish(slugs: string[]) {
    if (busy) return;
    setBusy(true);
    try {
      await save({ countryCode: country ?? undefined, categorySlugs: slugs });
      onDone();
    } finally {
      setBusy(false);
    }
  }

  const first = step === "country";
  const progress = first ? 50 : 100;

  /*
   * The two ways out of a step.
   *
   * Drawn once and placed twice. On a desk they sit at the foot of the column
   * of copy, where the sentence they answer is; stacked on a phone that column
   * ends halfway up the page and the buttons land in the middle of it, above a
   * list of two hundred countries nobody has scrolled yet. So the phone gets
   * them as a bar pinned to the bottom of the screen instead — where a thumb
   * already is, and where they stay in view however far the list is scrolled.
   */
  const actions = (
    <div className="flex items-center justify-between gap-3">
      {first ? (
        <Button variant="ghost" size="sm" onClick={() => setStep("interests")}>
          Skip
        </Button>
      ) : (
        <Button variant="ghost" size="sm" onClick={() => setStep("country")}>
          <ArrowLeft className="size-4" /> Back
        </Button>
      )}
      {first ? (
        <Button
          variant="go"
          size="lg"
          disabled={!country}
          onClick={() => setStep("interests")}
        >
          Continue <ArrowRight className="size-4" />
        </Button>
      ) : (
        <span className="flex items-center gap-2">
          <Button variant="ghost" size="sm" onClick={() => void finish([])}>
            Skip
          </Button>
          <Button
            variant="go"
            size="lg"
            disabled={busy}
            onClick={() => void finish([...chosen])}
          >
            {busy
              ? "Saving…"
              : `Start voting${chosen.size ? ` · ${chosen.size}` : ""}`}
            <ArrowRight className="size-4" />
          </Button>
        </span>
      )}
    </div>
  );

  return (
    <div className="grid min-h-[calc(100dvh-var(--bar))] pb-[5.5rem] lg:h-[calc(100dvh-var(--bar))] lg:grid-cols-[minmax(0,38fr)_minmax(0,62fr)] lg:pb-0">
      {/* The question. */}
      <section
        key={step}
        className="rise flex flex-col border-line px-[clamp(1.5rem,4vw,4rem)] py-10 lg:border-r"
      >
        <Wordmark />

        <div className="mt-8 flex items-center gap-3">
          <span className="bar flex-1">
            <span className="bar-fill" style={{ width: `${progress}%` }} />
          </span>
          <Label className="num shrink-0">Step {first ? 1 : 2} of 2</Label>
        </div>

        <h1 className="display mt-6 text-[clamp(2rem,3.4vw,3.25rem)]">
          {first ? "Where are you voting from?" : "What do you argue about?"}
        </h1>
        <p className="mt-4 max-w-[42ch] text-[15px] leading-relaxed text-ink-3">
          {first
            ? "It decides which country you count towards, and it is how the app can tell you when your country disagrees with the world. Two changes a month after this."
            : "A head start for the feed, not a filter — it will keep learning from what you actually vote on, and you will still see everything else."}
        </p>

        <div className="mt-auto hidden pt-10 lg:block">{actions}</div>
      </section>

      {/* The picker. */}
      <section className="flex min-h-0 flex-col px-[clamp(1.5rem,4vw,4rem)] py-10">
        {first ? (
          <CountryStep country={country} onPick={setCountry} />
        ) : (
          <InterestStep
            categories={categories}
            chosen={chosen}
            onToggle={(slug) =>
              setChosen((prev) => {
                const next = new Set(prev);
                if (next.has(slug)) next.delete(slug);
                else next.add(slug);
                return next;
              })
            }
          />
        )}
      </section>

      {/* The phone's foot. Fixed, not sticky: a grid item's sticky range is its
          own grid area, and this one's area is exactly the height of the bar —
          zero room to move, so it would never stick to anything. The page pays
          for it with matching bottom padding rather than hiding its last row
          under it. */}
      <div
        className={cn(
          "fixed inset-x-0 bottom-0 z-30 border-t border-line bg-canvas/85 backdrop-blur-md lg:hidden",
          "px-[clamp(1.5rem,4vw,4rem)] py-3",
        )}
      >
        {actions}
      </div>
    </div>
  );
}
