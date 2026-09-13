import {
  ArrowRight,
  ArrowSquareOut,
  ChatCircle,
  Users,
  Warning,
} from "@phosphor-icons/react";

import { cn } from "../lib/cn";
import { fmtInt, type Side } from "../lib/format";
import { SparkToggle } from "./SparkToggle";
import { VoteButtons } from "./VoteButtons";
import { Button } from "../ui/Button";
import { Flag } from "../ui/Flag";
import { Thumb } from "../ui/Thumb";

/**
 * The decision column: three fixed bands, not a stack that floats.
 *
 * A context strip at the top, the question in the middle taking whatever height
 * is left, and the answer **anchored to the bottom**. Anchoring is the point —
 * a two-line question and a five-line one put the buttons in exactly the same
 * place, so a run is one target pressed repeatedly rather than a hunt after
 * every topic. Centring the whole column instead is what left a screen-high
 * void above the question and pushed the spark switch off the bottom edge.
 *
 * Colour is spent only on the two answers. Everything here sits on the ordinary
 * surface so the type is readable.
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

export function Decide({
  topic,
  armed,
  canSpark,
  sparks,
  busy,
  onArm,
  onPick,
  onSkip,
  onComments,
}: {
  topic: DecideTopic;
  armed: boolean;
  canSpark: boolean;
  sparks?: number;
  busy: boolean;
  onArm: (armed: boolean) => void;
  onPick: (side: Side) => void;
  onSkip: () => void;
  onComments: () => void;
}) {
  return (
    <section className="flex h-full min-h-0 flex-col">
      {/* Band 1 — context. One line, and nothing here may compete with the
          question below it. */}
      <header
        className={cn(
          "flex shrink-0 flex-wrap items-center gap-x-3 gap-y-2 border-b border-line py-3",
          PAD,
        )}
      >
        <span className="chip !bg-surface-3 capitalize">{topic.categorySlug}</span>
        {topic.scopeCountry ? (
          <span className="chip !bg-surface-3">
            <Flag code={topic.scopeCountry} withCode />
          </span>
        ) : null}
        {topic.isSensitive ? (
          <span className="chip !bg-coin/15 !text-coin">
            <Warning className="size-3" /> Sensitive
          </span>
        ) : null}
        {topic.tags.slice(0, 3).map((t) => (
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
          answered
        </span>
        <Button
          bare
          onClick={onComments}
          className="lift flex items-center gap-1.5 text-[12.5px] text-mute hover:text-ink"
        >
          <ChatCircle className="size-3.5" />
          <span className="num font-bold">{fmtInt(topic.commentCount)}</span>
          arguing
        </Button>
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
      </header>

      {/* Band 2 — the question. Takes the slack, so the bands below it never
          move. */}
      <div
        className={cn(
          "col-scroll flex flex-1 flex-col justify-center py-[clamp(1.5rem,4vh,3rem)]",
          PAD,
        )}
      >
        {/* The picture sits beside the question, never above it. Above, it
            would push the question down on the topics that have one and leave a
            hole on the ones that do not. */}
        <div key={topic.slug} className="rise flex items-start gap-[clamp(1rem,2vw,2rem)]">
          <Thumb
            src={topic.imageUrl}
            alt=""
            className="hidden aspect-square w-[clamp(7rem,11vw,11rem)] sm:block"
          />
          <div className="min-w-0 flex-1">
            <h1 className="display max-w-[20ch] text-[clamp(2rem,3.6vw,4.25rem)] text-balance">
              {topic.question}
            </h1>
            {topic.description ? (
              <p className="mt-5 max-w-[60ch] text-[clamp(0.95rem,1vw,1.2rem)] leading-relaxed text-ink-3">
                {topic.description}
              </p>
            ) : null}
          </div>
        </div>
      </div>

      {/* Band 3 — the answer. Always here, whatever the question was. */}
      <footer
        className={cn(
          "shrink-0 border-t border-line bg-surface/40 py-[clamp(0.85rem,2vh,1.5rem)]",
          PAD,
        )}
      >
        {/* What the press is about to cost, directly above the press. */}
        <SparkToggle
          armed={armed}
          affordable={canSpark}
          sparks={sparks}
          onChange={onArm}
        />

        <div className="mt-2.5">
          <VoteButtons armed={armed} busy={busy} onPick={onPick} />
        </div>

        <div className="mt-2.5 flex items-center justify-between gap-3">
          <span className="text-[11.5px] text-mute">
            <kbd className="rounded-[4px] bg-surface-3 px-1 py-0.5 font-bold">L</kbd>
            {" / "}
            <kbd className="rounded-[4px] bg-surface-3 px-1 py-0.5 font-bold">H</kbd>
            {" to answer"}
          </span>

          <Button variant="ghost" size="sm" onClick={onSkip}>
            Skip <ArrowRight className="size-4" />
            <kbd className="ml-1 text-[10px] opacity-60">S</kbd>
          </Button>
        </div>
      </footer>
    </section>
  );
}
