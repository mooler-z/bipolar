import { useState } from "react";
import { useQuery } from "convex/react";
import {
  ArrowsClockwise,
  Check,
  Fire,
  Heart,
  Lightning,
  ShareNetwork,
  Target,
  HeartBreak,
  UserCircle,
} from "@phosphor-icons/react";

import { api } from "../../../convex/_generated/api";
import { ShareSheet } from "../../components/share/ShareSheet";
import { Burst } from "../../ui/Burst";
import { Button } from "../../ui/Button";
import { Tile } from "../../ui/Tile";
import type { Tally } from "./useTally";

/**
 * Caught up. Not a dead end — a session wrap-up.
 *
 * The peak-end rule says a sitting is remembered by how it ends, so it ends
 * on the record: what you answered, which way you lean, how well you read the
 * room. The tiles land one after another, the way a lesson ends over at
 * Duolingo, and the one sentence worth repeating is a button away.
 *
 * "You're caught up" is also the honest alternative to an endless feed, and
 * it says so: the crawler refills the run on its own schedule, not on yours.
 */
export function CaughtUp({
  answered,
  tally,
  onAgain,
  onAccount,
}: {
  answered: number;
  tally: Tally;
  onAgain: () => void;
  onAccount: () => void;
}) {
  const calls = useQuery(api.calls.me);
  const [sharing, setSharing] = useState(false);
  const voted = tally.love + tally.hate;
  const lovePct = voted === 0 ? 0 : Math.round((tally.love / voted) * 100);
  const graded = tally.right + tally.wrong;

  /* The day, not a topic — so there is no result to draw a card from, and the
     sheet falls through to the link and the channels. */
  const line =
    voted > 0
      ? `I answered ${voted} ${voted === 1 ? "question" : "questions"} on bipolar today — ${lovePct}% love. Where do you stand?`
      : `Pick a side on bipolar.`;

  return (
    <div className="grid h-[calc(100dvh-var(--bar))] place-items-center px-[clamp(1.25rem,4vw,4rem)]">
      <div className="w-full max-w-4xl">
        <p className="label mb-2">The run</p>
        <h2 className="rise display relative inline-block text-[clamp(2.5rem,6vw,5.5rem)]">
          {answered >= 5 ? (
          <Burst colours={["var(--go-fill)", "var(--coin-fill)", "var(--love-fill)", "var(--hate-fill)"]} />
        ) : null}
          That&rsquo;s everything.
        </h2>
        <p className="mt-3 max-w-[52ch] text-[15px] text-ink-3">
          {voted > 0
            ? `You answered ${voted} and lean ${lovePct}% love. `
            : "Nothing answered this sitting. "}
          The crawler finds new arguments every six hours; the queue refills on its own.
        </p>

        <div className="mt-8 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
          <Tile icon={<Check weight="bold" className="size-3.5" />} value={answered} label="Answered" tone="go" delay={0} />
          <Tile icon={<Heart weight="fill" className="size-3.5" />} value={tally.love} label="Love" tone="love" delay={90} />
          <Tile icon={<HeartBreak weight="fill" className="size-3.5" />} value={tally.hate} label="Hate" tone="hate" delay={180} />
          <Tile icon={<Lightning weight="fill" className="size-3.5" />} value={tally.staked} label="Backed" tone="coin" delay={270} />
          <Tile
            icon={<Target weight="fill" className="size-3.5" />}
            value={graded > 0 ? `${tally.right}/${graded}` : "—"}
            label="Read right"
            hint={graded > 0 ? undefined : "no rooms called"}
            tone={graded > 0 ? "go" : "mute"}
            delay={360}
          />
          <Tile
            icon={<Fire weight="fill" className="size-3.5" />}
            value={calls?.streak ?? 0}
            label="Streak"
            tone={(calls?.streak ?? 0) > 0 ? "streak" : "mute"}
            delay={450}
          />
        </div>

        <div className="mt-8 flex flex-wrap items-center gap-3">
          <Button variant="go" size="lg" onClick={onAgain}>
            <ArrowsClockwise weight="bold" className="size-4" /> Go again
          </Button>
          <Button variant="steel" size="lg" onClick={() => setSharing(true)}>
            <ShareNetwork weight="fill" className="size-4" /> Share your day
          </Button>
          <Button variant="ghost" size="lg" onClick={onAccount}>
            <UserCircle className="size-4" /> Your record
          </Button>
        </div>
      </div>

      {sharing ? (
        <ShareSheet
          url={window.location.origin}
          text={line}
          onClose={() => setSharing(false)}
        />
      ) : null}
    </div>
  );
}
