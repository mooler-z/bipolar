import { useQuery } from "convex/react";

import { api } from "../../../convex/_generated/api";
import { fmtInt } from "../../lib/format";
import { useIncreased } from "../../lib/motion";
import { Button } from "../../ui/Button";
import { RailToggle } from "./RailToggle";
import { Queue, type QueueItem } from "./Queue";
import { Record } from "./Record";

export type { QueueItem };

/**
 * The left column: the run you are on.
 *
 * Three things that only mean something in sequence — how far you are, what
 * your record is, and what is still queued. Each is drawn at the weight it
 * deserves: the progress is a line, the record is a card, the queue is a list.
 */
export function RunRail({
  answered,
  remaining,
  queue,
  onAccount,
  onOpen,
  onHide,
}: {
  answered: number;
  remaining: number;
  queue: QueueItem[];
  onAccount: () => void;
  onOpen: (slug: string) => void;
  /** Put this rail away. Absent where there is nothing to dock. */
  onHide?: () => void;
}) {
  const me = useQuery(api.users.me);
  const calls = useQuery(api.calls.me);
  const extended = useIncreased(calls?.streak ?? 0);
  const total = answered + remaining;
  const done = total === 0 ? 0 : Math.round((answered / total) * 100);
  const streak = calls?.streak ?? 0;

  return (
    <aside className="rail flex h-full min-h-0 flex-col gap-4 p-4 xl:border-r xl:border-line">
      {/* How far in. A bar that only ever moves forward — and shows nothing
          at all at zero, where a three-percent nub used to sit looking like a
          rendering fault rather than a start. */}
      <div>
        <div className="flex items-baseline gap-2 px-0.5">
          <h2 className="text-[11px] font-extrabold tracking-[0.1em] text-mute uppercase">
            Your run
          </h2>
          <span className="flex-1" />
          {onHide ? <RailToggle side="left" label="your run" onToggle={onHide} /> : null}
          <span className="num text-[13px] font-extrabold text-ink">
            {fmtInt(answered)}
          </span>
          <span className="num text-[11.5px] text-mute">of {fmtInt(total)}</span>
        </div>
        <div className="bar mt-1.5 h-1.5">
          {answered > 0 ? (
            <span className="bar-fill" style={{ width: `${done}%` }} />
          ) : null}
        </div>
      </div>

      {me ? (
        <Record
          streak={streak}
          bestStreak={calls?.bestStreak ?? 0}
          made={Math.min(calls?.made ?? 0, 5)}
          accuracy={calls?.accuracy ?? 0}
          sparks={me.sparks}
          backed={me.topicsBacked}
          bumped={extended}
          onGetSparks={onAccount}
        />
      ) : (
        <div className="tile tile-in border-go-fill/40">
          <p className="text-[13.5px] leading-snug font-semibold">
            Sign in to keep a streak, back a topic, and be counted.
          </p>
          <Button variant="go" size="sm" onClick={onAccount} className="mt-3 w-full">
            Sign in — sparks on the house
          </Button>
        </div>
      )}

      <Queue answered={answered} remaining={remaining} queue={queue} onOpen={onOpen} />
    </aside>
  );
}
