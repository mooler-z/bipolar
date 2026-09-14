import { useEffect, useRef, useState } from "react";
import { useMutation, useQuery } from "convex/react";
import { ArrowUp, ChatCircle } from "@phosphor-icons/react";

import { api } from "../../../convex/_generated/api";
import type { Id } from "../../../convex/_generated/dataModel";
import { cn } from "../../lib/cn";
import { useNow } from "../../lib/motion";
import { Button } from "../../ui/Button";
import { Composer } from "./Composer";
import { Message } from "./Message";

/**
 * Trash talk, live, as a chat.
 *
 * `useQuery` is a subscription, so a line somebody types appears on every open
 * screen the moment their mutation commits — no socket, no polling, nothing in
 * this file aware it is happening. That is the backend being Convex, not this
 * component being clever.
 *
 * The thread reads oldest to newest with the composer pinned under it, the
 * way every chat does, and it follows the newest line only while the reader
 * is already at the bottom — somebody scrolled up reading is never yanked
 * away from what they were reading, unless the new line is their own.
 *
 * It is not behind the stats gate: talk is opinion, not the score, and
 * reading the room is most of what makes somebody want to fight.
 *
 * The question sits at the head of it. On a phone the thread fills the screen
 * and the question it belongs to is a swipe away, so a composer with nothing
 * above it is a box asking you to argue about you-cannot-remember-what; on a
 * desktop the same strip says which topic the rail is following after a row
 * in `Live` has swapped it.
 */
export function Comments({
  slug,
  topicId,
  quills,
  signedIn,
  question,
  onTopic,
  onComposing,
  className,
}: {
  slug: string;
  topicId: Id<"topics">;
  quills: number;
  signedIn: boolean;
  /** What is being argued about, shown at the head of the thread. */
  question?: string;
  /** Where the question is, when it is not on screen. */
  onTopic?: () => void;
  /** Raised while there is unsent text, so the feed does not advance over it. */
  onComposing?: (composing: boolean) => void;
  className?: string;
}) {
  const rows = useQuery(api.comments.list, { slug, limit: 50 });
  const post = useMutation(api.comments.post);
  const remove = useMutation(api.comments.remove);
  const now = useNow(15_000);

  const list = useRef<HTMLUListElement | null>(null);
  const stuck = useRef(true);
  const first = useRef(true);
  const [error, setError] = useState("");

  const newest = rows?.[0];
  const count = rows?.length ?? 0;
  const ordered = rows ? [...rows].reverse() : undefined;

  // Follow the thread only from the bottom, or when the new line is mine.
  useEffect(() => {
    const el = list.current;
    if (!el || count === 0) return;
    if (stuck.current || newest?.mine) {
      el.scrollTo({
        top: el.scrollHeight,
        behavior: first.current ? "auto" : "smooth",
      });
    }
    first.current = false;
  }, [newest?._id, newest?.mine, count]);

  // Leaving the tab with a draft must not leave the console paused for good.
  const composing = useRef(onComposing);
  composing.current = onComposing;
  useEffect(() => () => composing.current?.(false), []);

  function onScroll() {
    const el = list.current;
    if (!el) return;
    stuck.current = el.scrollHeight - el.scrollTop - el.clientHeight < 80;
  }

  async function send(body: string): Promise<boolean> {
    setError("");
    try {
      await post({ topicId, body });
      return true;
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
      return false;
    }
  }

  /* What is being argued about. On a phone the thread fills the screen and
     the question is a swipe away, so a composer with nothing above it asks
     you to argue about you-cannot-remember-what; on a desktop it says which
     topic the rail is following after a row in `Live` swapped it. */
  const head = question ? (
    <span className="flex w-full items-start gap-2 text-left">
      <ChatCircle weight="fill" className="mt-0.5 size-3.5 shrink-0 text-mute" />
      <span className="min-w-0 flex-1">
        <span className="label block">Arguing about</span>
        <span className="line-clamp-2 text-[12.5px] leading-snug font-bold text-ink">
          {question}
        </span>
      </span>
      {onTopic ? (
        <ArrowUp weight="bold" className="mt-0.5 size-3.5 shrink-0 text-mute xl:hidden" />
      ) : null}
    </span>
  ) : null;

  return (
    <section className={cn("flex min-h-0 flex-col", className)}>
      {head ? (
        onTopic ? (
          <Button
            bare
            onClick={onTopic}
            aria-label="Back to the question"
            className="shrink-0 border-b border-line bg-surface-2 px-3 py-2 transition-colors hover:bg-surface-3"
          >
            {head}
          </Button>
        ) : (
          <div className="shrink-0 border-b border-line bg-surface-2 px-3 py-2">{head}</div>
        )
      ) : null}

      <ul
        ref={list}
        onScroll={onScroll}
        aria-live="polite"
        className="col-scroll flex flex-1 flex-col gap-0.5 p-2"
      >
        {/* Pushes a short thread down to the composer; collapses to nothing
            once the thread is long enough to scroll. */}
        <li aria-hidden className="mt-auto" />

        {ordered === undefined ? (
          Array.from({ length: 3 }, (_, i) => (
            <li key={i} className="flex gap-2.5 px-2 py-2">
              <span className="shimmer size-7 shrink-0 rounded-full" />
              <span className="shimmer h-9 flex-1 rounded-[8px]" />
            </li>
          ))
        ) : ordered.length === 0 ? (
          <li className="px-3 py-3 text-[13px] leading-snug text-mute">
            Nobody has said anything yet. The first line sets the tone.
          </li>
        ) : (
          ordered.map((row) => (
            <Message
              key={row._id}
              row={row}
              now={now}
              onRemove={() => void remove({ commentId: row._id })}
            />
          ))
        )}
      </ul>

      <Composer
        signedIn={signedIn}
        quills={quills}
        error={error}
        onSend={send}
        onComposing={onComposing}
      />
    </section>
  );
}
