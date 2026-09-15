import { CaretLeft, CaretRight, ShieldCheck, SignOut } from "@phosphor-icons/react";

import { cn } from "../../lib/cn";
import { pathOf, reachable, type NavEntry } from "../../lib/admin-nav";
import { fmtInt } from "../../lib/format";
import { Avatar } from "../../ui/Avatar";
import { Button } from "../../ui/Button";
import { Wordmark } from "../../ui/Wordmark";

/**
 * The console's rail: where you are, and what else there is.
 *
 * **Every entry is permission-filtered from the same list the server enforces**
 * — a role never sees a door it cannot open. What it *does* see is the shape of
 * the whole console: sections that exist but are not built yet stay in place,
 * dimmed and marked, because a gap you can see is information and a gap you
 * cannot is a surprise later.
 *
 * A badge on an entry is a number that wants something from you — drafts
 * waiting on a decision, and nothing else. A console that badges everything
 * teaches people to ignore badges.
 *
 * It collapses to icons on a narrow window rather than disappearing, because
 * the one thing a rail must never do is leave somebody with no way back.
 */
export function Rail({
  identity,
  section,
  badges,
  collapsed,
  onToggle,
  onGo,
  onSignOut,
}: {
  identity: { displayName: string; role: string; permissions: string[] };
  section: string;
  /** Section id → a count worth acting on. */
  badges?: Record<string, number>;
  collapsed: boolean;
  onToggle: () => void;
  onGo: (path: string) => void;
  onSignOut: () => void;
}) {
  const entries = reachable(identity.permissions);

  return (
    <aside
      className={cn(
        "flex h-full min-h-0 shrink-0 flex-col border-r border-line bg-surface",
        "transition-[width] duration-200 ease-out",
        collapsed ? "w-[68px]" : "w-[68px] md:w-[clamp(13rem,15vw,15.5rem)]",
      )}
    >
      <div
        className={cn(
          "flex h-14 shrink-0 items-center border-b border-line",
          collapsed ? "justify-center px-2" : "gap-2 px-3 max-md:justify-center",
        )}
      >
        <Button
          bare
          onClick={() => onGo("/")}
          aria-label="Back to bipolar"
          className="lift"
        >
          <Wordmark markOnly={collapsed} className={collapsed ? "" : "max-md:hidden"} />
          {collapsed ? null : <Wordmark markOnly className="md:hidden" />}
        </Button>
        {collapsed ? null : (
          <span className="ml-auto flex items-center gap-1 rounded-[6px] bg-go-fill/12 px-2 py-0.5 text-[10px] font-extrabold tracking-[0.08em] text-go uppercase max-md:hidden">
            <ShieldCheck weight="fill" className="size-3" /> Staff
          </span>
        )}
      </div>

      <nav className="col-scroll flex-1 px-2 py-2.5">
        {entries.map((entry, i) => (
          <Row
            key={entry.id}
            entry={entry}
            heading={
              entry.group && entry.group !== entries[i - 1]?.group
                ? entry.group
                : null
            }
            active={entry.ready && section === entry.id}
            badge={badges?.[entry.id] ?? 0}
            collapsed={collapsed}
            index={i}
            onGo={onGo}
          />
        ))}
      </nav>

      <div className="shrink-0 border-t border-line p-2">
        <div
          className={cn(
            "flex items-center gap-2 rounded-[var(--r-btn)] p-1.5",
            collapsed ? "justify-center" : "max-md:justify-center",
          )}
        >
          <Avatar name={identity.displayName} />
          {collapsed ? null : (
            <>
              <span className="min-w-0 flex-1 leading-tight max-md:hidden">
                <span className="block truncate text-[12.5px] font-bold">
                  {identity.displayName}
                </span>
                <span className="block truncate text-[10.5px] font-bold tracking-[0.06em] text-mute uppercase">
                  {identity.role}
                </span>
              </span>
              <Button
                bare
                aria-label="Sign out"
                onClick={onSignOut}
                className="grid size-8 shrink-0 place-items-center rounded-[var(--r-sm)] text-mute transition-colors hover:bg-surface-3 hover:text-love max-md:hidden"
              >
                <SignOut className="size-4" />
              </Button>
            </>
          )}
        </div>

        <Button
          bare
          onClick={onToggle}
          aria-label={collapsed ? "Expand the rail" : "Collapse the rail"}
          className={cn(
            "mt-1 flex min-h-9 w-full items-center gap-2 rounded-[var(--r-sm)] px-2 max-md:hidden",
            "text-[12px] font-bold text-mute transition-colors hover:bg-surface-3 hover:text-ink",
            collapsed && "justify-center",
          )}
        >
          {collapsed ? (
            <CaretRight className="size-4" />
          ) : (
            <>
              <CaretLeft className="size-4" /> Collapse
            </>
          )}
        </Button>
      </div>
    </aside>
  );
}

function Row({
  entry,
  heading,
  active,
  badge,
  collapsed,
  index,
  onGo,
}: {
  entry: NavEntry;
  heading: string | null;
  active: boolean;
  badge: number;
  collapsed: boolean;
  index: number;
  onGo: (path: string) => void;
}) {
  const Icon = entry.icon;
  return (
    <>
      {heading ? (
        collapsed ? (
          <span aria-hidden className="my-2 block h-px bg-line" />
        ) : (
          <>
            <span aria-hidden className="my-2 block h-px bg-line md:hidden" />
            <p className="mt-4 mb-1 px-2.5 text-[10px] font-extrabold tracking-[0.1em] text-mute uppercase max-md:hidden">
              {heading}
            </p>
          </>
        )
      ) : null}

      <Button
        bare
        disabled={!entry.ready}
        title={entry.ready ? entry.blurb : `${entry.label} — not built yet`}
        aria-current={active ? "page" : undefined}
        onClick={() => onGo(pathOf(entry.id))}
        style={{ animationDelay: `${index * 35}ms` }}
        className={cn(
          "stagger relative flex min-h-10 w-full items-center gap-2.5 rounded-[var(--r-sm)] px-2.5",
          "text-[13px] font-bold transition-[background-color,color,transform] duration-150",
          collapsed ? "justify-center px-0" : "max-md:justify-center max-md:px-0",
          active
            ? "bg-surface-3 text-ink"
            : "text-ink-3 hover:translate-x-0.5 hover:bg-surface-2 hover:text-ink",
          !entry.ready && "!opacity-40",
        )}
      >
        {active ? (
          <span
            aria-hidden
            className="absolute inset-y-1.5 left-0 w-[3px] rounded-full bg-go-fill"
          />
        ) : null}
        <Icon weight={active ? "fill" : "regular"} className="size-[18px] shrink-0" />

        {collapsed ? null : (
          <>
            <span className="flex-1 text-left max-md:hidden">{entry.label}</span>
            {badge > 0 && entry.ready ? (
              <span className="num rounded-[var(--r-pill)] bg-coin-fill px-1.5 text-[10.5px] font-extrabold text-on-coin max-md:hidden">
                {fmtInt(badge)}
              </span>
            ) : null}
            {entry.ready ? null : (
              <span className="rounded-[4px] bg-surface-3 px-1.5 py-0.5 text-[9px] font-extrabold tracking-wide uppercase max-md:hidden">
                soon
              </span>
            )}
          </>
        )}

        {/* Collapsed, or on a narrow window, the badge has nowhere to sit —
            so it becomes a dot on the icon. The count is gone; the fact that
            something is waiting is not. */}
        {badge > 0 && entry.ready ? (
          <span
            aria-hidden
            className={cn(
              "absolute top-1.5 right-1.5 size-2 rounded-full bg-coin-fill",
              collapsed ? "" : "md:hidden",
            )}
          />
        ) : null}
      </Button>
    </>
  );
}
