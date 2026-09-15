import { SidebarSimple } from "@phosphor-icons/react";

import { cn } from "../../lib/cn";
import { Button } from "../../ui/Button";

/**
 * Putting a rail away, from inside the rail.
 *
 * It lives in the rail's own header rather than on the frame, next to the
 * heading it belongs to, because a control for one column that floats between
 * two of them belongs to neither. The way *back* is not here — a docked rail
 * keeps its column and the frosted glass over it is the button, so the
 * control never vanishes with the thing it controls.
 */
export function RailToggle({
  side,
  label,
  onToggle,
}: {
  side: "left" | "right";
  label: string;
  onToggle: () => void;
}) {
  return (
    <Button
      bare
      aria-label={`Hide ${label}`}
      title={`Hide ${label}`}
      onClick={onToggle}
      className="lift grid size-6 shrink-0 place-items-center rounded-[7px] text-mute hover:bg-surface-3 hover:text-ink"
    >
      <SidebarSimple
        weight="bold"
        className={cn("size-[15px]", side === "right" && "scale-x-[-1]")}
      />
    </Button>
  );
}
