import { useQuery } from "convex/react";
import {
  ArrowSquareOut,
  ChatCircle,
  Check,
  Globe,
  Lightning,
  Robot,
  Star,
  Stack,
  Users,
  X,
} from "@phosphor-icons/react";

import { api } from "../../../convex/_generated/api";
import { cn } from "../../lib/cn";
import { fmtInt, fmtMoney } from "../../lib/format";
import { useCountUp } from "../../lib/motion";
import { Button } from "../../ui/Button";
import { Label } from "../../ui/Label";
import { Tile } from "../../ui/Tile";

/**
 * What the house is doing, in one screen.
 *
 * Every figure here is a **bounded** count — the server looks at a capped
 * number of rows and says so. A console that needs a table scan to render is a
 * console that stops rendering exactly when the numbers get interesting, so the
 * cap is honest rather than hidden: when it bites, the tile says "at least".
 *
 * The tiles are the product's own stat tiles, landing one after another and
 * counting up, because a console that looks like a different product from the
 * one it runs is a console nobody trusts to be current.
 */
export function Dashboard({ onGo }: { onGo: (path: string) => void }) {
  const data = useQuery(api.admin.dashboard);

  if (data === undefined) {
    return (
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-6">
        {Array.from({ length: 6 }, (_, i) => (
          <span key={i} className="shimmer h-24 rounded-[var(--r-card)]" />
        ))}
      </div>
    );
  }

  const votes = data.votes.free + data.votes.paid;
  const paidShare = votes === 0 ? 0 : Math.round((data.votes.paid / votes) * 100);

  return (
    <div className="space-y-5">
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-6">
        <Tile
          icon={<Stack weight="fill" className="size-3.5" />}
          label={data.topics.capped ? "Live topics · at least" : "Live topics"}
          value={<Count n={data.topics.active} />}
          hint={`${fmtInt(data.topics.draft)} draft · ${fmtInt(data.topics.archived)} archived`}
          tone="go"
          delay={0}
        />
        <Tile
          icon={<Check weight="bold" className="size-3.5" />}
          label="Votes"
          value={<Count n={votes} />}
          hint={`${fmtInt(data.votes.free)} free · ${fmtInt(data.votes.paid)} backed (${paidShare}%)`}
          tone="love"
          delay={70}
        />
        <Tile
          icon={<Lightning weight="fill" className="size-3.5" />}
          label="Staked"
          value={<Money cents={data.stakedCents} />}
          hint="Simulated — no card is charged"
          tone="coin"
          delay={140}
        />
        <Tile
          icon={<Users weight="fill" className="size-3.5" />}
          label="Accounts"
          value={<Count n={data.users.total} />}
          hint={`${fmtInt(data.users.last7d)} in the last 7 days${
            data.users.banned > 0 ? ` · ${fmtInt(data.users.banned)} banned` : ""
          }`}
          tone="hate"
          delay={210}
        />
        <Tile
          icon={<ChatCircle weight="fill" className="size-3.5" />}
          label="Comments"
          value={<Count n={data.comments} />}
          delay={280}
        />
        <Tile
          icon={<Globe weight="fill" className="size-3.5" />}
          label="Countries voting"
          value={<Count n={data.countries} />}
          delay={350}
        />
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <section className="tile tile-in" style={{ animationDelay: "420ms" }}>
          <h2 className="mb-3 flex items-center gap-1.5 text-[11px] font-extrabold tracking-[0.06em] text-coin uppercase">
            <Star weight="fill" className="size-3.5" /> Featured topic
          </h2>
          {data.featured ? (
            <>
              <Button
                bare
                onClick={() => onGo(`/t/${data.featured!.slug}`)}
                className="display block text-left text-[clamp(1.1rem,1.5vw,1.5rem)] leading-snug hover:underline"
              >
                {data.featured.question}
              </Button>
              <p className="mt-3 flex flex-wrap items-center gap-2">
                <span className="rounded-[6px] bg-ink px-2 py-0.5 text-[10.5px] font-extrabold tracking-[0.06em] text-canvas uppercase">
                  {data.featured.categorySlug}
                </span>
                <span className="num text-[12px] text-mute">/{data.featured.slug}</span>
                <Button
                  bare
                  onClick={() =>
                    void navigator.clipboard?.writeText(
                      `${window.location.origin}/t/${data.featured!.slug}`,
                    )
                  }
                  className="flex items-center gap-1 text-[12px] font-semibold text-mute hover:text-ink"
                >
                  Copy link <ArrowSquareOut className="size-3" />
                </Button>
              </p>
            </>
          ) : (
            <p className="text-[14px] leading-relaxed text-mute">
              Nothing is featured. The ranker still weights it — a topic set here rides the
              top of every feed.
            </p>
          )}
        </section>

        <section className="tile tile-in" style={{ animationDelay: "490ms" }}>
          <h2 className="mb-3 flex items-center gap-1.5 text-[11px] font-extrabold tracking-[0.06em] text-ink-3 uppercase">
            <Robot weight="fill" className="size-3.5" /> Last discovery run
          </h2>
          {data.lastIngest ? (
            <>
              <p className="flex items-center gap-2">
                <span
                  className={cn(
                    "grid size-6 shrink-0 place-items-center rounded-full",
                    data.lastIngest.error ? "bg-love-fill text-on-love" : "bg-go-fill text-on-go",
                  )}
                >
                  {data.lastIngest.error ? (
                    <X weight="bold" className="size-3.5" />
                  ) : (
                    <Check weight="bold" className="size-3.5" />
                  )}
                </span>
                <span className="truncate text-[14px] font-bold">{data.lastIngest.query}</span>
              </p>
              <div className="mt-4 grid grid-cols-3 gap-2">
                <Figure value={data.lastIngest.found} label="Found" />
                <Figure value={data.lastIngest.minted} label="Minted" tone="text-go" />
                <Figure value={data.lastIngest.rejected} label="Rejected" tone="text-mute" />
              </div>
              {data.lastIngest.error ? (
                <p className="mt-4 rounded-[var(--r-sm)] border border-love-fill/40 bg-love-fill/12 px-3 py-2 text-[12.5px] font-semibold text-love">
                  {data.lastIngest.error}
                </p>
              ) : null}
              {data.lastIngest.finishedAt ? (
                <p className="mt-3">
                  <Label>{new Date(data.lastIngest.finishedAt).toLocaleString()}</Label>
                </p>
              ) : null}
            </>
          ) : (
            <p className="text-[14px] text-mute">Discovery has not run on this deployment yet.</p>
          )}
        </section>
      </div>
    </div>
  );
}

/** A count that climbs. Plain ease, no overshoot: these are ledgers, not results. */
function Count({ n }: { n: number }) {
  return <>{fmtInt(useCountUp(n, 700))}</>;
}

function Money({ cents }: { cents: number }) {
  return <>{fmtMoney(useCountUp(cents, 700))}</>;
}

function Figure({ value, label, tone }: { value: number; label: string; tone?: string }) {
  return (
    <span className="rounded-[var(--r-sm)] bg-surface-2 px-3 py-2">
      <span className={cn("display num block text-[22px]", tone)}>
        <Count n={value} />
      </span>
      <Label>{label}</Label>
    </span>
  );
}
