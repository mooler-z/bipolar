import { ArrowBendUpLeft, Heart, Trash } from "@phosphor-icons/react";

import type { Id } from "../../../convex/_generated/dataModel";
import { cn } from "../../lib/cn";
import { fmtInt } from "../../lib/format";
import { ago } from "../../lib/motion";
import { Avatar } from "../../ui/Avatar";
import { Button } from "../../ui/Button";
import { Said } from "./Said";

/**
 * One comment, the way a comment section does it.
 *
 * Avatar on the left, the name and the time on one line, the words under them,
 * and a quiet row of acts under those. Replies are indented to sit under the
 * line they answer and nothing else marks them — no rule to align, no bubble,
 * no sides. Everything reads down one column, which is what makes a long
 * argument scannable and what three earlier attempts kept trading away.
 *
 * What was tried and dropped, so it is not tried again: a coloured left edge
 * (it fought the reply indent for the same pixels), a tinted row for your own
 * lines (it striped the thread), and chat bubbles on opposite sides (this is a
 * comment section, not a conversation between two people).
 *
 * The acts stay quiet until the pointer is on the comment, except a like that
 * somebody has actually used — a count nobody can see is a count nobody joins.
 *
 * A name somebody wrote with an `@` is lit, using the same matcher the server
 * used to decide whose bell to ring — so a lit name is a name that was told.
 */

export type CommentRow = {
  _id: Id<"comments">;
  at: number;
  author: string;
  body: string | null;
  parentId: Id<"comments"> | null;
  depth: number;
  likes: number;
  liked: boolean;
  mine: boolean;
  canRemove: boolean;
};

export function Message({
  row,
  now,
  people = [],
  replying = false,
  onLike,
  onReply,
  onRemove,
}: {
  row: CommentRow;
  now: number;
  /** Who this thread can name, so the names written here can be lit. */
  people?: string[];
  /** The composer is pointed at this comment. */
  replying?: boolean;
  onLike: () => void;
  onReply: () => void;
  onRemove: () => void;
}) {
  const gone = row.body === null;
  const reply = row.depth > 0;

  return (
    <li
      data-cid={row._id}
      className={cn(
        "group/msg slide-up flex gap-2.5 rounded-[10px] px-2 py-2 transition-colors duration-150",
        // A reply sits under the line it answers. That is the whole marking.
        reply && "ml-9",
        replying ? "bg-coin-fill/[0.09]" : "hover:bg-surface-2",
      )}
    >
      <Avatar
        name={row.author}
        className={cn("shrink-0", reply ? "size-6 text-[11px]" : "size-7 text-[12px]")}
      />

      <div className="min-w-0 flex-1">
        <p className="flex items-baseline gap-1.5">
          <span className="truncate text-[12.5px] font-bold text-ink">{row.author}</span>
          {row.mine ? (
            <span className="shrink-0 text-[10px] font-extrabold tracking-[0.06em] text-mute uppercase">
              you
            </span>
          ) : null}
          <span className="num shrink-0 text-[11px] text-mute">{ago(row.at, now)}</span>
        </p>

        {gone ? (
          <p className="mt-0.5 text-[13.5px] text-mute italic">Removed.</p>
        ) : (
          <>
            <p className="mt-0.5 text-[14px] leading-snug break-words whitespace-pre-wrap text-ink-2">
              <Said text={row.body!} people={people} />
            </p>

            <p className="mt-1 -ml-1 flex items-center gap-1">
              <Button
                bare
                aria-label={row.liked ? "Take the like back" : "Like"}
                title={row.liked ? "Take the like back" : "Like"}
                onClick={onLike}
                className={cn(
                  "flex min-h-6 items-center gap-1 rounded-[6px] px-1.5 text-[11.5px] font-bold",
                  "transition-[color,opacity] duration-150 hover:text-love",
                  row.liked ? "text-love" : "text-mute",
                  // A like somebody has used is always on screen; an empty one
                  // waits for the pointer, like the rest of the acts.
                  row.likes === 0 &&
                    "opacity-0 group-hover/msg:opacity-100 focus-visible:opacity-100",
                )}
              >
                <Heart weight={row.liked ? "fill" : "regular"} className={cn("size-3.5", row.liked && "pop-in")} />
                {row.likes > 0 ? <span className="num">{fmtInt(row.likes)}</span> : null}
              </Button>

              <Button
                bare
                aria-label={replying ? "Stop replying to this comment" : "Reply"}
                title={replying ? "Answering the question instead" : "Reply — one quill"}
                onClick={onReply}
                className={cn(
                  "flex min-h-6 items-center gap-1 rounded-[6px] px-1.5 text-[11.5px] font-bold",
                  "transition-[color,opacity] duration-150 hover:text-coin",
                  replying ? "text-coin opacity-100" : "text-mute",
                  !replying &&
                    "opacity-0 group-hover/msg:opacity-100 focus-visible:opacity-100",
                )}
              >
                <ArrowBendUpLeft weight="bold" className="size-3.5" />
                {replying ? "Replying" : "Reply"}
              </Button>

              {row.canRemove ? (
                <Button
                  bare
                  aria-label="Remove comment"
                  title="Remove"
                  onClick={onRemove}
                  className={cn(
                    "grid size-6 place-items-center rounded-[6px] text-mute",
                    "opacity-0 transition-[color,opacity] duration-150 hover:text-love",
                    "group-hover/msg:opacity-100 focus-visible:opacity-100",
                  )}
                >
                  <Trash className="size-3.5" />
                </Button>
              ) : null}
            </p>
          </>
        )}
      </div>
    </li>
  );
}
