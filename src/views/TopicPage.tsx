import { useRef, useState } from "react";
import { useMutation, useQuery } from "convex/react";
import { Eye, LockSimple } from "@phosphor-icons/react";

import { api } from "../../convex/_generated/api";
import type { Id } from "../../convex/_generated/dataModel";
import type { ArenaHandle } from "../components/Arena";
import { CallStep } from "../components/CallStep";
import { Decide } from "../components/Decide";
import { Reveal } from "../components/Reveal";
import type { CallVerdict } from "../components/reveal/types";
import { DeckHint, Pager, useDeck } from "../components/mobile/Deck";
import { RoomRail, type RoomTab } from "../components/room/RoomRail";
import { MIN_ROOM, type Side } from "../lib/format";
import { useRunKeys } from "../lib/keys";
import { Button } from "../ui/Button";
import { WorldRail } from "./topic/WorldRail";

/**
 * One topic, at its own address — the page a pasted link opens.
 *
 * The same address the Convex HTTP route answers for a crawler, so a machine
 * gets real markup and a person gets this. Where the run moves on after a
 * vote, this page stays put: somebody arriving from a shared link came for
 * this question, not for the next one.
 *
 * The same console as the run — the world on the left, the decision in the
 * middle, the room on the right — so a link opens into the product rather
 * than into a different, flatter page of it, and the same deck on a phone.
 */

const PANEL =
  "min-h-0 max-xl:h-[calc(100dvh-var(--bar))] max-xl:shrink-0 max-xl:snap-start max-xl:snap-always";

const SECTIONS = ["The question", "The room", "The world"];
export function TopicPage({ slug, onBack }: { slug: string; onBack: () => void }) {
  const page = useQuery(api.topics.bySlug, { slug });
  const me = useQuery(api.users.me);
  const cast = useMutation(api.votes.cast);
  const peek = useMutation(api.votes.peek);

  const [armed, setArmed] = useState(false);
  const [asking, setAsking] = useState<Side | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [tab, setTab] = useState<RoomTab>("talk");
  const [verdict, setVerdict] = useState<CallVerdict>(null);
  const arena = useRef<ArenaHandle>(null);
  const deck = useDeck();

  const topic = page?.topic;
  const answered = !!topic?.stats;

  useRunKeys({
    answered,
    asking: !!asking,
    canSpark: (me?.walletBalanceCents ?? 0) >= 50,
    onPick: (side) => arena.current?.press(side),
    onArm: () => setArmed((a) => !a),
    onNext: onBack,
  });

  if (page === undefined) {
    return (
      <div className="grid h-[calc(100dvh-var(--bar))] place-items-center">
        <span className="shimmer h-14 w-[38vw] rounded-[var(--r-card)]" />
      </div>
    );
  }
  if (page === null || !topic) {
    return (
      <div className="grid h-[calc(100dvh-var(--bar))] place-items-center px-4 text-center">
        <div>
          <h1 className="display text-[clamp(2rem,4vw,3.25rem)]">No such topic.</h1>
          <div className="mt-7 flex justify-center">
            <Button variant="go" size="lg" onClick={onBack}>Back to the run</Button>
          </div>
        </div>
      </div>
    );
  }

  const { countries, viewer } = page;
  const canSpark = (me?.walletBalanceCents ?? 0) >= 50;
  const mySide = (viewer.votedPaid ?? viewer.votedFree) as Side | null;
  const closed = topic.closesAt !== undefined && topic.closesAt <= Date.now();
  const callable = topic.crowdSize >= MIN_ROOM;

  async function attempt(run: () => Promise<unknown>) {
    setError("");
    setBusy(true);
    try {
      await run();
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setBusy(false);
      setAsking(null);
    }
  }

  function commit(side: Side, call?: Side) {
    void attempt(async () => {
      const out = await cast({
        topicId: topic!._id as Id<"topics">,
        choice: side,
        voteType: armed ? "paid" : "free",
        call,
      });
      setVerdict(out.verdict);
    });
  }

  function share() {
    void navigator.clipboard?.writeText(window.location.href);
    setError("Link copied.");
    window.setTimeout(() => setError(""), 1600);
  }

  return (
    <div
      ref={deck.ref}
      className={[
        "flex flex-col",
        "max-xl:h-[calc(100dvh-var(--bar))] max-xl:snap-y max-xl:snap-mandatory",
        "max-xl:overflow-y-auto max-xl:overscroll-y-contain",
        "xl:grid xl:h-[calc(100dvh-var(--bar))] xl:overflow-hidden",
        "xl:grid-cols-[clamp(15rem,17vw,19rem)_minmax(0,1fr)_clamp(19rem,23vw,25rem)]",
        "xl:grid-rows-1",
      ].join(" ")}
    >
      <main data-panel="vote" className={`${PANEL} xl:order-2`}>
        {topic.stats ? (
          <Reveal
            question={topic.question}
            imageUrl={topic.imageUrl}
            stats={topic.stats}
            countries={page.countriesFull ?? []}
            mine={mySide}
            staked={viewer.votedPaid !== null}
            verdict={verdict}
            onBack={onBack}
            onShare={share}
          />
        ) : closed ? (
          <div className="grid h-full place-items-center px-8 text-center">
            <div>
              <LockSimple weight="fill" className="mx-auto size-8 text-mute" />
              <h1 className="display mt-3 text-[clamp(1.8rem,3vw,3rem)]">{topic.question}</h1>
              <p className="label mt-2 block">Voting has closed.</p>
            </div>
          </div>
        ) : (
          <Decide
            ref={arena}
            topic={topic}
            armed={armed}
            canSpark={canSpark}
            sparks={me?.sparks}
            busy={busy}
            onArm={setArmed}
            onPick={(side) => (callable ? setAsking(side) : commit(side))}
            onComments={() => {
              setTab("talk");
              deck.goTo(1);
            }}
            onGetSparks={onBack}
            hint={<DeckHint label="The room" onGo={() => deck.goTo(1)} />}
            extra={
              <div className="mt-2.5 flex flex-wrap items-center justify-between gap-3 rounded-[var(--r-btn)] border border-line bg-surface-2 px-4 py-2.5">
                <p className="flex items-center gap-2 text-[12.5px] leading-snug text-ink-3">
                  <LockSimple weight="fill" className="size-3.5 shrink-0 text-mute" />
                  The result is hidden until you decide. Or pay a spark to see it without committing — permanent, and not a vote.
                </p>
                <Button
                  variant="coin"
                  size="sm"
                  disabled={!viewer.signedIn || !canSpark || busy}
                  onClick={() => void attempt(() => peek({ topicId: topic!._id as Id<"topics"> }))}
                >
                  <Eye weight="fill" className="size-4" /> Peek · 1 spark
                </Button>
              </div>
            }
          />
        )}
      </main>

      <div data-panel="room" className={`${PANEL} xl:order-3`}>
        <RoomRail
          slug={topic.slug}
          topicId={topic._id as Id<"topics">}
          quills={me?.quillBalance ?? 0}
          signedIn={viewer.signedIn}
          commentCount={topic.commentCount}
          question={topic.question}
          onTopic={() => deck.goTo(0)}
          tab={tab}
          onTab={setTab}
          onOpen={(next: string) => {
            window.history.pushState({}, "", `/t/${next}`);
            window.dispatchEvent(new PopStateEvent("popstate"));
          }}
        />
      </div>

      <div data-panel="world" className={`${PANEL} xl:order-1`}>
        <WorldRail countries={countries} sources={page.sources} onBack={onBack} onShare={share} />
      </div>

      <Pager deck={deck} labels={SECTIONS} />

      {asking ? (
        <div className="fixed inset-0 z-50 grid place-items-center bg-black/70 px-6 backdrop-blur-sm">
          <div className="w-full max-w-lg">
            <CallStep mine={asking} crowdSize={topic.crowdSize} busy={busy} onCall={(call) => commit(asking, call)} />
            <Button variant="ghost" size="sm" block className="mt-2" onClick={() => commit(asking)}>
              Skip the call — just vote
            </Button>
          </div>
        </div>
      ) : null}

      {error ? (
        <p className="slide-up fixed bottom-6 left-1/2 z-50 -translate-x-1/2 rounded-[var(--r-sm)] border border-line-2 bg-surface-3 px-4 py-2.5 text-sm font-bold text-ink">
          {error}
        </p>
      ) : null}
    </div>
  );
}
