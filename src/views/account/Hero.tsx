import { useState } from "react";

import type { Side } from "../../lib/format";
import { Arena } from "../../components/Arena";

/**
 * The arena, on the door.
 *
 * The one control the product is made of, shown before a stranger has seen a
 * single question. It is the real thing — it tilts, it takes the board —
 * with nothing under it, and the line beneath says what signing in changes.
 *
 * It reports which card the cursor is over, because on this page the ground
 * behind the whole door answers it, exactly as the ground behind a question
 * does. That is the demonstration: the room takes a side before you do, and a
 * stranger finds that out by moving a mouse.
 */
export function Hero({
  className,
  onLean,
}: {
  className?: string;
  onLean?: (lean: { side: Side | null; pressed: boolean }) => void;
}) {
  const [said, setSaid] = useState<string | null>(null);
  return (
    <div className={className}>
      <Arena
        armed={false}
        busy={false}
        onPick={(side) => setSaid(side)}
        onLean={(side, pressed = false) => onLean?.({ side, pressed })}
        className="h-[clamp(11rem,24vh,16rem)]"
      />
      <p className="label mt-3 block min-h-5" aria-live="polite">
        {said
          ? `You would have said ${said}. Sign in and the room hears it.`
          : "Try it. Nothing counts until you sign in."}
      </p>
    </div>
  );
}
