import { ArrowSquareOut, ChatCircle, ShareNetwork, Users, Warning } from "@phosphor-icons/react";

import { cn } from "../lib/cn";
import { fmtInt } from "../lib/format";
import type { DecideTopic } from "./Decide";
import { Button } from "../ui/Button";
import { Flag } from "../ui/Flag";

/**
 * The context strip above the question, and the size of the room below it.
 *
 * One line of chips that never competes with the question, and — in its own
 * band under the picture — how many people have already answered. That figure
 * was a 12.5px chip up here between a hashtag and a source link, which is the
 * wrong weight for the whole reason to have an opinion about a subject.
 */
export function DecideStrip({ topic, pad }: { topic: DecideTopic; pad: string }) {
  return (
      <header className={cn("flex shrink-0 flex-wrap items-center gap-x-2.5 gap-y-2 border-b border-line py-2.5", pad)}>
        {/* The flag leads so it sits in the same place on every question. */}
        {topic.scopeCountry ? (
          <span className="chip !bg-surface-3">
            <Flag code={topic.scopeCountry} withCode />
          </span>
        ) : null}
        <span className="rounded-[6px] bg-ink px-2.5 py-1 text-[11.5px] font-extrabold tracking-[0.06em] text-canvas uppercase">
          {topic.categorySlug}
        </span>
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
  );
}

/** How big the room is, at a size that says so. */
export function RoomSize({
  topic,
  onComments,
  onShare,
}: {
  topic: DecideTopic;
  onComments: () => void;
  /** Send this question on, before answering it. */
  onShare: () => void;
}) {
  return (
    <div key={`c-${topic.slug}`} className="rise mt-6 flex flex-wrap items-center gap-2.5 sm:mt-4 sm:gap-2">
      {/* Scaled for the screen it is on. These are a footnote to the question
          — how many turned up, how many stayed to argue — and at the desk's
          size on a phone they were three slabs competing with the headline
          above them. */}
      <span className="flex items-center gap-2 rounded-[var(--r-btn)] border-2 border-line-2 bg-surface-2 px-2.5 py-1.5 sm:gap-2.5 sm:px-3.5 sm:py-2">
        <Users weight="fill" className="size-4 text-ink-3 sm:size-[18px]" />
        <span className="num display text-[15px] leading-none sm:text-[clamp(1.2rem,1.8vw,1.75rem)]">
          {fmtInt(topic.voteCount)}
        </span>
        <span className="text-[10px] font-extrabold tracking-[0.08em] text-mute uppercase sm:text-[11.5px]">
          {topic.voteCount === 1 ? "vote in" : "votes in"}
        </span>
      </span>

      <Button
        bare
        onClick={onComments}
        className="lift flex items-center gap-2 rounded-[var(--r-btn)] border-2 border-line bg-surface-2 px-2.5 py-1.5 hover:border-line-2 sm:gap-2.5 sm:px-3.5 sm:py-2"
      >
        <ChatCircle weight="fill" className="size-4 text-hate sm:size-[18px]" />
        <span className="num display text-[15px] leading-none sm:text-[clamp(1.2rem,1.8vw,1.75rem)]">
          {fmtInt(topic.commentCount)}
        </span>
        <span className="text-[10px] font-extrabold tracking-[0.08em] text-mute uppercase sm:text-[11.5px]">
          arguing
        </span>
      </Button>

      {/* Sharing belongs here as well as under the result. The reveal's card
          is the better share, but a question worth arguing about is worth
          sending to the person you want to argue with, and making somebody
          vote first to be allowed to do that is a toll on the one act that
          brings anybody new in. */}
      <Button
        bare
        onClick={onShare}
        aria-label="Share this question"
        title="Share this question"
        className="lift flex items-center gap-2 rounded-[var(--r-btn)] border-2 border-line bg-surface-2 px-2.5 py-1.5 text-mute hover:border-line-2 hover:text-ink sm:px-3.5 sm:py-2"
      >
        <ShareNetwork weight="fill" className="size-4 sm:size-[18px]" />
        <span className="text-[10px] font-extrabold tracking-[0.08em] uppercase sm:text-[11.5px]">
          share
        </span>
      </Button>
    </div>
  );
}
