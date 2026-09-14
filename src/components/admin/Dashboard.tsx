import { useQuery } from "convex/react";
import {
  ArrowSquareOut,
  ChatCircle,
  Check,
  Globe,
  Lightning,
  Star,
  Stack,
  Users,
  X,
} from "@phosphor-icons/react";
import type { Icon } from "@phosphor-icons/react";

import { api } from "../../../convex/_generated/api";
import { cn } from "../../lib/cn";
import { fmtInt, fmtMoney } from "../../lib/format";
import { Button } from "../../ui/Button";
import { Label } from "../../ui/Label";

/**
 * What the house is doing, in one screen.
 *
 * Every figure here is a **bounded** count — the server looks at a capped
 * number of rows and says so. A console that needs a table scan to render is a
 * console that stops rendering exactly when the numbers get interesting, so the
 * cap is honest rather than hidden: when it bites, the tile says "at least".
 */
export function Dashboard({ onGo }: { onGo: (path: string) => void }) {
  const data = useQuery(api.admin.dashboard);

  if (data === undefined) {
    return (
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {Array.from({ length: 8 }, (_, i) => (
          <span key={i} className="shimmer h-28 rounded-[var(--r-card)]" />
        ))}
      </div>
    );
  }

  const live = data.topics.active;
  const votes = data.votes.free + data.votes.paid;
  const paidShare = votes === 0 ? 0 : Math.round((data.votes.paid / votes) * 100);

  return (
    <div className="space-y-6">
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <Tile
          icon={Stack}
          label="Live topics"
          value={fmtInt(live)}
          caption={`${fmtInt(data.topics.draft)} draft · ${fmtInt(data.topics.archived)} archived`}
          approx={data.topics.capped}
        />
        <Tile
          icon={Check}
          label="Votes"
          value={fmtInt(votes)}
          caption={`${fmtInt(data.votes.free)} free · ${fmtInt(data.votes.paid)} backed (${paidShare}%)`}
        />
        <Tile
          icon={Lightning}
          label="Staked"
          value={fmtMoney(data.stakedCents)}
          tone="text-coin"
          caption="Simulated — no card is charged"
        />
        <Tile
          icon={Users}
          label="Accounts"
          value={fmtInt(data.users.total)}
          caption={`${fmtInt(data.users.last7d)} in the last 7 days${
            data.users.banned > 0 ? ` · ${fmtInt(data.users.banned)} banned` : ""
          }`}
        />
        <Tile icon={ChatCircle} label="Comments" value={fmtInt(data.comments)} />
        <Tile icon={Globe} label="Countries voting" value={fmtInt(data.countries)} />
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <section className="card p-5">
          <h2 className="mb-3 flex items-center gap-2 text-[13px] font-bold">
            <Star weight="fill" className="size-4 text-coin" /> Featured topic
          </h2>
          {data.featured ? (
            <>
              <Button
                bare
                onClick={() => onGo(`/t/${data.featured!.slug}`)}
                className="block text-left text-[17px] leading-snug font-bold hover:underline"
              >
                {data.featured.question}
              </Button>
              <p className="mt-2 flex flex-wrap items-center gap-2">
                <span className="chip !bg-surface-3 capitalize">
                  {data.featured.categorySlug}
                </span>
                <span className="num text-[12px] text-mute">
                  /{data.featured.slug}
                </span>
                <Button
                  bare
                  onClick={() =>
                    void navigator.clipboard?.writeText(
                      `${window.location.origin}/t/${data.featured!.slug}`,
                    )
                  }
                  className="flex items-center gap-1 text-[12px] text-mute hover:text-ink"
                >
                  Copy link <ArrowSquareOut className="size-3" />
                </Button>
              </p>
            </>
          ) : (
            <p className="text-[14px] text-mute">
              Nothing is featured. The ranker still weights `isFeatured` — a
              topic set here rides the top of every feed.
            </p>
          )}
        </section>

        <section className="card p-5">
          <h2 className="mb-3 text-[13px] font-bold">Last discovery run</h2>
          {data.lastIngest ? (
            <>
              <p className="flex items-center gap-2">
                {data.lastIngest.error ? (
                  <X weight="bold" className="size-4 shrink-0 text-love" />
                ) : (
                  <Check weight="bold" className="size-4 shrink-0 text-go" />
                )}
                <span className="truncate text-[14px] font-bold">
                  {data.lastIngest.query}
                </span>
              </p>
              <div className="mt-4 flex flex-wrap gap-x-8 gap-y-3">
                <Figure value={fmtInt(data.lastIngest.found)} label="Found" />
                <Figure
                  value={fmtInt(data.lastIngest.minted)}
                  label="Minted"
                  tone="text-go"
                />
                <Figure
                  value={fmtInt(data.lastIngest.rejected)}
                  label="Rejected"
                  tone="text-mute"
                />
              </div>
              {data.lastIngest.error ? (
                <p className="mt-4 rounded-[var(--r-btn)] bg-love/12 px-3 py-2 text-[12.5px] font-semibold text-love">
                  {data.lastIngest.error}
                </p>
              ) : null}
              {data.lastIngest.finishedAt ? (
                <p className="mt-3">
                  <Label>
                    {new Date(data.lastIngest.finishedAt).toLocaleString()}
                  </Label>
                </p>
              ) : null}
            </>
          ) : (
            <p className="text-[14px] text-mute">
              Discovery has not run on this deployment yet.
            </p>
          )}
        </section>
      </div>
    </div>
  );
}

function Tile({
  icon: Icon,
  label,
  value,
  caption,
  tone,
  approx = false,
}: {
  icon: Icon;
  label: string;
  value: string;
  caption?: string;
  tone?: string;
  approx?: boolean;
}) {
  return (
    <div className="card p-4">
      <div className="flex items-center justify-between">
        <Label>{label}</Label>
        <span className="grid size-7 place-items-center rounded-[8px] bg-surface-3 text-mute">
          <Icon className="size-4" />
        </span>
      </div>
      <p className="mt-2 flex items-baseline gap-1.5">
        {approx ? (
          <span className="text-[11px] font-bold text-mute uppercase">
            at least
          </span>
        ) : null}
        <span className={cn("display num text-[28px]", tone)}>{value}</span>
      </p>
      {caption ? (
        <p className="mt-1 text-[11.5px] leading-snug text-mute">{caption}</p>
      ) : null}
    </div>
  );
}

function Figure({
  value,
  label,
  tone,
}: {
  value: string;
  label: string;
  tone?: string;
}) {
  return (
    <span>
      <span className={cn("display num block text-[22px]", tone)}>{value}</span>
      <Label>{label}</Label>
    </span>
  );
}
