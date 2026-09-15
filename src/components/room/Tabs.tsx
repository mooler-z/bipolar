import type { ReactNode } from "react";
import { ChatCircle, Crown } from "@phosphor-icons/react";

import { cn } from "../../lib/cn";
import { fmtInt } from "../../lib/format";
import { Button } from "../../ui/Button";
import { OpenAI } from "../../ui/OpenAI";
import { RailToggle } from "../run/RailToggle";

/**
 * The room's three faces, as one segmented control.
 *
 * A track with three keys in it rather than three underlined words: the
 * active one sits up on the surface with a green edge under it. `Live` carries a
 * breathing dot because it is, `Talk` carries the count because that is the
 * number somebody is deciding whether to open.
 *
 * While the rail is sweeping between `Live` and `Boards` on its own, the
 * active key's underline drains — so the swap is something a reader sees
 * coming rather than a panel changing under them for no visible reason.
 */

export type RoomTab = "live" | "talk" | "boards" | "ask";

function Segment({
  active,
  sweeping = false,
  onClick,
  children,
}: {
  active: boolean;
  /** The rail put this face up on a timer rather than a reader choosing it. */
  sweeping?: boolean;
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
        "relative flex min-h-10 flex-1 items-center justify-center gap-1.5 overflow-hidden rounded-[9px]",
        "text-[12px] font-bold transition-colors duration-150",
        active
          ? "bg-surface-4 text-ink"
          : "text-mute hover:bg-surface-3/70 hover:text-ink-3",
      )}
    >
      {children}
      {/* The underline drains while the rail is sweeping, so the swap is
          something a reader sees coming rather than a panel changing under
          them for no visible reason. */}
      <span
        aria-hidden
        className={cn(
          "absolute inset-x-2.5 bottom-0 h-[3px] overflow-hidden rounded-full transition-colors duration-150",
          active ? "bg-go-fill" : "bg-transparent",
        )}
      >
        {active && sweeping ? (
          <span className="rail-drain block h-full w-full bg-surface-4" />
        ) : null}
      </span>
    </Button>
  );
}

export function Tabs({
  tab,
  onTab,
  commentCount,
  onHide,
  rotating = false,
  canAsk = false,
}: {
  tab: RoomTab;
  onTab: (t: RoomTab) => void;
  commentCount: number;
  /** Put this rail away. Absent where there is nothing to dock. */
  onHide?: () => void;
  /** The rail is cycling on its own, so the active key says so. */
  rotating?: boolean;
  /** There is a model key, so the fourth face is worth offering. */
  canAsk?: boolean;
}) {
  return (
    <div
      role="tablist"
      aria-label="The room"
      className="flex shrink-0 gap-0.5 border-b border-line bg-surface-2 p-1"
    >
      <Segment active={tab === "live"} sweeping={rotating} onClick={() => onTab("live")}>
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
      <Segment active={tab === "boards"} sweeping={rotating} onClick={() => onTab("boards")}>
        <Crown weight={tab === "boards" ? "fill" : "regular"} className="size-3.5" />
        Boards
      </Segment>
      {canAsk ? (
        <Segment active={tab === "ask"} onClick={() => onTab("ask")}>
          {/* The band of light, so the one new thing in the rail is the one
              thing a first-time reader notices without being told. */}
          {tab === "ask" ? null : (
            <span
              aria-hidden
              className="sheen pointer-events-none absolute inset-y-0 -left-1/2 w-1/2 bg-go-fill/25"
            />
          )}
          <OpenAI
            className={cn("relative size-3.5", tab === "ask" ? "text-go" : "text-go/80")}
          />
          <span className="relative">AI</span>
        </Segment>
      ) : null}
      {onHide ? (
        <span className="flex items-center pl-0.5">
          <RailToggle side="right" label="the room" onToggle={onHide} />
        </span>
      ) : null}
    </div>
  );
}
