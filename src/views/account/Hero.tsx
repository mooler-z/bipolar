import { useState } from "react";

import { Arena } from "../../components/Arena";

/**
 * The arena, on the door.
 *
 * The one control the product is made of, shown before a stranger has seen a
 * single question. It is the real thing — it tilts, it takes the board —
 * with nothing under it, and the line beneath says what signing in changes.
 */
export function Hero({ className }: { className?: string }) {
  const [said, setSaid] = useState<string | null>(null);
  return (
    <div className={className}>
      <Arena
        armed={false}
        busy={false}
        onPick={(side) => setSaid(side)}
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
