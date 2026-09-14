import { Trash } from "@phosphor-icons/react";

import type { Id } from "../../../convex/_generated/dataModel";
import { cn } from "../../lib/cn";
import { ago } from "../../lib/motion";
import { Avatar } from "../../ui/Avatar";
import { Button } from "../../ui/Button";

/**
 * One line of the argument.
 *
 * A coloured disc so the same voice is the same colour every time, the name,
 * how long ago, the words. Your own lines carry a love-red edge so you can
 * find yourself in a thread at a glance. A removed line keeps its place —
 * the row survives the words, because the quill it spent is still spent.
 */

export type CommentRow = {
  _id: Id<"comments">;
  at: number;
  author: string;
  body: string | null;
  mine: boolean;
  canRemove: boolean;
};

export function Message({
  row,
  now,
  delay = 0,
  onRemove,
}: {
  row: CommentRow;
  now: number;
  delay?: number;
  onRemove: () => void;
}) {
  return (
    <li
      className={cn(
        "group/msg slide-up flex gap-2.5 rounded-r-[10px] border-l-[3px] py-2 pr-2 pl-2.5",
        "transition-colors duration-150 hover:bg-surface-2",
        row.mine ? "border-l-love bg-love-fill/8" : "border-l-transparent",
      )}
      style={{ animationDelay: `${delay}ms` }}
    >
      <Avatar name={row.author} className="mt-0.5 size-7 text-[12px]" />
      <div className="min-w-0 flex-1">
        <p className="flex min-h-6 items-center gap-2">
          <span className="truncate text-[12.5px] font-bold text-ink">
            {row.author}
            {row.mine ? <span className="font-semibold text-mute"> · you</span> : null}
          </span>
          <span className="num shrink-0 text-[11px] text-mute">{ago(row.at, now)}</span>
          <span className="flex-1" />
          {row.canRemove ? (
            <Button
              bare
              aria-label="Remove comment"
              title="Remove"
              onClick={onRemove}
              className={cn(
                "grid size-7 shrink-0 place-items-center rounded-[6px] text-mute",
                "opacity-0 transition-[opacity,color,background-color] duration-150",
                "group-hover/msg:opacity-100 hover:bg-love-fill/15 hover:text-love focus-visible:opacity-100",
              )}
            >
              <Trash className="size-3.5" />
            </Button>
          ) : null}
        </p>
        {row.body === null ? (
          <p className="text-[13.5px] text-mute italic">Removed.</p>
        ) : (
          <p className="text-[14px] leading-snug break-words whitespace-pre-wrap text-ink-2">
            {row.body}
          </p>
        )}
      </div>
    </li>
  );
}
