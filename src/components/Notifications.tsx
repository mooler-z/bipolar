import { useEffect, useRef, useState } from "react";
import { useMutation, usePaginatedQuery, useQuery } from "convex/react";
import {
  ArrowBendUpLeft,
  At,
  Bell,
  Fire,
  Heart,
} from "@phosphor-icons/react";

import { api } from "../../convex/_generated/api";
import { PAGE } from "../../convex/lib/page";
import { useAutoLoad } from "../lib/useAutoLoad";
import { More } from "../ui/More";
import { cn } from "../lib/cn";
import { fmtInt } from "../lib/format";
import { ago } from "../lib/motion";
import { navigate } from "../lib/nav";
import { Avatar } from "../ui/Avatar";
import { Button } from "../ui/Button";

/**
 * What happened while you were not looking.
 *
 * Three things are worth being told: somebody answered you, somebody agreed
 * with you, and the room found something worth arguing about. Nothing else
 * rings — a bell that rings for everything is a bell nobody looks at.
 *
 * **Opening it is reading it.** The count clears on open rather than per row,
 * because a list of things you have plainly just looked at, still marked
 * unread, is an argument with the reader. The rows keep their unread tint for
 * that one viewing so you can still see which are new.
 *
 * Every row goes somewhere: a reply and a like open the topic they were on, a
 * hot topic opens itself. A notice you cannot act on is a notice that did not
 * need sending.
 */

const ICON = {
  reply: ArrowBendUpLeft,
  mention: At,
  like: Heart,
  hot: Fire,
} as const;

const TONE = {
  reply: "text-go",
  mention: "text-go",
  like: "text-love",
  hot: "text-streak",
} as const;

function says(kind: string, actor: string | null): string {
  if (kind === "reply") return `${actor ?? "Somebody"} answered you`;
  if (kind === "mention") return `${actor ?? "Somebody"} mentioned you`;
  if (kind === "like") return `${actor ?? "Somebody"} agreed with you`;
  return "The room is arguing about this";
}

export function Notifications() {
  const count = useQuery(api.notifications.unread) ?? 0;
  const [open, setOpen] = useState(false);
  const { results: rows, status, loadMore } = usePaginatedQuery(
    api.notifications.list,
    open ? {} : "skip",
    { initialNumItems: PAGE },
  );
  const sentinel = useAutoLoad(status, loadMore, PAGE);
  const markRead = useMutation(api.notifications.markRead);
  const box = useRef<HTMLDivElement>(null);

  // Pressing anywhere else is a decision to stop reading.
  useEffect(() => {
    if (!open) return;
    function away(e: PointerEvent) {
      if (!box.current?.contains(e.target as Node)) setOpen(false);
    }
    function esc(e: KeyboardEvent) {
      if (e.key === "Escape") setOpen(false);
    }
    window.addEventListener("pointerdown", away);
    window.addEventListener("keydown", esc);
    return () => {
      window.removeEventListener("pointerdown", away);
      window.removeEventListener("keydown", esc);
    };
  }, [open]);

  function toggle() {
    const next = !open;
    setOpen(next);
    // Opening is reading. The tint on each row survives this viewing.
    if (next && count > 0) void markRead({});
  }

  return (
    <div ref={box} className="relative">
      <Button
        bare
        aria-label={count > 0 ? `${count} unread` : "Notifications"}
        title="Notifications"
        onClick={toggle}
        className={cn(
          "relative grid size-10 place-items-center rounded-[var(--r-btn)]",
          "transition-colors hover:bg-surface-2",
          open || count > 0 ? "text-ink" : "text-mute hover:text-ink",
        )}
      >
        <Bell weight={count > 0 ? "fill" : "regular"} className={cn("size-4", count > 0 && "wiggle")} />
        {count > 0 ? (
          <span className="num pop-in absolute top-1 right-1 min-w-4 rounded-full bg-love-fill px-1 text-[10px] font-extrabold text-on-love">
            {count > 9 ? "9+" : fmtInt(count)}
          </span>
        ) : null}
      </Button>

      {open ? (
        <div className="rise absolute top-full right-0 z-50 mt-2 w-[min(22rem,calc(100vw-1.5rem))] overflow-hidden rounded-[var(--r-card)] border-2 border-line-2 bg-surface shadow-[0_18px_40px_-12px_rgba(0,0,0,0.6)]">
          <p className="border-b border-line px-4 py-2.5 text-[11px] font-extrabold tracking-[0.1em] text-mute uppercase">
            While you were out
          </p>

          <ul className="col-scroll max-h-[22rem]">
            {status === "LoadingFirstPage" ? (
              Array.from({ length: 4 }, (_, i) => (
                <li key={i} className="flex gap-3 px-4 py-3">
                  <span className="shimmer size-7 shrink-0 rounded-full" />
                  <span className="shimmer h-8 flex-1 rounded-[8px]" />
                </li>
              ))
            ) : rows.length === 0 ? (
              <li className="px-4 py-8 text-center text-[13px] leading-relaxed text-mute">
                Nothing yet. Answers to your lines, agreement with them, and the
                day&rsquo;s hottest argument land here.
              </li>
            ) : (
              rows.map((n, i) => {
                const Icon = ICON[n.kind as keyof typeof ICON] ?? Bell;
                const tone = TONE[n.kind as keyof typeof TONE] ?? "text-mute";
                return (
                  <li key={n._id}>
                    <Button
                      bare
                      disabled={!n.slug}
                      onClick={() => {
                        setOpen(false);
                        if (n.slug) navigate(`/t/${n.slug}`);
                      }}
                      style={{ animationDelay: `${Math.min(i, 8) * 30}ms` }}
                      className={cn(
                        "stagger flex w-full items-start gap-3 border-b border-line px-4 py-3 text-left",
                        "transition-colors last:border-0 hover:bg-surface-2",
                        n.read ? "" : "bg-go-fill/[0.06]",
                      )}
                    >
                      {n.actor ? (
                        <Avatar name={n.actor} className="mt-0.5 size-7 text-[12px]" />
                      ) : (
                        <span className={cn("mt-0.5 grid size-7 shrink-0 place-items-center rounded-full bg-surface-3", tone)}>
                          <Icon weight="fill" className="size-3.5" />
                        </span>
                      )}

                      <span className="min-w-0 flex-1">
                        <span className="flex items-baseline gap-1.5">
                          <Icon weight="fill" className={cn("size-3 shrink-0", tone)} />
                          <span className="truncate text-[12.5px] font-bold text-ink">
                            {says(n.kind, n.actor)}
                          </span>
                          <span className="num shrink-0 text-[11px] text-mute">
                            {ago(n.at, Date.now())}
                          </span>
                        </span>
                        {n.excerpt ? (
                          <span className="mt-0.5 line-clamp-2 block text-[12.5px] leading-snug text-ink-3">
                            {n.kind === "hot" ? n.excerpt : `“${n.excerpt}”`}
                          </span>
                        ) : null}
                        {n.question && n.kind !== "hot" ? (
                          <span className="mt-1 line-clamp-1 block text-[11px] text-mute">
                            on {n.question}
                          </span>
                        ) : null}
                      </span>
                    </Button>
                  </li>
                );
              })
            )}
          </ul>
          {rows.length > 0 ? (
            <More
              sentinel={sentinel}
              status={status}
              onMore={() => loadMore(PAGE)}
              count={rows.length}
              noun="notices"
              className="!py-2"
            />
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
