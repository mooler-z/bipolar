import { CaretLeft, CaretRight, ShieldCheck, SignOut } from "@phosphor-icons/react";

import { cn } from "../../lib/cn";
import { pathOf, reachable, type NavEntry } from "../../lib/admin-nav";
import { Avatar } from "../../ui/Avatar";
import { Button } from "../../ui/Button";
import { Wordmark } from "../../ui/Wordmark";

/**
 * The console's rail.
 *
 * **Every entry is permission-filtered from the same list the server enforces**
 * — a role never sees a door it cannot open. What it *does* see is the shape of
 * the whole console: sections that exist but are not built yet stay in place,
 * dimmed and marked, because a gap you can see is information and a gap you
 * cannot is a surprise later.
 *
 * The active section carries a green edge, the way the room's tabs do; the
 * rail is the same product as the console it administers and looks like it.
 */
export function Sidebar({
  identity,
  section,
  collapsed,
  onToggle,
  onGo,
  onSignOut,
}: {
  identity: { displayName: string; email: string; role: string; permissions: string[] };
  section: string;
  collapsed: boolean;
  onToggle: () => void;
  onGo: (path: string) => void;
  onSignOut: () => void;
}) {
  const entries = reachable(identity.permissions);

  return (
    <aside
      className={cn(
        "rail flex h-full min-h-0 flex-col border-r border-line",
        "transition-[width] duration-200 ease-out",
        collapsed ? "w-[72px]" : "w-[248px]",
      )}
    >
      <div
        className={cn(
          "flex h-14 shrink-0 items-center border-b border-line",
          collapsed ? "justify-center px-2" : "gap-2 px-3",
        )}
      >
        <Button bare onClick={() => onGo("/")} aria-label="Back to bi-polar" className="lift">
          <Wordmark markOnly={collapsed} />
        </Button>
        {collapsed ? null : (
          <span className="ml-auto flex items-center gap-1 rounded-[6px] bg-go-fill/12 px-2 py-0.5 text-[10px] font-extrabold tracking-[0.08em] text-go uppercase">
            <ShieldCheck weight="fill" className="size-3" /> Staff
          </span>
        )}
      </div>

      <nav className="col-scroll flex-1 p-2">
        {entries.map((entry, i) => (
          <NavRow
            key={entry.id}
            entry={entry}
            heading={entry.group && entry.group !== entries[i - 1]?.group ? entry.group : null}
            active={entry.ready && section === entry.id}
            collapsed={collapsed}
            index={i}
            onGo={onGo}
          />
        ))}
      </nav>

      <div className="shrink-0 border-t border-line p-2">
        <div className={cn("flex items-center gap-2 rounded-[var(--r-btn)] p-2", collapsed && "justify-center")}>
          <Avatar name={identity.displayName} />
          {collapsed ? null : (
            <span className="min-w-0 flex-1 leading-tight">
              <span className="block truncate text-[12.5px] font-bold">{identity.displayName}</span>
              <span className="block truncate text-[10.5px] font-bold tracking-[0.06em] text-mute uppercase">
                {identity.role}
              </span>
            </span>
          )}
          {collapsed ? null : (
            <Button
              bare
              aria-label="Sign out"
              onClick={onSignOut}
              className="grid size-8 shrink-0 place-items-center rounded-[var(--r-sm)] text-mute transition-colors hover:bg-surface-3 hover:text-love"
            >
              <SignOut className="size-4" />
            </Button>
          )}
        </div>

        <Button
          bare
          onClick={onToggle}
          aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
          className={cn(
            "mt-1 flex min-h-9 w-full items-center gap-2 rounded-[var(--r-sm)] px-2",
            "text-[12px] font-bold text-mute transition-colors hover:bg-surface-3 hover:text-ink",
            collapsed && "justify-center",
          )}
        >
          {collapsed ? <CaretRight className="size-4" /> : <><CaretLeft className="size-4" /> Collapse</>}
        </Button>
      </div>
    </aside>
  );
}

function NavRow({
  entry,
  heading,
  active,
  collapsed,
  index,
  onGo,
}: {
  entry: NavEntry;
  heading: string | null;
  active: boolean;
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
          <p className="mt-4 mb-1 px-2.5 text-[10px] font-extrabold tracking-[0.1em] text-mute uppercase">
            {heading}
          </p>
        )
      ) : null}

      <Button
        bare
        disabled={!entry.ready}
        title={collapsed ? entry.label : undefined}
        aria-current={active ? "page" : undefined}
        onClick={() => onGo(pathOf(entry.id))}
        style={{ animationDelay: `${index * 35}ms` }}
        className={cn(
          "stagger relative flex min-h-10 w-full items-center gap-2.5 rounded-[var(--r-sm)] px-2.5",
          "text-[13px] font-bold transition-[background-color,color,transform] duration-150",
          collapsed && "justify-center px-0",
          active
            ? "bg-surface-4 text-ink"
            : "text-ink-3 hover:translate-x-0.5 hover:bg-surface-2 hover:text-ink",
          !entry.ready && "!opacity-40",
        )}
      >
        {active ? (
          <span aria-hidden className="absolute inset-y-2 left-0 w-[3px] rounded-full bg-go-fill" />
        ) : null}
        <Icon weight={active ? "fill" : "regular"} className="size-[18px] shrink-0" />
        {collapsed ? null : (
          <>
            <span className="flex-1 text-left">{entry.label}</span>
            {entry.ready ? null : (
              <span className="rounded-[4px] bg-surface-3 px-1.5 py-0.5 text-[9px] font-extrabold tracking-wide uppercase">
                soon
              </span>
            )}
          </>
        )}
      </Button>
    </>
  );
}
