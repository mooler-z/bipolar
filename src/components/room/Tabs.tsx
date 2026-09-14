import type { ReactNode } from "react";
import { ChatCircle, Crown } from "@phosphor-icons/react";

import { cn } from "../../lib/cn";
import { fmtInt } from "../../lib/format";
import { Button } from "../../ui/Button";

/**
 * The room's three faces, as one segmented control.
 *
 * A track with three keys in it rather than three underlined words: the
 * active one sits up on the surface with a green edge under it. `Live` carries a
 * breathing dot because it is, `Talk` carries the count because that is the
 * number somebody is deciding whether to open.
 */

export type RoomTab = "live" | "talk" | "boards";

function Segment({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: ReactNode;
}) {
  return (
    <Button
      bare
      role="tab"
      aria-selected={active}
      onClick={onClick}
      className={cn(
        "relative flex min-h-10 flex-1 items-center justify-center gap-1.5 rounded-[9px]",
        "text-[12.5px] font-bold transition-colors duration-150",
        active
          ? "bg-surface-4 text-ink"
          : "text-mute hover:bg-surface-3/70 hover:text-ink-3",
      )}
    >
      {children}
      <span
        aria-hidden
        className={cn(
          "absolute inset-x-2.5 bottom-0 h-[3px] rounded-full transition-colors duration-150",
          active ? "bg-go-fill" : "bg-transparent",
        )}
      />
    </Button>
  );
}

export function Tabs({
  tab,
  onTab,
  commentCount,
}: {
  tab: RoomTab;
  onTab: (t: RoomTab) => void;
  commentCount: number;
}) {
  return (
    <div
      role="tablist"
      aria-label="The room"
      className="flex shrink-0 gap-1 border-b border-line bg-surface-2 p-1"
    >
      <Segment active={tab === "live"} onClick={() => onTab("live")}>
        <span aria-hidden className="pulse-dot size-1.5 rounded-full bg-go-fill" />
        Live
      </Segment>
      <Segment active={tab === "talk"} onClick={() => onTab("talk")}>
        <ChatCircle weight={tab === "talk" ? "fill" : "regular"} className="size-3.5" />
        Talk
        {commentCount > 0 ? (
          <span className="num text-[11px] font-bold text-mute">
            {fmtInt(commentCount)}
          </span>
        ) : null}
      </Segment>
      <Segment active={tab === "boards"} onClick={() => onTab("boards")}>
        <Crown weight={tab === "boards" ? "fill" : "regular"} className="size-3.5" />
        Boards
      </Segment>
    </div>
  );
}
