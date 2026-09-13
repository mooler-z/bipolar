import { useState } from "react";
import { useMutation, useQuery } from "convex/react";
import {
  ArrowLeft,
  ArrowSquareOut,
  ChatCircle,
  Lock,
  ShareNetwork,
  Users,
  Warning,
} from "@phosphor-icons/react";

import { api } from "../../convex/_generated/api";
import type { Id } from "../../convex/_generated/dataModel";
import { CallStep } from "../components/CallStep";
import { Comments } from "../components/Comments";
import { Result } from "../components/Result";
import { SparkToggle } from "../components/SparkToggle";
import { VoteButtons } from "../components/VoteButtons";
import { MIN_ROOM, fmtInt, type Side } from "../lib/format";
import { Button } from "../ui/Button";
import { Flag } from "../ui/Flag";
import { Thumb } from "../ui/Thumb";
import { Chip } from "../ui/Label";

/**
 * One topic, at its own address — the page a pasted link opens.
 *
 * The same address the Convex HTTP route answers for a crawler, so a machine
 * gets real markup and a person gets this. Where the feed moves on after a
 * vote, this page stays put: somebody arriving from a shared link came for this
 * question, not for the next one.
 *
 * Two columns, full width, with the argument pinned beside the result rather
 * than buried a screen below it — the comments are why a shared link gets
 * opened twice.
 */

const PAD = "px-[clamp(1.25rem,3vw,3.5rem)]";

export function TopicPage({
  slug,
  onBack,
}: {
  slug: string;
  onBack: () => void;
}) {
  const page = useQuery(api.topics.bySlug, { slug });
  const me = useQuery(api.users.me);
  const cast = useMutation(api.votes.cast);
  const peek = useMutation(api.votes.peek);

  const [armed, setArmed] = useState(false);
  const [asking, setAsking] = useState<Side | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  if (page === undefined) {
    return (
      <div className={`space-y-4 py-8 ${PAD}`}>
        <span className="shimmer block h-6 w-28 rounded-[var(--r-pill)]" />
        <span className="shimmer block h-16 w-2/3 rounded-[var(--r-btn)]" />
        <span className="shimmer block h-40 w-full rounded-[var(--r-card)]" />
      </div>
    );
  }
  if (page === null) {
    return (
      <div className="grid min-h-[60svh] place-items-center px-4 text-center">
        <div>
          <h1 className="display text-3xl">No such topic.</h1>
          <div className="mt-7 flex justify-center">
            <Button variant="go" onClick={onBack}>
              Back to the feed
            </Button>
          </div>
        </div>
      </div>
    );
  }

  const { topic, countries, viewer } = page;
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
    void attempt(() =>
      cast({
        topicId: topic._id as Id<"topics">,
        choice: side,
        voteType: armed ? "paid" : "free",
        call,
      }),
    );
  }

  return (
    <div className="min-h-[calc(100dvh-4rem)]">
      {/* The strip: where you are, and the two things you can do with a link. */}
      <header
        className={`flex flex-wrap items-center gap-x-3 gap-y-2 border-b border-line py-3 ${PAD}`}
      >
        <Button variant="ghost" size="sm" onClick={onBack}>
          <ArrowLeft className="size-3.5" /> All topics
        </Button>
        <span className="h-5 w-px bg-line" />
        <Chip className="capitalize">{topic.categorySlug}</Chip>
        {topic.scopeCountry ? (
          <Chip>
            <Flag code={topic.scopeCountry} withCode />
          </Chip>
        ) : null}
        {topic.isSensitive ? (
          <Chip tone="coin">
            <Warning className="size-3" /> Sensitive
          </Chip>
        ) : null}
        {topic.tags.slice(0, 4).map((t) => (
          <span key={t} className="text-[12px] font-semibold text-mute">
            #{t}
          </span>
        ))}

        <span className="flex-1" />

        <span className="flex items-center gap-1.5 text-[12.5px] text-mute">
          <Users className="size-3.5" />
          <span className="num font-bold text-ink-3">
            {fmtInt(topic.voteCount)}
          </span>
        </span>
        <span className="flex items-center gap-1.5 text-[12.5px] text-mute">
          <ChatCircle className="size-3.5" />
          <span className="num font-bold text-ink-3">
            {fmtInt(topic.commentCount)}
          </span>
        </span>
        {topic.sourceUrl ? (
          <a
            href={topic.sourceUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-1 text-[12.5px] text-mute transition-colors hover:text-ink"
          >
            Source <ArrowSquareOut className="size-3" />
          </a>
        ) : null}
        <Button
          variant="ghost"
          size="sm"
          onClick={() => {
            void navigator.clipboard?.writeText(window.location.href);
            setError("Link copied.");
            window.setTimeout(() => setError(""), 1600);
          }}
        >
          <ShareNetwork className="size-4" /> Share
        </Button>
      </header>

      <div className="grid xl:grid-cols-[minmax(0,1fr)_clamp(20rem,26vw,28rem)]">
        <main className={`min-w-0 py-[clamp(1.5rem,3vh,2.5rem)] ${PAD}`}>
          <div className="flex items-start gap-[clamp(1rem,2vw,2rem)]">
            <Thumb
              src={topic.imageUrl}
              alt=""
              className="hidden aspect-square w-[clamp(6rem,9vw,9rem)] sm:block"
            />
            <div className="min-w-0 flex-1">
              <h1 className="display max-w-[24ch] text-[clamp(1.9rem,3.2vw,3.5rem)] text-balance">
                {topic.question}
              </h1>
              {topic.description ? (
                <p className="mt-4 max-w-[62ch] text-[clamp(0.95rem,1vw,1.2rem)] leading-relaxed text-ink-3">
                  {topic.description}
                </p>
              ) : null}
            </div>
          </div>

          {topic.stats ? (
            <div className="mt-8">
              <Result
                stats={topic.stats}
                countries={countries}
                countriesFull={page.countriesFull}
                mySide={mySide}
                myStaked={viewer.votedPaid !== null}
              />
            </div>
          ) : (
            <div className="mt-8 max-w-3xl">
              {closed ? (
                <p className="card flex min-h-28 flex-col items-center justify-center gap-2">
                  <Lock className="size-5 text-mute" />
                  <span className="label">Voting has closed</span>
                </p>
              ) : (
                <>
                  <SparkToggle
                    armed={armed}
                    affordable={canSpark}
                    sparks={me?.sparks}
                    onChange={setArmed}
                  />
                  <div className="mt-2.5">
                    <VoteButtons
                      armed={armed}
                      busy={busy}
                      onPick={(side) =>
                        callable ? setAsking(side) : commit(side)
                      }
                    />
                  </div>
                </>
              )}

              {asking ? (
                <div className="mt-4">
                  <CallStep
                    mine={asking}
                    crowdSize={topic.crowdSize}
                    busy={busy}
                    onCall={(call) => commit(asking, call)}
                  />
                  <Button
                    variant="ghost"
                    size="sm"
                    block
                    className="mt-2"
                    onClick={() => commit(asking)}
                  >
                    Skip the call
                  </Button>
                </div>
              ) : null}

              <div className="card mt-4 flex flex-wrap items-center justify-between gap-4 p-5">
                <p className="max-w-[46ch] text-[14px] leading-snug text-ink-3">
                  The result is hidden until you decide &mdash; or pay 50&cent;
                  to see it without committing. Permanent, and not a vote.
                </p>
                <Button
                  variant="coin"
                  disabled={!viewer.signedIn || !canSpark}
                  onClick={() =>
                    void attempt(() =>
                      peek({ topicId: topic._id as Id<"topics"> }),
                    )
                  }
                >
                  Peek · 1 spark
                </Button>
              </div>
            </div>
          )}

          {error ? (
            <p className="mt-5 rounded-[var(--r-btn)] bg-love/15 px-3.5 py-2.5 text-sm font-semibold text-love">
              {error}
            </p>
          ) : null}
        </main>

        {/* The argument, beside the result rather than a screen below it. */}
        <aside className="rail min-w-0 border-line max-xl:border-t xl:border-l">
          <div className="p-4 xl:sticky xl:top-16 xl:max-h-[calc(100dvh-4.5rem)] xl:overflow-y-auto">
            <Comments
              slug={topic.slug}
              topicId={topic._id as Id<"topics">}
              quills={me?.quillBalance ?? 0}
              signedIn={viewer.signedIn}
            />
          </div>
        </aside>
      </div>
    </div>
  );
}
