import { At } from "@phosphor-icons/react";

import { cn } from "../../lib/cn";
import { Avatar } from "../../ui/Avatar";
import { Button } from "../../ui/Button";

/**
 * The room, while you are naming somebody in it.
 *
 * It hangs **above** the field rather than below it: the composer is already
 * pinned to the bottom of the rail, so a list under it would open off the
 * screen. Faces as well as names, because the thread above is full of the same
 * avatars and matching one is faster than reading.
 */
export function MentionPicker({
  options,
  index,
  onPick,
  onHover,
}: {
  options: string[];
  index: number;
  onPick: (name: string) => void;
  onHover: (i: number) => void;
}) {
  return (
    <ul
      role="listbox"
      aria-label="People in this thread"
      className="slide-up absolute right-0 bottom-full left-0 z-30 mb-1.5 overflow-hidden rounded-[var(--r-btn)] border border-line-2 bg-surface-2 py-1 shadow-[0_-8px_24px_rgba(0,0,0,0.35)]"
    >
      <li className="flex items-center gap-1.5 px-2.5 pt-0.5 pb-1">
        <At weight="bold" className="size-3 shrink-0 text-mute" />
        <span className="label">in this thread</span>
      </li>
      {options.map((name, i) => (
        <li key={name} role="option" aria-selected={i === index}>
          <Button
            bare
            onMouseEnter={() => onHover(i)}
            onClick={() => onPick(name)}
            className={cn(
              "flex w-full items-center gap-2 px-2.5 py-1.5 text-left transition-colors",
              i === index ? "bg-surface-4" : "hover:bg-surface-3",
            )}
          >
            <Avatar name={name} className="size-5 shrink-0 text-[10px]" />
            <span className="min-w-0 flex-1 truncate text-[12.5px] font-bold text-ink">
              {name}
            </span>
          </Button>
        </li>
      ))}
    </ul>
  );
}
