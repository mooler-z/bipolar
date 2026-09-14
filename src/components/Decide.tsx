import { forwardRef, useState, type ReactNode } from "react";
import {
  ArrowRight,
  ArrowSquareOut,
  ChatCircle,
  Users,
  Warning,
} from "@phosphor-icons/react";

import { cn } from "../lib/cn";
import { fmtInt, type Side } from "../lib/format";
import { Arena, type ArenaHandle } from "./Arena";
import { Backdrop } from "./Backdrop";
import { SparkSwitch } from "./SparkSwitch";
import { Button } from "../ui/Button";
import { Flag } from "../ui/Flag";
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
    onComments: () => void;
    onGetSparks: () => void;
    /** Anything that belongs under the arena — the peek, on a topic's own page. */
    extra?: ReactNode;
    /** Replaces the keyboard hints where the layout is a deck rather than a desk. */
    hint?: ReactNode;
  }
>(function Decide(
  { topic, armed, canSpark, sparks, busy, onArm, onPick, onSkip, onComments, onGetSparks, extra, hint },
  ref,
) {
  /* Which answer the cursor is over. It only drives the ground behind the
     question, which is why it lives here rather than in the arena. */
  const [lean, setLean] = useState<Side | null>(null);

  return (
    <section className="relative isolate flex h-full min-h-0 flex-col">
      <Backdrop lean={lean} />
      {/* Band 1 — context. One line; nothing here competes with the question. */}
      <header className={cn("flex shrink-0 flex-wrap items-center gap-x-2.5 gap-y-2 border-b border-line py-2.5", PAD)}>
        <span className="rounded-[6px] bg-ink px-2.5 py-1 text-[11.5px] font-extrabold tracking-[0.06em] text-canvas uppercase">
          {topic.categorySlug}
        </span>
        {topic.scopeCountry ? (
          <span className="chip !bg-surface-3">
            <Flag code={topic.scopeCountry} withCode />
          </span>
        ) : null}
        {topic.isSensitive ? (
          <span className="chip !bg-coin-fill/15 !text-coin">
            <Warning weight="fill" className="size-3" /> Sensitive
          </span>
        ) : null}
        {topic.tags.slice(0, 3).map((t) => (
          <span key={t} className="hidden text-[12px] font-semibold text-mute sm:inline">
            #{t}
          </span>
        ))}

        <span className="flex-1" />

        <span className="num flex items-center gap-1.5 rounded-[6px] bg-surface-4 px-2.5 py-1 text-[12.5px] font-extrabold text-ink">
          <Users weight="fill" className="size-3.5 text-ink-3" />
          {fmtInt(topic.voteCount)} in
        </span>
        <Button
          bare
          onClick={onComments}
          className="lift flex items-center gap-1.5 text-[12.5px] text-mute hover:text-ink"
        >
          <ChatCircle weight="fill" className="size-3.5" />
          <span className="num font-bold">{fmtInt(topic.commentCount)}</span>
          <span className="hidden sm:inline">arguing</span>
        </Button>
        {topic.sourceUrl ? (
          <a
            href={topic.sourceUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="hidden items-center gap-1 text-[12.5px] text-mute transition-colors hover:text-ink sm:flex"
          >
            Source <ArrowSquareOut className="size-3" />
          </a>
        ) : null}
      </header>

      {/* Band 2 — the question. Takes the slack, so the bands below never move.
          On a phone it fills from the top down, because a centred column under
          a full-bleed picture leaves the picture floating in the middle of the
          screen with black above it. */}
      <div
        className={cn(
          "col-scroll flex flex-1 flex-col max-sm:justify-start sm:justify-center",
          "pb-[clamp(1.25rem,3vh,2.5rem)] max-sm:pt-0 sm:pt-[clamp(1.25rem,3vh,2.5rem)]",
          PAD,
        )}
      >
        <div
          key={topic.slug}
          className="rise flex flex-col gap-5 sm:flex-row sm:items-center sm:gap-[clamp(1.25rem,2.5vw,2.5rem)]"
        >
          {/* Two shapes, one picture.
              On a phone it is a **full-bleed band** under the context strip —
              the negative margin cancels this band's own gutter, so the image
              runs edge to edge and the question reads as a headline under it.
              The picture is *contained* inside that band over a blurred copy
              of itself (`fill`), because these sources are a few hundred pixels
              wide and covering a banner with one blew a cropped face up across
              the whole screen. A small square pinned to the left margin was
              tried before that and read as a thumbnail somebody forgot to
              remove.
              On a desk it goes back to a square standing beside the question,
              where the width is there to spend.
              `Thumb` renders nothing where there is nothing, so two thirds of
              this feed — the abstract topics — lose no room to a picture that
              does not exist. */}
          <Thumb
            src={topic.imageUrl}
            alt=""
            rounded="rounded-none sm:rounded-[var(--r-card)]"
            position="object-center sm:object-[50%_25%]"
            fit="object-contain sm:object-cover"
            fill
            className={cn(
              "-mx-[clamp(1.25rem,3vw,3.5rem)] h-[min(23vh,13rem)] border-line-2",
              "sm:mx-0 sm:aspect-square sm:h-auto sm:w-[clamp(8rem,14vw,15rem)] sm:border-2",
            )}
          />
          <div className="min-w-0 flex-1">
            <h1 className="display max-w-[20ch] text-[clamp(2.4rem,4.4vw,5.2rem)] text-balance">
              {topic.question}
            </h1>
            {topic.description ? (
              <p className="mt-4 line-clamp-3 max-w-[58ch] text-[clamp(0.95rem,1.05vw,1.2rem)] leading-relaxed text-ink-3 sm:line-clamp-none">
                {topic.description}
              </p>
            ) : null}
          </div>
        </div>
      </div>

      {/* Band 3 — the answer. Always here, whatever the question was. */}
      <footer className={cn("shrink-0 border-t border-line bg-surface/40 py-[clamp(0.75rem,1.8vh,1.25rem)]", PAD)}>
        <SparkSwitch
          armed={armed}
          affordable={canSpark}
          sparks={sparks}
          onChange={onArm}
          onEmpty={onGetSparks}
        />

        <Arena
          ref={ref}
          armed={armed}
          busy={busy}
          onPick={onPick}
          onLean={setLean}
          className="mt-2.5 h-[clamp(10rem,30vh,15rem)]"
        />

        {extra}

        <div className="mt-2.5 flex items-center justify-between gap-3">
          {/* The keyboard is the desk's path through a run; the deck's is a
              swipe, and a key cap on a phone is a hint about nothing. */}
          <span className="hidden items-center gap-1.5 text-[11.5px] text-mute xl:flex">
            <kbd className="key">L</kbd>
            <kbd className="key">H</kbd>
            <span className="ml-1">to answer</span>
            <span className="mx-1 text-line-2">·</span>
            <kbd className="key">space</kbd>
            <span className="ml-1">to back it</span>
          </span>
          <span className="xl:hidden">{hint}</span>
          {onSkip ? (
            <Button variant="ghost" size="sm" onClick={onSkip}>
              Skip <ArrowRight className="size-4" />
              <kbd className="key ml-1 hidden xl:inline-grid">S</kbd>
            </Button>
          ) : null}
        </div>
      </footer>
    </section>
  );
});
