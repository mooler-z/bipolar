import { useQuery } from "convex/react";
import { Fire, Lightning, Target, TrendUp } from "@phosphor-icons/react";

import { api } from "../../../convex/_generated/api";
import { cn } from "../../lib/cn";
import { fmtInt, rankOf } from "../../lib/format";
import { useIncreased } from "../../lib/motion";
import { Button } from "../../ui/Button";
import { Tile } from "../../ui/Tile";
import { Queue, type QueueItem } from "./Queue";

export type { QueueItem };

/**
 * The left column: the run you are on.
 *
 * Three facts that only mean something in sequence — how far you are, what
 * your record is, and what is still queued. The record is four Duolingo tiles
 * because that is the shape a person recognises as *theirs*: the streak they
 * would hate to lose, the accuracy they would like to raise, the sparks they
 * can spend, the rank they are climbing.
 */
export function RunRail({
  answered,
  remaining,
  queue,
  onAccount,
  onOpen,
}: {
  answered: number;
  remaining: number;
  queue: QueueItem[];
  onAccount: () => void;
  onOpen: (slug: string) => void;
}) {
  const me = useQuery(api.users.me);
  const calls = useQuery(api.calls.me);
  const extended = useIncreased(calls?.streak ?? 0);
  const total = answered + remaining;
  const done = total === 0 ? 0 : Math.round((answered / total) * 100);
  const streak = calls?.streak ?? 0;
  const ranked = !!calls && calls.made >= 5;

  return (
    <aside className="rail flex h-full min-h-0 flex-col gap-4 p-4 xl:border-r xl:border-line">
      {/* How far in. A bar that only ever moves forward. */}
      <div>
        <div className="flex items-baseline justify-between px-1">
          <h2 className="text-[12px] font-extrabold tracking-[0.06em] text-ink-3 uppercase">
            Your run
          </h2>
          <span className="num text-[12px] font-extrabold text-ink-2">
            {answered}
            <span className="text-mute">/{total}</span>
          </span>
        </div>
        <div className="bar mt-2">
          <span className="bar-fill" style={{ width: `${Math.max(done, 3)}%` }} />
        </div>
      </div>

      {me ? (
        <div className="grid grid-cols-2 gap-2">
          <Tile
            icon={<Fire weight="fill" className={cn("size-3.5", streak > 0 && "flicker")} />}
            value={streak}
            label="Streak"
            tone={streak > 0 ? "streak" : "mute"}
            bump={extended}
            delay={0}
          />
          <Tile
            icon={<Target weight="fill" className="size-3.5" />}
            value={ranked ? `${calls.accuracy}%` : "—"}
            label="Accuracy"
            hint={ranked ? undefined : `${calls?.made ?? 0}/5 calls to rank`}
            tone={ranked ? "go" : "mute"}
            delay={70}
          />
          <Tile
            icon={<Lightning weight="fill" className="size-3.5" />}
            value={<span key={me.sparks} className="flash inline-block">{me.sparks}</span>}
            label="Sparks"
            hint="get more"
            tone="coin"
            onClick={onAccount}
            delay={140}
          />
          <Tile
            icon={<TrendUp weight="bold" className="size-3.5" />}
            value={rankOf(me.topicsBacked).title}
            label="Rank"
            hint={`${fmtInt(me.topicsBacked)} backed`}
            tone="hate"
            delay={210}
          />
        </div>
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
