import { useAction, useQuery } from "convex/react";
import { useState } from "react";
import {
  ArrowRight,
  ArrowSquareOut,
  ChatCircle,
  Globe,
  Scroll,
  Star,
  UserCircleMinus,
  Users,
  Warning,
} from "@phosphor-icons/react";

import { api } from "../../../convex/_generated/api";
import { cn } from "../../lib/cn";
import { fmtInt, fmtMoney } from "../../lib/format";
import { useCountUp } from "../../lib/motion";
import { Button } from "../../ui/Button";
import { Thumb } from "../../ui/Thumb";
import { Section } from "../../ui/Section";
import { AuditRecord } from "./AuditRecord";
import { Replay } from "./Replay";
import { ModeSwitch } from "./ModeSwitch";
import { Aside, Empty, Work } from "./panes";
import { SessionChart } from "./SessionChart";

/**
 * What the house is doing, as a sheet rather than a grid of boxes.
 *
 * The first version of this page was six bordered tiles. Bordered tiles are
 * what every dashboard is made of, and a page made of them reads as a
 * dashboard before it reads as anything about this product. So the boxes are
 * gone: figures sit on the canvas in the product's own display type and accent
 * colours, sections are separated by space and a coloured label, and the one
 * chart on the page is the crawler's own heartbeat rather than a decoration.
 *
 * Every figure is a **bounded** count — the server looks at a capped number of
 * rows and says so. When the cap bites, the label says "at least".
 */
export function Overview({
  permissions,
  onGo,
}: {
  permissions: string[];
  onGo: (path: string) => void;
}) {
  const data = useQuery(api.admin.dashboard);
  const discovery = useQuery(api.settings.discovery);
  const sessions = useQuery(api.adminQueue.sessions, { limit: 14 });
  const report = useQuery(api.recommend.latest);
  const replay = useAction(api.recommend.run);
  const [replaying, setReplaying] = useState(false);

  const votes = data ? data.votes.free + data.votes.paid : 0;
  const backed = votes === 0 ? 0 : Math.round((data!.votes.paid / votes) * 100);

  /* Hoisted, and unconditional. These are hooks. */
  const liveTopics = useCountUp(data?.topics.active ?? 0, 700);
  const allVotes = useCountUp(votes, 700);
  const backedPct = useCountUp(backed, 700);
  const staked = useCountUp(data?.stakedCents ?? 0, 700);

  const last = sessions?.[0];

  return (
    <>
      <Work>
        {data === undefined ? (
          <div className="space-y-6">
            <span className="shimmer block h-24 rounded-[var(--r-card)]" />
            <span className="shimmer block h-40 rounded-[var(--r-card)]" />
            <span className="shimmer block h-28 rounded-[var(--r-card)]" />
          </div>
        ) : (
          <div className="rise space-y-8">
            <Section label="Right now" tone="text-go">
              <div className="grid grid-cols-2 gap-x-6 gap-y-5 lg:grid-cols-4">
                <Big
                  value={fmtInt(liveTopics)}
                  label={data.topics.capped ? "live topics, at least" : "live topics"}
                  hint={`${fmtInt(data.topics.draft)} draft · ${fmtInt(data.topics.archived)} archived`}
                  tone="text-go"
                />
                <Big
                  value={fmtInt(allVotes)}
                  label="votes cast"
                  hint={`${fmtInt(data.votes.free)} free · ${fmtInt(data.votes.paid)} backed`}
                  tone="text-love"
                />
                <Big
                  value={`${backedPct}%`}
                  label="backed with a spark"
                  hint="the committed, as a share of the crowd"
                  tone="text-coin"
                />
                <Big
                  value={fmtMoney(staked)}
                  label="staked"
                  hint="simulated — no card is charged"
                  tone="text-coin"
                />
              </div>
            </Section>

            <Section
              label="The crawler"
              tone="text-hate"
              action={<ModeSwitch permissions={permissions} compact />}
            >
              {discovery ? (
                <p className="text-[13.5px] leading-snug text-ink-2">
                  <span className="num font-extrabold text-ink">{fmtInt(discovery.runsPerDay)}</span>{" "}
                  {discovery.runsPerDay === 1 ? "session" : "sessions"} a day, every{" "}
                  <span className="num font-extrabold text-ink">{discovery.everyHours}</span>{" "}
                  hours, each going after{" "}
                  <span className="num font-extrabold text-ink">{fmtInt(discovery.topicsPerRun)}</span>{" "}
                  new questions.{" "}
                  <span className="text-mute">
                    {discovery.mode === "review"
                      ? "They land as drafts and wait for a moderator."
                      : "Anything clearing the floor goes straight into the feed."}
                  </span>
                </p>
              ) : null}

              <div className="mt-4">
                {sessions === undefined ? (
                  <span className="shimmer block h-24 rounded-[var(--r-btn)]" />
                ) : (
                  <SessionChart sessions={sessions} />
                )}
              </div>

              {last ? (
                <div className="mt-4 flex flex-wrap items-center gap-x-4 gap-y-2 border-t border-line pt-3.5 text-[12.5px]">
                  <span className="font-extrabold">
                    {last.seq ? `Session ${last.seq}` : "Last session"}
                  </span>
                  <span className="num text-mute">
                    {fmtInt(last.minted)} minted · {fmtInt(last.duplicate)} already asked ·{" "}
                    {fmtInt(last.rejected)} too dull
                  </span>
                  {last.error ? (
                    <span className="flex items-center gap-1 font-semibold text-love">
                      <Warning weight="fill" className="size-3.5" /> {last.error}
                    </span>
                  ) : null}
                  <span className="flex-1" />
                  {discovery && discovery.pending > 0 ? (
                    <Button variant="go" size="sm" onClick={() => onGo("/admin/queue")}>
                      {fmtInt(discovery.pending)} waiting <ArrowRight className="size-4" />
                    </Button>
                  ) : null}
                </div>
              ) : null}
            </Section>

            <Section
              label="The recommender"
              tone="text-go"
              action={
                permissions.includes("maintenance:run") ? (
                  <Button
                    variant="ghost"
                    size="sm"
                    disabled={replaying}
                    onClick={() => {
                      setReplaying(true);
                      void replay({}).finally(() => setReplaying(false));
                    }}
                  >
                    {replaying ? "Replaying…" : "Replay now"}
                  </Button>
                ) : null
              }
            >
              {report ? (
                <Replay report={report} />
              ) : (
                <p className="text-[13px] leading-relaxed text-mute">
                  No replay yet. Every reader's real acts are replayed against the ranker
                  nightly; the first report appears after the first run.
                </p>
              )}
            </Section>

            <Section label="Featured" tone="text-coin">
              {data.featured ? (
                <div className="flex items-center gap-4">
                  <Thumb
                    src={data.featured.imageUrl ?? undefined}
                    alt=""
                    rounded="rounded-[var(--r-card)]"
                    className="size-24 shrink-0 border-2 border-coin-fill/60"
                  />
                  <div className="min-w-0 flex-1">
                    <p className="display text-[clamp(1.2rem,1.8vw,1.7rem)] text-balance">
                      {data.featured.question}
                    </p>
                    <p className="mt-2 flex flex-wrap items-center gap-2">
                      <span className="rounded-[6px] bg-ink px-2 py-0.5 text-[10.5px] font-extrabold tracking-[0.06em] text-canvas uppercase">
                        {data.featured.categorySlug}
                      </span>
                      <span className="num text-[12px] text-mute">/{data.featured.slug}</span>
                      <Button variant="ghost" size="sm" asChild>
                        <a href={`/t/${data.featured.slug}`} target="_blank" rel="noopener noreferrer">
                          Open <ArrowSquareOut className="size-3.5" />
                        </a>
                      </Button>
                    </p>
                  </div>
                </div>
              ) : (
                <p className="flex items-center gap-2 text-[13.5px] text-mute">
                  <Star className="size-4" /> Nothing is featured. A topic set here rides the
                  top of every feed.
                </p>
              )}
            </Section>

            <Section label="The house" tone="text-ink-3">
              <div className="flex flex-wrap items-center gap-x-7 gap-y-3">
                <Quiet icon={<Users weight="fill" className="size-4" />} value={fmtInt(data.users.total)} label="accounts" />
                <Quiet icon={<Users className="size-4" />} value={fmtInt(data.users.last7d)} label="new this week" />
                <Quiet icon={<ChatCircle weight="fill" className="size-4" />} value={fmtInt(data.comments)} label="comments" />
                <Quiet icon={<Globe weight="fill" className="size-4" />} value={fmtInt(data.countries)} label="countries voting" />
                {data.users.banned > 0 ? (
                  <Quiet icon={<UserCircleMinus weight="fill" className="size-4" />} value={fmtInt(data.users.banned)} label="suspended" tone="text-love" />
                ) : null}
              </div>
            </Section>
          </div>
        )}
      </Work>

      <Aside title="The record" icon={<Scroll weight="fill" className="size-4 text-mute" />}>
        {permissions.includes("audit:read") ? (
          <AuditRecord dense />
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

function Big({
  value,
  label,
  hint,
  tone,
}: {
  value: string;
  label: string;
  hint: string;
  tone: string;
}) {
  return (
    <span className="block">
      <span className={cn("display num block text-[clamp(2.2rem,3.6vw,3.2rem)]", tone)}>
        {value}
      </span>
      <span className="mt-0.5 block text-[12.5px] font-extrabold text-ink-2">{label}</span>
      <span className="block text-[11.5px] text-mute">{hint}</span>
    </span>
  );
}

function Quiet({
  icon,
  value,
  label,
  tone,
}: {
  icon: React.ReactNode;
  value: string;
  label: string;
  tone?: string;
}) {
  return (
    <span className="flex items-center gap-2.5">
      <span className={cn("text-mute", tone)}>{icon}</span>
      <span className="leading-tight">
        <span className={cn("display num block text-[18px]", tone)}>{value}</span>
        <span className="block text-[11px] text-mute">{label}</span>
      </span>
    </span>
  );
}
