import { useQuery } from "convex/react";
import {
  CaretRight,
  Fire,
  Lightning,
  Target,
  TrendUp,
} from "@phosphor-icons/react";

import { api } from "../../convex/_generated/api";
import { cn } from "../lib/cn";
import { fmtInt, rankOf } from "../lib/format";
import { useIncreased } from "../lib/motion";
import { Button } from "../ui/Button";
import { Flag } from "../ui/Flag";
import { Thumb } from "../ui/Thumb";
import { Label } from "../ui/Label";

/**
 * The left column: the run you are on.
 *
 * Three facts that only mean something in sequence — how far you are, how many
 * calls you have read right in a row, and what is still queued. The queue is
 * the point: an open list of questions you have not answered is a far stronger
 * reason to answer one more than any button could be.
 */

function Stat({
  icon,
  value,
  label,
  tone,
  bump = false,
}: {
  icon: React.ReactNode;
  value: string;
  label: string;
  tone?: string;
  bump?: boolean;
}) {
  return (
    <div className="flex items-center gap-2.5 rounded-[var(--r-btn)] bg-surface-2 px-3 py-2.5">
      <span className={cn("shrink-0", tone ?? "text-mute")}>{icon}</span>
      <span className="min-w-0">
        <span
          className={cn(
            "num block text-[17px] leading-tight font-bold",
            tone,
            bump && "pop-in",
          )}
        >
          {value}
        </span>
        <Label>{label}</Label>
      </span>
    </div>
  );
}

export type QueueItem = {
  _id: string;
  slug: string;
  question: string;
  categorySlug: string;
  scopeCountry?: string;
  imageUrl?: string;
};

export function RunRail({
  answered,
  remaining,
  queue,
  onAccount,
}: {
  answered: number;
  remaining: number;
  queue: QueueItem[];
  onAccount: () => void;
}) {
  const me = useQuery(api.users.me);
  const calls = useQuery(api.calls.me);
  const extended = useIncreased(calls?.streak ?? 0);
  const total = answered + remaining;
  const done = total === 0 ? 0 : Math.round((answered / total) * 100);
  const rank = me ? rankOf(me.topicsBacked) : null;

  return (
    <aside className="rail flex h-full min-h-0 flex-col gap-4 border-r border-line p-4">
      {/* How far in. A bar that only ever moves forward. */}
      <div>
        <div className="flex items-baseline justify-between">
          <h2 className="text-[13px] font-bold">This run</h2>
          <span className="num text-[12px] font-bold text-mute">
            {answered}/{total}
          </span>
        </div>
        <div className="mt-2 h-2.5 overflow-hidden rounded-[var(--r-pill)] bg-surface-3">
          <span
            className="block h-full rounded-[var(--r-pill)] bg-go transition-[width] duration-700 ease-out"
            style={{ width: `${Math.max(done, 2)}%` }}
          />
        </div>
        {rank ? (
          <p className="mt-2 flex items-center gap-1.5 text-[12px] text-mute">
            <TrendUp className="size-3.5" />
            {rank.title} · {fmtInt(me?.topicsBacked ?? 0)} backed
          </p>
        ) : null}
      </div>

      <div className="grid gap-2">
        <Stat
          icon={<Fire weight="fill" className={cn("size-5", (calls?.streak ?? 0) > 0 && "flicker")} />}
          value={String(calls?.streak ?? 0)}
          label="call streak"
          tone={(calls?.streak ?? 0) > 0 ? "text-streak" : undefined}
          bump={extended}
        />
        <Stat
          icon={<Target className="size-5" />}
          value={calls && calls.made >= 5 ? `${calls.accuracy}%` : "—"}
          label={calls && calls.made >= 5 ? "read right" : "5 calls to rank"}
          tone={calls && calls.made >= 5 ? "text-go" : undefined}
        />
        <Button
          bare
          onClick={onAccount}
          className="lift flex items-center gap-2.5 rounded-[var(--r-btn)] bg-surface-2 px-3 py-2.5 text-left hover:bg-surface-3"
        >
          <Lightning weight="fill" className="size-5 shrink-0 text-coin" />
          <span className="min-w-0 flex-1">
            <span
              key={me?.sparks}
              className="num flash block text-[17px] leading-tight font-bold text-coin"
            >
              {me?.sparks ?? 0}
            </span>
            <Label>sparks · get more</Label>
          </span>
          <CaretRight className="size-4 shrink-0 text-mute" />
        </Button>
      </div>

      {/* What is still open. The Zeigarnik pull, made literal. */}
      <div className="flex min-h-0 flex-1 flex-col">
        <h2 className="mb-2 shrink-0 text-[13px] font-bold">
          Up next{" "}
          <span className="num font-semibold text-mute">{remaining}</span>
        </h2>
        <ul className="col-scroll -mx-1 flex-1 space-y-0.5 px-1">
          {queue.map((t, i) => (
            <li
              key={t._id}
              className="stagger flex items-start gap-2 rounded-[8px] px-2 py-2 transition-colors hover:bg-surface-2"
              style={{ animationDelay: `${Math.min(i, 10) * 35}ms` }}
            >
              <span className="num mt-0.5 w-4 shrink-0 text-[11px] font-bold text-mute">
                {answered + i + 2}
              </span>
              <Thumb
                src={t.imageUrl}
                alt=""
                rounded="rounded-[5px]"
                className="mt-0.5 size-8"
              />
              <span className="min-w-0 flex-1">
                <span className="line-clamp-2 text-[12.5px] leading-snug text-ink-3">
                  {t.question}
                </span>
                <span className="mt-0.5 flex items-center gap-1.5">
                  <span className="text-[11px] font-semibold text-mute capitalize">
                    {t.categorySlug}
                  </span>
                  {t.scopeCountry ? <Flag code={t.scopeCountry} /> : null}
                </span>
              </span>
            </li>
          ))}
          {queue.length === 0 ? (
            <li className="px-2 py-2 text-[12.5px] text-mute">
              Nothing queued — the crawler runs every six hours.
            </li>
          ) : null}
        </ul>
      </div>
    </aside>
  );
}
