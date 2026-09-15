import { useState } from "react";
import { CaretDown, CaretRight } from "@phosphor-icons/react";

import { cn } from "../../lib/cn";
import { Button } from "../../ui/Button";
import { Flag } from "../../ui/Flag";
import { Thumb } from "../../ui/Thumb";

/**
 * What is still open. The Zeigarnik pull, made literal.
 *
 * An unfinished list is a stronger reason to answer one more than any button
 * could be. Every row is a door: clicking one pulls that question into the
 * middle ahead of its turn, and the run carries on from there.
 *
 * **Open by default, and collapsible to its head.** The list is the pull, so
 * it is the list that shows: a rail whose queue is one row is a rail with no
 * reason to look at it. The collapse is there for the reader who finds it too
 * much — one press and it plays like a player, showing the next question and
 * nothing else, the way the room's own rails dock. Either way the count in the
 * heading says how many there really are, so nothing is hidden by the shape.
 */

export type QueueItem = {
  _id: string;
  slug: string;
  question: string;
  categorySlug: string;
  scopeCountry?: string;
  imageUrl?: string;
};

function Row({
  item,
  place,
  lead,
  delay,
  onOpen,
}: {
  item: QueueItem;
  /** Its number in the run, as the reader counts them. */
  place: number;
  /** The one that is actually next. Drawn at the weight that deserves. */
  lead: boolean;
  delay: number;
  onOpen: (slug: string) => void;
}) {
  return (
    <li className="stagger" style={{ animationDelay: `${delay}ms` }}>
      <Button
        bare
        onClick={() => onOpen(item.slug)}
        className={cn(
          "group/q flex w-full items-start gap-2.5 rounded-[10px] px-2 py-2 text-left",
          "transition-[background-color,transform] duration-150 hover:translate-x-1 hover:bg-surface-3",
          lead && "bg-surface-2",
        )}
      >
        <span
          className={cn(
            "num mt-0.5 grid size-5 shrink-0 place-items-center rounded-[5px] text-[10.5px] font-extrabold",
            lead ? "bg-go-fill text-on-go" : "bg-surface-3 text-mute",
          )}
        >
          {place}
        </span>
        <Thumb
          src={item.imageUrl}
          alt=""
          rounded="rounded-[6px]"
          className={cn("mt-0.5 shrink-0", lead ? "size-11" : "size-9")}
        />
        <span className="min-w-0 flex-1">
          <span
            className={cn(
              "line-clamp-2 leading-snug font-semibold text-ink-2 group-hover/q:text-ink",
              lead ? "text-[13.5px]" : "text-[12.5px]",
            )}
          >
            {item.question}
          </span>
          <span className="mt-0.5 flex items-center gap-1.5">
            {item.scopeCountry ? <Flag code={item.scopeCountry} /> : null}
            <span className="text-[11px] font-semibold text-mute capitalize">
              {item.categorySlug}
            </span>
          </span>
        </span>
        <CaretRight
          weight="bold"
          className="mt-1.5 size-3.5 shrink-0 text-mute opacity-0 transition-opacity group-hover/q:opacity-100"
        />
      </Button>
    </li>
  );
}

export function Queue({
  answered,
  remaining,
  queue,
  onOpen,
}: {
  answered: number;
  remaining: number;
  queue: QueueItem[];
  onOpen: (slug: string) => void;
}) {
  const [all, setAll] = useState(true);
  const shown = all ? queue : queue.slice(0, 1);
  const hidden = queue.length - shown.length;

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <h2 className="mb-2 flex shrink-0 items-baseline gap-2 px-1 text-[12px] font-extrabold tracking-[0.06em] text-ink-3 uppercase">
        Up next
        <span className="num text-mute">{remaining}</span>
      </h2>

      <ul
        className={cn(
          "-mx-1 space-y-0.5 px-1",
          // Only the open list scrolls. Closed, it is one row and a scroller
          // around one row is a scrollbar with nothing to say.
          all ? "col-scroll flex-1" : "shrink-0",
        )}
      >
        {shown.map((t, i) => (
          <Row
            key={t._id}
            item={t}
            place={answered + i + 2}
            lead={i === 0}
            delay={Math.min(i, 10) * 35}
            onOpen={onOpen}
          />
        ))}
        {queue.length === 0 ? (
          <li className="px-2 py-2 text-[12.5px] text-mute">
            Nothing queued — the crawler runs every six hours.
          </li>
        ) : null}
      </ul>

      {hidden > 0 || all ? (
        <Button
          bare
          onClick={() => setAll((was) => !was)}
          className={cn(
            "lift mt-1.5 flex shrink-0 items-center justify-center gap-1.5 rounded-[8px] py-1.5",
            "text-[11.5px] font-extrabold tracking-[0.04em] text-mute uppercase",
            "hover:bg-surface-2 hover:text-ink",
          )}
        >
          <CaretDown
            weight="bold"
            className={cn("size-3.5 transition-transform duration-200", all && "rotate-180")}
          />
          {all ? "Show less" : `Show all ${queue.length}`}
        </Button>
      ) : null}
    </div>
  );
}
