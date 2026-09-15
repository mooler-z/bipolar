import { useEffect, useMemo, useRef, useState } from "react";
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
 * The **order is the server's**: parents oldest first, each followed by its
 * own replies. A client cannot work that out from a page of a flat list
 * without knowing where the page ends, and a reply whose parent fell off the
 * end would be an orphan on screen.
 *
 * The roster of who can be named comes from the server, not from the rows on
 * screen: the thread is paged, and a picker that could only offer the people
 * still visible would silently forget whoever scrolled off the top.
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
  seed,
  onSeeded,
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
  /** A name to start the composer with — somebody answered from the live rail. */
  seed?: string | null;
  onSeeded?: () => void;
  /** Where the question is, when it is not on screen. */
  onTopic?: () => void;
  /** Raised while there is unsent text, so the feed does not advance over it. */
  onComposing?: (composing: boolean) => void;
  className?: string;
}) {
  const rows = useQuery(api.commentThread.list, { slug, limit: 60 });
  const roster = useQuery(api.commentThread.people, signedIn ? { slug } : "skip");
  const post = useMutation(api.comments.post);
  const like = useMutation(api.comments.like);
  const remove = useMutation(api.comments.remove);
  const now = useNow(15_000);
  /** The line the composer is pointed at, if any. */
  const [replyTo, setReplyTo] = useState<Id<"comments"> | null>(null);

  const list = useRef<HTMLUListElement | null>(null);
  const stuck = useRef(true);
  const first = useRef(true);
  const [error, setError] = useState("");

  const ordered = rows;
  const people = useMemo(() => (roster ?? []).map((p) => p.name), [roster]);
  const count = rows?.length ?? 0;
  const answering = ordered?.find((r) => r._id === replyTo) ?? null;

  /* The newest line is the newest by **time**, not the last in the list.
     In thread order a reply lands under its parent, which can be anywhere —
     so the last row is the last reply of the last parent, and following it
     would scroll to the wrong place, or to nowhere at all. */
  const newest = rows?.reduce(
    (latest, row) => (latest === undefined || row.at > latest.at ? row : latest),
    undefined as (typeof rows)[number] | undefined,
  );

  /* Follow the thread only from the bottom, or when the new line is mine —
     somebody scrolled up reading is never yanked away from what they were
     reading. A reply is scrolled *to* rather than scrolled past: it sits
     under its parent, and the bottom of the list is not where it is. */
  useEffect(() => {
    const el = list.current;
    if (!el || count === 0 || !newest) return;
    const follow = stuck.current || newest.mine;
    if (!follow) {
      first.current = false;
      return;
    }
    const behavior = first.current ? "auto" : "smooth";
    const line =
      newest.depth > 0
        ? el.querySelector<HTMLElement>(`[data-cid="${newest._id}"]`)
        : null;
    if (line) line.scrollIntoView({ behavior, block: "nearest" });
    else el.scrollTo({ top: el.scrollHeight, behavior });
    first.current = false;
  }, [newest?._id, newest?.mine, newest?.depth, count]);

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
      await post({ topicId, body, parentId: replyTo ?? undefined });
      setReplyTo(null);
      return true;
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
      return false;
    }
  }

  function toggleLike(commentId: Id<"comments">) {
    setError("");
    void like({ commentId }).catch((e: unknown) =>
      setError(e instanceof Error ? e.message : String(e)),
    );
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
        className="col-scroll flex flex-1 flex-col p-2"
      >
        {/* Pushes a short thread down to the composer; collapses to nothing
            once the thread is long enough to scroll. */}
        <li aria-hidden className="mt-auto" />

        {ordered === undefined ? (
          Array.from({ length: 3 }, (_, i) => (
            <li key={i} className={cn("flex gap-2.5 px-2 py-2", i === 1 && "ml-9")}>
              <span className="shimmer size-7 shrink-0 rounded-full" />
              <span className="shimmer h-11 flex-1 rounded-[8px]" />
            </li>
          ))
        ) : ordered.length === 0 ? (
          <li className="px-3 py-4 text-[13px] leading-snug text-mute">
            Nobody has said anything yet. The first line sets the tone.
          </li>
        ) : (
          ordered.map((row) => (
            <Message
              key={row._id}
              row={row}
              now={now}
              people={people}
              replying={replyTo === row._id}
              onLike={() => toggleLike(row._id)}
              onReply={() => setReplyTo((was) => (was === row._id ? null : row._id))}
              onRemove={() => void remove({ commentId: row._id })}
            />
          ))
        )}
      </ul>

      <Composer
        signedIn={signedIn}
        quills={quills}
        error={error}
        answering={answering ? { author: answering.author, body: answering.body } : null}
        people={people}
        seed={seed}
        onSeeded={onSeeded}
        onCancelReply={() => setReplyTo(null)}
        onSend={send}
        onComposing={onComposing}
      />
    </section>
  );
}
