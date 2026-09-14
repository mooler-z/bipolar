import { CaretRight } from "@phosphor-icons/react";

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
 */

export type QueueItem = {
  _id: string;
  slug: string;
  question: string;
  categorySlug: string;
  scopeCountry?: string;
  imageUrl?: string;
};

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
  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <h2 className="mb-2 flex shrink-0 items-baseline gap-2 px-1 text-[12px] font-extrabold tracking-[0.06em] text-ink-3 uppercase">
        Up next
        <span className="num text-mute">{remaining}</span>
      </h2>
      <ul className="col-scroll -mx-1 flex-1 space-y-0.5 px-1">
        {queue.map((t, i) => (
          <li
            key={t._id}
            className="stagger"
            style={{ animationDelay: `${Math.min(i, 10) * 35}ms` }}
          >
            <Button
              bare
              onClick={() => onOpen(t.slug)}
              className={cn(
                "group/q flex w-full items-start gap-2.5 rounded-[10px] px-2 py-2 text-left",
                "transition-[background-color,transform] duration-150 hover:translate-x-1 hover:bg-surface-3",
                i === 0 && "bg-surface-2",
              )}
            >
              <span
                className={cn(
                  "num mt-0.5 grid size-5 shrink-0 place-items-center rounded-[5px] text-[10.5px] font-extrabold",
                  i === 0 ? "bg-go-fill text-on-go" : "bg-surface-3 text-mute",
                )}
              >
                {answered + i + 2}
              </span>
              <Thumb
                src={t.imageUrl}
                alt=""
                rounded="rounded-[6px]"
                className="mt-0.5 size-9"
              />
              <span className="min-w-0 flex-1">
                <span className="line-clamp-2 text-[12.5px] leading-snug font-semibold text-ink-2 group-hover/q:text-ink">
                  {t.question}
                </span>
                <span className="mt-0.5 flex items-center gap-1.5">
                  <span className="text-[11px] font-semibold text-mute capitalize">
                    {t.categorySlug}
                  </span>
                  {t.scopeCountry ? <Flag code={t.scopeCountry} /> : null}
                </span>
              </span>
              <CaretRight
                weight="bold"
                className="mt-1.5 size-3.5 shrink-0 text-mute opacity-0 transition-opacity group-hover/q:opacity-100"
              />
            </Button>
          </li>
        ))}
        {queue.length === 0 ? (
          <li className="px-2 py-2 text-[12.5px] text-mute">
            Nothing queued — the crawler runs every six hours.
          </li>
        ) : null}
      </ul>
    </div>
  );
}
