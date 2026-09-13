import { useState } from "react";

import type { Id } from "../../convex/_generated/dataModel";
import { CallStep } from "../components/CallStep";
import { Centre } from "../components/Centre";
import { RoomRail, type RoomTab } from "../components/RoomRail";
import { RunRail } from "../components/RunRail";
import { useRunKeys } from "../lib/keys";
import { Button } from "../ui/Button";
import { useRun } from "./home/useRun";

/**
 * The console.
 *
 * Three columns that fill the window and never scroll it: the run on the left,
 * the decision in the middle, the room on the right. A vote does not navigate
 * anywhere — the middle column swaps from the question to the result and back
 * to the next question, while both rails keep moving around it. Clicking a row
 * in a rail pulls that topic into the middle for the same reason.
 *
 * That is the whole point of the shape. The rails are live Convex queries, so a
 * desktop here is not a wider phone: it is three things happening at once,
 * which is the only thing a large screen is actually good for.
 *
 * Below 1280px the three columns stack in reading order and the page scrolls,
 * so nothing is desktop-only — it is simply drawn for a desktop first.
 */
export function Home({ onAccount }: { onAccount: () => void }) {
  const run = useRun();
  const [tab, setTab] = useState<RoomTab>("live");

  useRunKeys({
    answered: !!run.result,
    asking: !!run.asking,
    canSpark: run.canSpark,
    onPick: run.pick,
    onSkip: run.pass,
    onArm: () => run.setArmed(!run.armed),
    onNext: run.next,
  });

  /* The run being empty *and* a pull still in flight is the one case with no
     column to render into — everywhere else the shell stays mounted. */
  if (run.feed === undefined || (!run.topic && run.pulled)) {
    return (
      <div className="grid h-[calc(100dvh-4rem)] place-items-center">
        <span className="shimmer h-14 w-[38vw] rounded-[var(--r-card)]" />
      </div>
    );
  }

  if (!run.topic) {
    return (
      <div className="grid h-[calc(100dvh-4rem)] place-items-center px-8 text-center">
        <div>
          <h2 className="display text-[clamp(2rem,4vw,3.25rem)]">
            That&rsquo;s the run.
          </h2>
          <p className="mt-3 text-[15px] text-mute">
            {run.answeredCount} answered. The crawler finds more every six hours.
          </p>
          <div className="mt-7 flex justify-center">
            <Button variant="go" size="lg" onClick={run.restart}>
              Go again
            </Button>
          </div>
        </div>
      </div>
    );
  }

  const topic = run.topic;
  const asking = run.asking;

  return (
    <div
      className={[
        "flex flex-col",
        "xl:grid xl:h-[calc(100dvh-4rem)] xl:overflow-hidden",
        "xl:grid-cols-[clamp(15rem,17vw,19rem)_minmax(0,1fr)_clamp(19rem,23vw,25rem)]",
        "xl:grid-rows-1",
      ].join(" ")}
    >
      {/* Left: the run. Third in the stack, first on a desktop. */}
      <div className="min-h-0 max-xl:order-3 max-xl:max-h-[32rem] max-xl:border-t max-xl:border-line">
        <RunRail
          answered={run.answeredCount}
          remaining={run.upNext.length}
          queue={run.upNext.slice(0, 13).map((t) => ({
            _id: t._id,
            slug: t.slug,
            question: t.question,
            categorySlug: t.categorySlug,
            scopeCountry: t.scopeCountry,
            imageUrl: t.imageUrl,
          }))}
          onAccount={onAccount}
        />
      </div>

      {/* Middle: the question, then the answer, in the same frame. */}
      <main className="min-h-0 max-xl:order-1 max-xl:min-h-[38rem]">
        <Centre
          topic={topic}
          pulled={run.pulled}
          onRelease={run.release}
          result={run.result}
          loading={run.loading}
          resolving={run.resolving}
          armed={run.armed}
          canSpark={run.canSpark}
          sparks={run.me?.sparks}
          busy={run.busy}
          onArm={run.setArmed}
          onPick={run.pick}
          onSkip={run.pass}
          onComments={() => setTab("talk")}
          onNext={run.next}
          onShare={() => {
            void navigator.clipboard?.writeText(
              `${window.location.origin}/t/${topic.slug}`,
            );
            run.setError("Link copied.");
            window.setTimeout(() => run.setError(""), 1600);
          }}
        />
      </main>

      {/* Right: the room. A row here pulls its topic into the middle. */}
      <div className="min-h-0 max-xl:order-2 max-xl:max-h-[34rem]">
        <RoomRail
          slug={topic.slug}
          topicId={topic._id as Id<"topics">}
          quills={run.me?.quillBalance ?? 0}
          signedIn={!!run.me}
          commentCount={topic.commentCount}
          tab={tab}
          onTab={setTab}
          onOpen={(slug) => {
            run.setPicked(slug);
            setTab("live");
          }}
        />
      </div>

      {/* The second question, over the console — it must not move the layout. */}
      {asking ? (
        <div className="fixed inset-0 z-50 grid place-items-center bg-black/60 px-6 backdrop-blur-sm">
          <div className="w-full max-w-lg">
            <CallStep
              mine={asking}
              crowdSize={topic.crowdSize}
              busy={run.busy}
              onCall={(call) => void run.commit(asking, call)}
            />
            <Button
              variant="ghost"
              size="sm"
              block
              className="mt-2"
              onClick={() => void run.commit(asking)}
            >
              Skip the call
            </Button>
          </div>
        </div>
      ) : null}

      {run.error ? (
        <p className="fixed bottom-6 left-1/2 z-50 -translate-x-1/2 rounded-[var(--r-btn)] border border-line bg-surface px-4 py-2.5 text-sm font-semibold text-ink shadow-lg">
          {run.error}
        </p>
      ) : null}
    </div>
  );
}
