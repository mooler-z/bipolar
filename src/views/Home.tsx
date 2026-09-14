import { useRef, useState } from "react";

import type { Id } from "../../convex/_generated/dataModel";
import type { ArenaHandle } from "../components/Arena";
import { CallStep } from "../components/CallStep";
import { Centre } from "../components/Centre";
import { DeckHint, Pager, useDeck } from "../components/mobile/Deck";
import { RoomRail, type RoomTab } from "../components/room/RoomRail";
import { RunRail } from "../components/run/RunRail";
import { useRunKeys } from "../lib/keys";
import { Button } from "../ui/Button";
import { CaughtUp } from "./home/CaughtUp";
import { useRun } from "./home/useRun";

/**
 * The console.
 *
 * Three columns that fill the window and never scroll it: the run on the left,
 * the decision in the middle, the room on the right. A vote does not navigate
 * anywhere — the middle column swaps from the question to the result and back
 * to the next question, while both rails keep moving around it. Clicking a row
 * in either rail pulls that topic into the middle for the same reason.
 *
 * That is the whole point of the shape. The rails are live Convex queries, so a
 * desktop here is not a wider phone: it is three things happening at once,
 * which is the only thing a large screen is actually good for.
 *
 * Below 1280px the same three become a deck: one screen each, snapped, so a
 * phone gets the question at full height and a swipe lands squarely on the
 * room and then on the run. Nothing is desktop-only — it is simply drawn for
 * a desktop first, and folded rather than stacked for a phone.
 */

/** One screen of the deck; one column of the grid. */
const PANEL =
  "min-h-0 max-xl:h-[calc(100dvh-var(--bar))] max-xl:shrink-0 max-xl:snap-start max-xl:snap-always";

const SECTIONS = ["The question", "The room", "Your run"];
export function Home({ onAccount }: { onAccount: () => void }) {
  const run = useRun();
  const [tab, setTab] = useState<RoomTab>("live");
  const [composing, setComposing] = useState(false);
  const arena = useRef<ArenaHandle>(null);
  const deck = useDeck();

  useRunKeys({
    answered: !!run.result || run.loading,
    asking: !!run.asking,
    canSpark: run.canSpark,
    pulled: run.pulled,
    // The key plays the same flood the mouse does; the arena calls back.
    onPick: (side) => (arena.current ? arena.current.press(side) : run.pick(side)),
    onSkip: run.pass,
    onArm: () => run.setArmed(!run.armed),
    onNext: run.next,
    onRelease: run.release,
  });

  /* The run being empty *and* a pull still in flight is the one case with no
     column to render into — everywhere else the shell stays mounted. */
  if (run.feed === undefined || (!run.topic && run.pulled)) {
    return (
      <div className="grid h-[calc(100dvh-var(--bar))] place-items-center">
        <span className="shimmer h-14 w-[38vw] rounded-[var(--r-card)]" />
      </div>
    );
  }

  if (!run.topic) {
    return (
      <CaughtUp
        answered={run.answeredCount}
        tally={run.tally}
        onAgain={run.restart}
        onAccount={onAccount}
      />
    );
  }

  const topic = run.topic;
  const asking = run.asking;

  return (
    <div
      ref={deck.ref}
      className={[
        "flex flex-col",
        // The deck: the scroller is this element, so the bar above it never
        // moves and a panel is always exactly one screen.
        "max-xl:h-[calc(100dvh-var(--bar))] max-xl:snap-y max-xl:snap-mandatory",
        "max-xl:overflow-y-auto max-xl:overscroll-y-contain",
        "xl:grid xl:h-[calc(100dvh-var(--bar))] xl:overflow-hidden",
        "xl:grid-cols-[clamp(15rem,17vw,19rem)_minmax(0,1fr)_clamp(19rem,23vw,25rem)]",
        "xl:grid-rows-1",
      ].join(" ")}
    >
      {/* First in the deck, second across the desk: the question, then the
          answer to it, in the same frame. */}
      <main data-panel="vote" className={`${PANEL} xl:order-2`}>
        <Centre
          ref={arena}
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
          composing={composing}
          hint={<DeckHint label="The room" onGo={() => deck.goTo(1)} />}
          onArm={run.setArmed}
          onPick={run.pick}
          onSkip={run.pass}
          onComments={() => {
            setTab("talk");
            deck.goTo(1);
          }}
          onGetSparks={onAccount}
          onNext={run.next}
          onShare={() => {
            void navigator.clipboard?.writeText(`${window.location.origin}/t/${topic.slug}`);
            run.setError("Link copied.");
            window.setTimeout(() => run.setError(""), 1600);
          }}
        />
      </main>

      {/* The room. A row here pulls its topic into the middle. */}
      <div data-panel="room" className={`${PANEL} xl:order-3`}>
        <RoomRail
          slug={topic.slug}
          topicId={topic._id as Id<"topics">}
          quills={run.me?.quillBalance ?? 0}
          signedIn={!!run.me}
          commentCount={topic.commentCount}
          question={topic.question}
          onTopic={() => deck.goTo(0)}
          tab={tab}
          onTab={setTab}
          onComposing={setComposing}
          onOpen={(slug: string) => {
            run.setPicked(slug);
            setTab("live");
            deck.goTo(0);
          }}
        />
      </div>

      {/* The run: where you are in it, and what is still open. */}
      <div data-panel="run" className={`${PANEL} xl:order-1`}>
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
          onOpen={(slug) => {
            run.setPicked(slug);
            deck.goTo(0);
          }}
        />
      </div>

      <Pager deck={deck} labels={SECTIONS} />

      {/* The second question, over the console — it must not move the layout. */}
      {asking ? (
        <div className="fixed inset-0 z-50 grid place-items-center bg-black/70 px-6 backdrop-blur-sm">
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
              Skip the call — just vote
            </Button>
          </div>
        </div>
      ) : null}

      {run.error ? (
        <p className="slide-up fixed bottom-6 left-1/2 z-50 -translate-x-1/2 rounded-[var(--r-sm)] border border-line-2 bg-surface-3 px-4 py-2.5 text-sm font-bold text-ink">
          {run.error}
        </p>
      ) : null}
    </div>
  );
}
