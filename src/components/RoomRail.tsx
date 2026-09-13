import { useQuery } from "convex/react";
import {
  ChatCircle,
  Crown,
  Fire,
  Heart,
  Lightning,
  Lock,
  ThumbsDown,
} from "@phosphor-icons/react";

import { api } from "../../convex/_generated/api";
import type { Id } from "../../convex/_generated/dataModel";
import { Comments } from "./Comments";
import { cn } from "../lib/cn";
import { fmtInt, fmtMoney } from "../lib/format";
import { Button } from "../ui/Button";
import { Flag } from "../ui/Flag";

/**
 * The right column: the room, while you are in it.
 *
 * Two tabs rather than two stacked panels, because a rail that scrolls is a
 * rail nobody reads. `Live` is every vote and comment as it lands — with a
 * locked marker where a result has not been earned, never a blank. `Talk` is
 * this topic's argument, in place, so arguing never costs the question its
 * screen.
 */

type Tab = "live" | "talk" | "boards";

function TabButton({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <Button
      bare
      onClick={onClick}
      className={cn(
        "relative flex min-h-10 flex-1 items-center justify-center gap-1.5 text-[12.5px]",
        "font-bold transition-colors",
        active ? "text-ink" : "text-mute hover:text-ink-3",
      )}
    >
      {children}
      <span
        className={cn(
          "absolute inset-x-2 -bottom-px h-0.5 rounded-full transition-all duration-200",
          active ? "bg-go" : "bg-transparent",
        )}
      />
    </Button>
  );
}

function Live({ onOpen }: { onOpen: (slug: string) => void }) {
  const rows = useQuery(api.leaderboards.activity, { limit: 30 });

  if (!rows?.length) {
    return <p className="p-4 text-[13px] text-mute">Nothing yet today.</p>;
  }

  return (
    <ul className="space-y-0.5 p-2">
      {rows.map((r, i) => (
        <li
          key={r.id}
          className="stagger"
          style={{ animationDelay: `${Math.min(i, 14) * 30}ms` }}
        >
          <Button
            bare
            onClick={() => onOpen(r.slug)}
            title={
              r.kind === "vote" && r.choice === null
                ? "Vote on this to see which way it went"
                : undefined
            }
            className={cn(
              "group/row flex w-full flex-col items-start gap-0.5 rounded-[8px] px-2 py-2 text-left",
              "transition-[background-color,transform] duration-150",
              "hover:translate-x-1 hover:bg-surface-2",
            )}
          >
            <span className="flex w-full items-center gap-2">
              {r.countryCode ? <Flag code={r.countryCode} /> : null}
              <span className="flex-1 truncate text-[12.5px] leading-tight text-ink-3 transition-colors group-hover/row:text-ink">
                {r.question}
              </span>
              {r.paid ? (
                <Lightning weight="fill" className="size-3 shrink-0 text-coin" />
              ) : null}
              {r.kind === "comment" ? (
                <ChatCircle className="size-3.5 shrink-0 text-mute" />
              ) : r.choice === "love" ? (
                <Heart weight="fill" className="size-3.5 shrink-0 text-love" />
              ) : r.choice === "hate" ? (
                <ThumbsDown weight="fill" className="size-3.5 shrink-0 text-hate" />
              ) : (
                <Lock className="size-3.5 shrink-0 text-mute transition-colors group-hover/row:text-coin" />
              )}
            </span>
            {r.kind === "comment" && r.body ? (
              <span className="line-clamp-2 pl-1 text-[11.5px] leading-snug text-mute italic">
                &ldquo;{r.body}&rdquo; — {r.author}
              </span>
            ) : null}
          </Button>
        </li>
      ))}
    </ul>
  );
}

function Boards({ onOpen }: { onOpen: (slug: string) => void }) {
  const readers = useQuery(api.calls.readers, { limit: 6 });
  const hottest = useQuery(api.leaderboards.hottest, { limit: 6 });
  const backers = useQuery(api.leaderboards.backers, { limit: 6 });

  function Section({
    title,
    icon,
    rows,
  }: {
    title: string;
    icon: React.ReactNode;
    rows: { name: string; value: string; slug?: string }[] | undefined;
    }) {
    return (
      <div className="p-3">
        <h3 className="mb-1.5 flex items-center gap-1.5 text-[12px] font-bold text-ink-3">
          {icon}
          {title}
        </h3>
        {rows?.length ? (
          <ul>
            {rows.map((r, i) => (
              <li key={`${r.name}-${i}`} className="stagger" style={{ animationDelay: `${i * 35}ms` }}>
                <Button
                  bare
                  disabled={!r.slug}
                  onClick={() => r.slug && onOpen(r.slug)}
                  className={cn(
                    "flex w-full items-center gap-2 rounded-[7px] px-1.5 py-1.5 text-left",
                    "transition-[background-color,transform] duration-150 disabled:opacity-100",
                    r.slug && "hover:translate-x-1 hover:bg-surface-2",
                  )}
                >
                  <span
                    className={cn(
                      "num grid size-5 shrink-0 place-items-center rounded-[5px] text-[10px] font-bold",
                      i === 0 ? "bg-coin text-black" : "bg-surface-3 text-mute",
                    )}
                  >
                    {i + 1}
                  </span>
                  <span className="flex-1 truncate text-[12.5px] font-semibold">
                    {r.name}
                  </span>
                  <span className="num shrink-0 text-[11.5px] font-bold text-ink-3">
                    {r.value}
                  </span>
                </Button>
              </li>
            ))}
          </ul>
        ) : (
          <p className="px-1.5 text-[12px] text-mute">Nothing yet.</p>
        )}
      </div>
    );
  }

  return (
    <div className="divide-y divide-line">
      <Section
        title="Best readers"
        icon={<Crown className="size-3.5 text-coin" />}
        rows={readers?.map((r) => ({ name: r.displayName, value: `${r.accuracy}%` }))}
      />
      <Section
        title="Hottest"
        icon={<Fire className="size-3.5 text-streak" />}
        rows={hottest?.map((t) => ({
          name: t.question,
          value: fmtMoney(t.stakedCents),
          slug: t.slug,
        }))}
      />
      <Section
        title="Top backers"
        icon={<Lightning className="size-3.5 text-love" />}
        rows={backers?.map((b) => ({
          name: b.displayName,
          value: fmtInt(b.topicsBacked),
        }))}
      />
    </div>
  );
}

export function RoomRail({
  slug,
  topicId,
  quills,
  signedIn,
  commentCount,
  tab,
  onTab,
  onOpen,
}: {
  slug: string;
  topicId: Id<"topics">;
  quills: number;
  signedIn: boolean;
  commentCount: number;
  tab: Tab;
  onTab: (t: Tab) => void;
  onOpen: (slug: string) => void;
}) {
  return (
    <aside className="rail flex h-full min-h-0 flex-col border-l border-line">
      <div className="flex shrink-0 border-b border-line px-1">
        <TabButton active={tab === "live"} onClick={() => onTab("live")}>
          <span className="size-1.5 rounded-full bg-go flicker" /> Live
        </TabButton>
        <TabButton active={tab === "talk"} onClick={() => onTab("talk")}>
          <ChatCircle className="size-3.5" /> Talk
          {commentCount > 0 ? (
            <span className="num text-[11px] text-mute">{commentCount}</span>
          ) : null}
        </TabButton>
        <TabButton active={tab === "boards"} onClick={() => onTab("boards")}>
          <Crown className="size-3.5" /> Boards
        </TabButton>
      </div>

      <div className="col-scroll flex-1">
        {tab === "live" ? (
          <Live onOpen={onOpen} />
        ) : tab === "talk" ? (
          <div className="p-3">
            <Comments
              slug={slug}
              topicId={topicId}
              quills={quills}
              signedIn={signedIn}
            />
          </div>
        ) : (
          <Boards onOpen={onOpen} />
        )}
      </div>
    </aside>
  );
}

export type { Tab as RoomTab };
