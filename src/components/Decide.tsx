import { forwardRef, useState, type ReactNode } from "react";
import { ArrowLeft, ArrowRight, ArrowUUpLeft } from "@phosphor-icons/react";

import { cn } from "../lib/cn";
import type { Side } from "../lib/format";
import { Arena, type ArenaHandle } from "./Arena";
import { Backdrop } from "./Backdrop";
import { SparkSwitch } from "./SparkSwitch";
import { DecideStrip, RoomSize } from "./DecideHead";
import { KeyTutor, spotlit } from "./KeyTutor";
import type { Tour } from "../lib/keyTutor";
import { Button } from "../ui/Button";
import { Thumb } from "../ui/Thumb";

/**
 * The decision column: three fixed bands, not a stack that floats.
 *
 * A context strip at the top, the question in the middle taking whatever
 * height is left, and the arena **anchored to the bottom**. Anchoring is the
 * point — a two-line question and a five-line one put the answer in exactly
 * the same place, so a run is one target pressed repeatedly rather than a hunt
 * after every topic.
 *
 * The question is the biggest type in the app and the arena is the biggest
 * block of colour; nothing else in this column is allowed to compete with
 * either. The picture, when there is one, stands beside the question at a
 * size that earns its place, and vanishes entirely when there is not.
 */

export type DecideTopic = {
  slug: string;
  question: string;
  imageUrl?: string;
  description?: string;
  categorySlug: string;
  sourceUrl?: string;
  isSensitive: boolean;
  voteCount: number;
  commentCount: number;
  crowdSize: number;
  scopeCountry?: string;
  tags: string[];
};

const PAD = "px-[clamp(1.25rem,3vw,3.5rem)]";

export const Decide = forwardRef<
  ArenaHandle,
  {
    topic: DecideTopic;
    armed: boolean;
    canSpark: boolean;
    sparks?: number;
    busy: boolean;
    onArm: (armed: boolean) => void;
    onPick: (side: Side) => void;
    onSkip?: () => void;
    /** One step back through the run. Absent when there is nothing behind. */
    onBack?: () => void;
    /** Take back the vote just cast. Only for a reader who skips the result. */
    onUndo?: () => void;
    onComments: () => void;
    onShare: () => void;
    onGetSparks: () => void;
    /** Anything that belongs under the arena — the peek, on a topic's own page. */
    extra?: ReactNode;
    /** Replaces the keyboard hints where the layout is a deck rather than a desk. */
    hint?: ReactNode;
    /** The keyboard walkthrough: one step, and what it points at. */
    tour?: Tour;
    /** A pressed-but-uncast vote. Takes the arena's place while it is open. */
    pending?: ReactNode;
    /** A side just retracted. The arena comes back holding the board. */
    restoring?: Side | null;
  }
>(function Decide(
  { topic, armed, canSpark, sparks, busy, onArm, onPick, onSkip, onBack, onUndo, onComments, onShare, onGetSparks, extra, hint, tour, pending, restoring },
  ref,
) {
  /*
   * A rehearsal, while the tour is running.
   *
   * Somebody learning the keys will press the cards with the mouse to see
   * what they do, and that press would cast a real vote on a real question
   * before they had understood the question. So the arena, the skip and the
   * back are inert until the tour is walked or skipped: everything still
   * moves, nothing is sent. The spark switch is left live because flipping it
   * writes nothing either way, and feeling it move is the lesson.
   *
   * The pill says "practice" for exactly as long as this is true.
   */
  const rehearsing = !!tour?.step;
  const pick = rehearsing ? () => {} : onPick;
  /* Both buttons are *shown* through the rehearsal even when the run has
     nothing behind it yet — the tour points at them, and a spotlight on a
     control that is not on screen is a step nobody can finish. */
  const skip = rehearsing ? () => {} : onSkip;
  const back = rehearsing || onBack ? (rehearsing ? () => {} : onBack) : undefined;
  /* Which answer the cursor is over, and whether it has been pressed. It only
     drives the ground behind the question, which is why it lives here rather
     than in the arena. */
  const [lean, setLean] = useState<{ side: Side | null; pressed: boolean }>({
    side: null,
    pressed: false,
  });

  return (
    <section className="relative isolate flex h-full min-h-0 flex-col">
      <Backdrop lean={lean.side} flood={lean.pressed} />
      <DecideStrip topic={topic} pad={PAD} />

      {/* Band 2 — the question. Takes the slack, so the bands below never move. */}
      <div
        className={cn(
          "col-scroll flex flex-1 flex-col justify-center",
          "py-[clamp(1.25rem,3vh,2.5rem)]",
          PAD,
        )}
      >
        <div
          key={topic.slug}
          className="rise flex items-center gap-4 sm:gap-[clamp(1.25rem,2.5vw,2.5rem)]"
        >
          {/* One shape at both sizes: the picture stands to the **left** of the
              question and the question reads down its right-hand side.
              A full-bleed band above the headline was tried on the phone and
              cost a third of the screen to a picture, pushing the question into
              the arena. Standing it beside the words keeps the question the
              biggest thing on the phone as well as on the desk — it just takes
              a narrower column, which is why the headline steps down a size
              there rather than wrapping every second word.
              The picture is *contained* over a blurred copy of itself (`fill`)
              rather than cropped: these sources are a few hundred pixels wide
              and covering with one blew a cropped face up across the screen.
              `Thumb` renders nothing where there is nothing, so two thirds of
              this feed — the abstract topics — lose no room to a picture that
              does not exist. */}
          <Thumb
            src={topic.imageUrl}
            alt=""
            rounded="rounded-[var(--r-card)]"
            position="object-center sm:object-[50%_25%]"
            fit="object-contain sm:object-cover"
            fill
            className={cn(
              "aspect-square w-[34%] max-w-[10rem] shrink-0 border border-line-2",
              "sm:w-[clamp(8rem,14vw,15rem)] sm:max-w-none sm:border-2",
            )}
          />
          <div className="min-w-0 flex-1">
            <h1 className="display max-w-[20ch] text-[clamp(1.35rem,7vw,2rem)] text-balance sm:text-[clamp(2.4rem,4.4vw,5.2rem)]">
              {topic.question}
            </h1>
            {topic.description ? (
              <p className="mt-2 line-clamp-3 max-w-[58ch] text-[13px] leading-relaxed text-ink-3 sm:mt-4 sm:line-clamp-none sm:text-[clamp(0.95rem,1.05vw,1.2rem)]">
                {topic.description}
              </p>
            ) : null}
          </div>
        </div>

        <RoomSize topic={topic} onComments={onComments} onShare={onShare} />
      </div>

      {/* Band 3 — the answer. Always here, whatever the question was. */}
      <footer className={cn("shrink-0 border-t border-line bg-surface/40 py-[clamp(0.75rem,1.8vh,1.25rem)]", PAD)}>
        {/* One band, two states: the pending window takes the arena's place
            rather than covering it, so the foot never moves. */}
        {pending ? (
          pending
        ) : (
          <>
            {/* The step and the control it is about are lit together, so the
                instruction is never in a different place from the thing. */}
            <span className={cn("block", tour ? spotlit(tour, "spark") : "")}>
              <SparkSwitch
                armed={armed}
                affordable={canSpark}
                sparks={sparks}
                onChange={onArm}
                onEmpty={onGetSparks}
              />
            </span>

            <Arena
              ref={ref}
              armed={armed}
              busy={busy}
              onPick={pick}
              onLean={(side, pressed = false) => setLean({ side, pressed })}
              restoring={restoring}
              className={cn("mt-2.5 h-[clamp(10rem,30vh,15rem)]", tour ? spotlit(tour, "arena") : "")}
            />

            {extra}
          </>
        )}

        {/* Wraps, because a phone can be carrying four things here at once —
            the deck's nudge, Undo, Back and Skip — and a row that cannot wrap
            pushes the leftmost of them off the side of the screen, which is
            exactly where Undo sits. */}
        <div
          className={cn(
            "mt-2.5 flex flex-wrap items-center justify-between gap-x-3 gap-y-2",
            pending && "hidden",
          )}
        >
            {/* The desk's path through a run, one step at a time. */}
          {tour ? <KeyTutor tour={tour} /> : <span />}
          <span className="xl:hidden">{hint}</span>
          <span className="ml-auto flex shrink-0 items-center gap-1">
            {/* The vote just cast, for a reader who skipped past its result.
                There is no reveal to put this under, so it stands here — left
                of Skip, orange against the violet, on the same key. */}
            {onUndo ? (
              <Button
                variant="streak"
                size="sm"
                onClick={onUndo}
                title="Take back the vote you just cast"
              >
                <ArrowUUpLeft weight="bold" className="size-4" /> Undo
                <kbd className="key ml-1 !bg-current/15 !text-current !shadow-none">U</kbd>
              </Button>
            ) : null}
            {/* A run that only moves forward makes one stray keystroke
                permanent. This is the way back to it. */}
            {back ? (
              <Button
                variant="ghost"
                size="sm"
                onClick={back}
                title="Back one — the last question you left"
                className={tour ? spotlit(tour, "back") : undefined}
              >
                <ArrowLeft className="size-4" /> Back
                <kbd className="key ml-1 hidden xl:inline-grid">&larr;</kbd>
              </Button>
            ) : null}
            {skip ? (
              <Button
                variant="ghost"
                size="sm"
                onClick={skip}
                className={tour ? spotlit(tour, "skip") : undefined}
              >
                Skip <ArrowRight className="size-4" />
                <kbd className="key ml-1 hidden xl:inline-grid">&rarr;</kbd>
              </Button>
            ) : null}
          </span>
        </div>
      </footer>
    </section>
  );
});
