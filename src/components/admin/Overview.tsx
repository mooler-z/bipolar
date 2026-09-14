import { useQuery } from "convex/react";
import {
  ArrowSquareOut,
  Check,
  ChatCircle,
  Globe,
  Robot,
  Scroll,
  Star,
  UserCircleMinus,
  Users,
  X,
} from "@phosphor-icons/react";

import { api } from "../../../convex/_generated/api";
import { cn } from "../../lib/cn";
import { fmtInt, fmtMoney } from "../../lib/format";
import { useCountUp } from "../../lib/motion";
import { Button } from "../../ui/Button";
import { Label } from "../../ui/Label";
import { AuditRecord } from "./AuditRecord";
import { Discovery } from "./Discovery";
import { Aside, Empty, Work } from "./panes";

/**
 * What the house is doing, in one screen.
 *
 * Six identical tiles in a row is a dashboard that has decided nothing. These
 * figures are not equal: three of them are the product — how much there is to
 * vote on, how much voting happened, how much of it was paid for — and the rest
 * are context. So the three lead in type large enough to read across a room,
 * the paid share gets the one bar on the screen because it is the number the
 * business turns on, and everything else sits in a quiet strip underneath.
 *
 * Every figure is a **bounded** count — the server looks at a capped number of
 * rows and says so. A console that needs a table scan to render is a console
 * that stops rendering exactly when the numbers get interesting, so the cap is
 * honest rather than hidden: when it bites, the figure says "at least".
 */
export function Overview({
  permissions,
  onGo,
}: {
  permissions: string[];
  onGo: (path: string) => void;
}) {
  const data = useQuery(api.admin.dashboard);

  const votes = data ? data.votes.free + data.votes.paid : 0;
  const paidShare = votes === 0 ? 0 : Math.round((data!.votes.paid / votes) * 100);

  /* Hoisted, and unconditional. These are hooks: reading them inside the
     branch that waits for the query would change how many run between the
     loading render and the loaded one, which React counts and React breaks on. */
  const liveTopics = useCountUp(data?.topics.active ?? 0, 700);
  const allVotes = useCountUp(votes, 700);
  const staked = useCountUp(data?.stakedCents ?? 0, 700);

  return (
    <>
      <Work>
        {data === undefined ? (
          <div className="space-y-3">
            <span className="shimmer block h-28 rounded-[var(--r-card)]" />
            <span className="shimmer block h-20 rounded-[var(--r-card)]" />
            <span className="shimmer block h-40 rounded-[var(--r-card)]" />
          </div>
        ) : (
          <div className="space-y-3">
            <section className="tile tile-in grid gap-px overflow-hidden !p-0 sm:grid-cols-3">
              <Headline
                label={data.topics.capped ? "Live topics, at least" : "Live topics"}
                value={fmtInt(liveTopics)}
                hint={`${fmtInt(data.topics.draft)} draft · ${fmtInt(data.topics.archived)} archived`}
                tone="text-go"
              />
              <Headline
                label="Votes cast"
                value={fmtInt(allVotes)}
                hint={`${fmtInt(data.votes.free)} free · ${fmtInt(data.votes.paid)} backed`}
                tone="text-love"
              />
              <Headline
                label="Staked"
                value={fmtMoney(staked)}
                hint="Simulated — no card is charged"
                tone="text-coin"
              />
            </section>

            {/* The one bar on the screen, because this is the one ratio the
                whole product turns on: how much of the crowd paid to be counted. */}
            <section className="tile tile-in" style={{ animationDelay: "80ms" }}>
              <p className="flex items-baseline gap-2">
                <span className="display num text-[22px] text-coin">{paidShare}%</span>
                <span className="text-[13px] font-bold">
                  of votes are backed with a spark
                </span>
              </p>
              <span className="bar mt-2.5 block">
                <span
                  className="bar-fill !bg-coin-fill"
                  style={{ width: `${paidShare}%` }}
                />
              </span>
              <p className="mt-2 text-[11.5px] text-mute">
                Free votes are the crowd. A spark is what somebody paid to be
                counted, and the two-layer aggregate is the difference.
              </p>
            </section>

            <Discovery permissions={permissions} onShowQueue={() => onGo("/admin/queue")} />

            <div className="grid gap-3 lg:grid-cols-2">
              <section className="tile tile-in" style={{ animationDelay: "160ms" }}>
                <h2 className="mb-3 flex items-center gap-1.5 text-[11px] font-extrabold tracking-[0.06em] text-coin uppercase">
                  <Star weight="fill" className="size-3.5" /> Featured topic
                </h2>
                {data.featured ? (
                  <>
                    <p className="display text-[clamp(1.05rem,1.4vw,1.35rem)] leading-snug">
                      {data.featured.question}
                    </p>
                    <p className="mt-3 flex flex-wrap items-center gap-2">
                      <span className="rounded-[6px] bg-ink px-2 py-0.5 text-[10.5px] font-extrabold tracking-[0.06em] text-canvas uppercase">
                        {data.featured.categorySlug}
                      </span>
                      <Button variant="ghost" size="sm" asChild>
                        <a
                          href={`/t/${data.featured.slug}`}
                          target="_blank"
                          rel="noopener noreferrer"
                        >
                          Open <ArrowSquareOut className="size-3.5" />
                        </a>
                      </Button>
                    </p>
                  </>
                ) : (
                  <p className="text-[13.5px] leading-relaxed text-mute">
                    Nothing is featured. The ranker still weights it — a topic
                    set here rides the top of every feed.
                  </p>
                )}
              </section>

              <section className="tile tile-in" style={{ animationDelay: "220ms" }}>
                <h2 className="mb-3 flex items-center gap-1.5 text-[11px] font-extrabold tracking-[0.06em] text-ink-3 uppercase">
                  <Robot weight="fill" className="size-3.5" /> Last discovery run
                </h2>
                {data.lastIngest ? (
                  <>
                    <p className="flex items-center gap-2">
                      <span
                        className={cn(
                          "grid size-6 shrink-0 place-items-center rounded-full",
                          data.lastIngest.error
                            ? "bg-love-fill text-on-love"
                            : "bg-go-fill text-on-go",
                        )}
                      >
                        {data.lastIngest.error ? (
                          <X weight="bold" className="size-3.5" />
                        ) : (
                          <Check weight="bold" className="size-3.5" />
                        )}
                      </span>
                      <span className="truncate text-[13.5px] font-bold">
                        {data.lastIngest.query}
                      </span>
                    </p>
                    <div className="mt-3 grid grid-cols-3 gap-2">
                      <Small label="Found" value={data.lastIngest.found} />
                      <Small label="Minted" value={data.lastIngest.minted} tone="text-go" />
                      <Small label="Rejected" value={data.lastIngest.rejected} tone="text-mute" />
                    </div>
                    {data.lastIngest.error ? (
                      <p className="mt-3 rounded-[var(--r-sm)] border border-love-fill/40 bg-love-fill/12 px-3 py-2 text-[12.5px] font-semibold text-love">
                        {data.lastIngest.error}
                      </p>
                    ) : null}
                    {data.lastIngest.finishedAt ? (
                      <p className="mt-2.5">
                        <Label>
                          {new Date(data.lastIngest.finishedAt).toLocaleString()}
                        </Label>
                      </p>
                    ) : null}
                  </>
                ) : (
                  <p className="text-[13.5px] text-mute">
                    Discovery has not run on this deployment yet.
                  </p>
                )}
              </section>
            </div>

            {/* Context, not headlines. One quiet strip, deliberately smaller. */}
            <section
              className="tile tile-in flex flex-wrap items-center gap-x-6 gap-y-3"
              style={{ animationDelay: "280ms" }}
            >
              <Quiet icon={<Users weight="fill" className="size-3.5" />} label="Accounts" value={fmtInt(data.users.total)} />
              <Quiet icon={<Users className="size-3.5" />} label="New this week" value={fmtInt(data.users.last7d)} />
              <Quiet icon={<ChatCircle weight="fill" className="size-3.5" />} label="Comments" value={fmtInt(data.comments)} />
              <Quiet icon={<Globe weight="fill" className="size-3.5" />} label="Countries voting" value={fmtInt(data.countries)} />
              {data.users.banned > 0 ? (
                <Quiet
                  icon={<UserCircleMinus weight="fill" className="size-3.5" />}
                  label="Suspended"
                  value={fmtInt(data.users.banned)}
                  tone="text-love"
                />
              ) : null}
            </section>
          </div>
        )}
      </Work>

      <Aside title="The record" icon={<Scroll weight="fill" className="size-4 text-mute" />}>
        {permissions.includes("audit:read") ? (
          <AuditRecord limit={30} dense />
        ) : (
          <Empty
            title="Admins only"
            hint="The record is what a moderator is accountable to, so reading it is not a moderator's own capability."
          />
        )}
      </Aside>
    </>
  );
}

function Headline({
  label,
  value,
  hint,
  tone,
}: {
  label: string;
  value: string;
  hint: string;
  tone: string;
}) {
  return (
    <span className="bg-surface px-4 py-3.5">
      <span className="block text-[11px] font-extrabold tracking-[0.08em] text-mute uppercase">
        {label}
      </span>
      <span className={cn("display num mt-1 block text-[clamp(1.9rem,3.2vw,2.6rem)]", tone)}>
        {value}
      </span>
      <span className="mt-0.5 block text-[11.5px] text-mute">{hint}</span>
    </span>
  );
}

function Small({ label, value, tone }: { label: string; value: number; tone?: string }) {
  return (
    <span className="rounded-[var(--r-sm)] bg-surface-2 px-3 py-2">
      <span className={cn("display num block text-[20px]", tone)}>{fmtInt(value)}</span>
      <Label>{label}</Label>
    </span>
  );
}

function Quiet({
  icon,
  label,
  value,
  tone,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  tone?: string;
}) {
  return (
    <span className="flex items-center gap-2">
      <span className={cn("text-mute", tone)}>{icon}</span>
      <span className="leading-tight">
        <span className={cn("num block text-[15px] font-extrabold", tone)}>{value}</span>
        <span className="block text-[11px] text-mute">{label}</span>
      </span>
    </span>
  );
}
