import { useEffect, useRef, useState } from "react";

import type { Id } from "../../convex/_generated/dataModel";
import type { ArenaHandle } from "../components/Arena";
import { Centre } from "../components/Centre";
import { DeckHint, Pager, useDeck } from "../components/mobile/Deck";
import { PhoneTour } from "../components/mobile/PhoneTour";
import { ShareSheet } from "../components/share/ShareSheet";
import { cardFor } from "../lib/shareCard";
import { PeekOffer } from "../components/PeekOffer";
import { useMutation } from "convex/react";
import { api } from "../../convex/_generated/api";
import { navigate } from "../lib/nav";
import { RoomRail, type RoomTab } from "../components/room/RoomRail";
import { RunRail } from "../components/run/RunRail";
import { Docked } from "../components/run/Docked";
import { onAsk } from "../lib/ask";
import { bleed, useRails } from "../lib/rails";
import { useRunKeys } from "../lib/keys";
import { useKeyTutor } from "../lib/keyTutor";
import { usePhoneTour } from "../lib/phoneTour";
import { useIsDesk } from "../lib/viewport";
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
export function Home({
  onAccount,
  slug,
}: {
  onAccount: () => void;
  /** A topic named in the address. The console opens on it. */
  slug?: string;
}) {
  const run = useRun({ startWith: slug });
  const [tab, setTab] = useState<RoomTab>("live");
  const [composing, setComposing] = useState(false);
  const [sharing, setSharing] = useState(false);
  const arena = useRef<ArenaHandle>(null);
  const deck = useDeck();
  const desk = useIsDesk();
  /* Readers said there was too much going on, so each rail can be put away.
     The column stays exactly where it was and its contents go behind the
     drifting weather instead — the question keeps the width it had, so
     docking a rail never reflows the thing somebody is reading. Desk only:
     below `xl` the three are a swiped deck and there is nothing to dock. */
  const { rails, toggle } = useRails();

  /* The bar's AI button lives in another tree, so its press arrives as an
     event. It opens the rail on the panel, un-docks the rail if it was put
     away, and on a phone swipes the deck to the room — a button that does
     nothing visible is worse than no button, and on a phone the panel it
     opens is a screen away. */
  useEffect(
    () =>
      onAsk(() => {
        setTab("ask");
        if (desk) {
          if (!rails.room) toggle("room");
        } else {
          deck.goTo(1);
        }
      }),
    [desk, deck, rails.room, toggle],
  );
  const tutor = useKeyTutor();
  const phone = usePhoneTour();

  /* Going and getting a topic is the strongest thing a reader can say about a
     subject short of paying for it, so it is written down — when the card
     lands, not on the press, so a pull that resolved to nothing teaches
     nothing. */
  const notePull = useMutation(api.interactions.pull);
  const noteShare = useMutation(api.interactions.share);
  const landed = run.pulled && !run.resolving && run.me ? run.topic?._id : undefined;
  useEffect(() => {
    if (landed) void notePull({ topicId: landed as Id<"topics"> });
  }, [landed, notePull]);

  /*
   * The rehearsal covers the keyboard too, and it has to.
   *
   * Two of the five steps could not be finished otherwise. `←` only ran when
   * there was something behind you, and during a rehearsal nothing is ever
   * cast, so the history stayed empty and the step waited forever. `→` had the
   * opposite fault: it bypassed the decision column entirely and skipped the
   * question for real, while the same press of the same card with a mouse did
   * nothing — the tour taught one thing and did another.
   *
   * So both are **live but inert** while the tour runs: the key is heard, the
   * step advances, and nothing moves. They go back to the real handlers the
   * moment it is walked or skipped.
   *
   * **And only on the desk.** The rehearsal ends when every key has been
   * pressed, which on a phone is never — the pill was hidden by a class while
   * the rehearsal it announced kept running underneath, so every tap on every
   * answer did nothing, permanently. A phone gets its own walkthrough instead,
   * and this one is never handed to the column at all.
   */
  const rehearsing = desk && !!tutor.tour.step;
  const inert = () => {};

  useRunKeys({
    answered: !!run.result || run.loading,
    asking: !!run.asking,
    canSpark: run.canSpark,
    pulled: run.pulled,
    // The key plays the same flood the mouse does; the arena calls back — and
    // in a rehearsal that callback is the one that does nothing.
    onPick: (side) => {
      if (arena.current) arena.current.press(side);
      else if (!rehearsing) run.pick(side);
    },
    onSkip: rehearsing ? inert : run.pass,
    onArm: () => run.setArmed(!run.armed),
    onNext: run.next,
    onRelease: run.release,
    onUndo: run.canUndo || !!run.asking ? () => void run.undo() : undefined,
    onBack: rehearsing ? inert : run.canGoBack ? run.back : undefined,
    onUsed: tutor.mark,
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
        "xl:grid-cols-[var(--rail-l)_minmax(0,1fr)_var(--rail-r)]",
        "xl:grid-rows-1",
      ].join(" ")}
    >
      {/* First in the deck, second across the desk: the question, then the
          answer to it, in the same frame. */}
      <main data-panel="vote" className={`${PANEL} xl:order-2`} style={bleed(rails, desk)}>
        <Centre
          ref={arena}
          topic={topic}
          pulled={run.pulled}
          linked={!!slug && run.pulled}
          onRelease={() => {
            // A link's address outlives the topic it opened: joining the run
            // has to leave it, or the back button returns to a question the
            // reader has already dealt with.
            if (slug) navigate("/");
            else run.release();
          }}
          result={run.result}
          loading={run.loading}
          resolving={run.resolving}
          armed={run.armed}
          canSpark={run.canSpark}
          sparks={run.me?.sparks}
          busy={run.busy}
          composing={composing}
          hint={<DeckHint label="The room" onGo={() => deck.goTo(1)} />}
          tour={desk ? tutor.tour : undefined}
          /* Only on a topic somebody came to on purpose. In a run the point
             is to answer, and an offer to buy the answer instead is the run
             arguing with itself. */
          extra={
            run.pulled && !run.result ? (
              <PeekOffer
                topicId={topic._id}
                signedIn={!!run.me}
                canSpark={run.canSpark}
              />
            ) : null
          }
          onArm={run.setArmed}
          onPick={run.pick}
          onSkip={run.pass}
          onBack={run.canGoBack ? run.back : undefined}
          onUndo={run.canUndo ? () => void run.undo() : undefined}
          undone={run.undone}
          onComments={() => {
            setTab("talk");
            deck.goTo(1);
          }}
          onGetSparks={onAccount}
          onNext={run.next}
          onShare={() => setSharing(true)}
        />
      </main>

      {/* The room. A row here pulls its topic into the middle. */}
      <div data-panel="room" className={`${PANEL} xl:relative xl:z-[1] xl:order-3`}>
        <Docked side="right" label="the room" away={desk && !rails.room} onShow={() => toggle("room")}>
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
          onHide={() => toggle("room")}
          onOpen={(slug: string) => {
            run.pull(slug);
            setTab("live");
            deck.goTo(0);
          }}
        />
        </Docked>
      </div>

      {/* The run: where you are in it, and what is still open. */}
      <div data-panel="run" className={`${PANEL} xl:relative xl:z-[1] xl:order-1`}>
        <Docked side="left" label="your run" away={desk && !rails.run} onShow={() => toggle("run")}>
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
          onHide={() => toggle("run")}
          onOpen={(slug) => {
            run.pull(slug);
            deck.goTo(0);
          }}
        />
        </Docked>
      </div>

      <Pager deck={deck} labels={SECTIONS} />

      {/* A phone's own walkthrough: gestures, never keys. */}
      {!desk && phone.open ? (
        <PhoneTour cards={phone.cards} onDone={phone.finish} />
      ) : null}

      {/* The card is drawn only from a result the reader has earned; with no
          reveal on screen there is nothing to draw and it shares the link. */}
      {sharing ? (
        <ShareSheet
          url={`${window.location.origin}/t/${topic.slug}`}
          text={topic.question}
          card={cardFor(topic.question, run.result?.stats, window.location.host)}
          onShared={() => {
            if (run.me) void noteShare({ topicId: topic._id as Id<"topics"> });
          }}
          onClose={() => setSharing(false)}
        />
      ) : null}

      {run.error ? (
        <p className="slide-up fixed bottom-6 left-1/2 z-50 -translate-x-1/2 rounded-[var(--r-sm)] border border-line-2 bg-surface-3 px-4 py-2.5 text-sm font-bold text-ink">
          {run.error}
        </p>
      ) : null}
    </div>
  );
}
