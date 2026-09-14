import { useEffect, useState, type ReactNode } from "react";
import { MagnifyingGlass, Warning } from "@phosphor-icons/react";

import { cn } from "../../lib/cn";
import { useIdle } from "../../lib/useIdle";
import { Button } from "../../ui/Button";
import { Palette } from "./Palette";
import { Sidebar } from "./Sidebar";

/**
 * The staff console's frame.
 *
 * A fixed-height two-column shell: the rail owns its width, the content owns
 * its own scrollbar, and the window never scrolls. Same reasoning as the public
 * console — three things are true at once here and a page-level scrollbar makes
 * all of them move together.
 *
 * The session ends itself after thirty minutes idle. That is not a nicety: this
 * is the surface where an account holds `users:ban`, and an abandoned tab on an
 * unlocked machine is the cheapest way to lose one.
 */
export type Identity = {
  displayName: string;
  email: string;
  role: string;
  permissions: string[];
};

export function Shell({
  identity,
  section,
  title,
  onGo,
  onSignOut,
  children,
}: {
  identity: Identity;
  section: string;
  title: string;
  onGo: (path: string) => void;
  onSignOut: () => void;
  children: ReactNode;
}) {
  const [collapsed, setCollapsed] = useState(false);
  const [palette, setPalette] = useState(false);
  const { warning, stay } = useIdle(onSignOut);

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key.toLowerCase() === "k" && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        setPalette((p) => !p);
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  return (
    <div className="flex h-[100dvh] overflow-hidden bg-canvas">
      <Sidebar
        identity={identity}
        section={section}
        collapsed={collapsed}
        onToggle={() => setCollapsed((c) => !c)}
        onGo={onGo}
        onSignOut={onSignOut}
      />

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="flex h-16 shrink-0 items-center gap-4 border-b border-line px-5">
          <h1 className="display shrink-0 text-[18px]">{title}</h1>

          <Button
            bare
            onClick={() => setPalette(true)}
            className={cn(
              "lift flex min-h-9 max-w-md flex-1 items-center gap-2.5 rounded-[var(--r-pill)]",
              "border border-line bg-surface-2 px-3.5 text-[13px] font-medium text-mute",
              "hover:border-mute hover:text-ink-3",
            )}
          >
            <MagnifyingGlass className="size-4 shrink-0" />
            <span className="flex-1 truncate text-left">Jump to a section…</span>
            <kbd className="rounded-[5px] bg-surface-3 px-1.5 py-0.5 text-[10px] font-bold">
              &#8984;K
            </kbd>
          </Button>

          <span className="flex-1" />

          <Button variant="ghost" size="sm" onClick={() => onGo("/")}>
            Back to the app
          </Button>
        </header>

        {/* An idle warning is a banner, not a toast: it must not be dismissable
            by looking away, which is exactly what being idle is. */}
        {warning ? (
          <div className="flex shrink-0 items-center gap-3 border-b border-coin/40 bg-coin/12 px-5 py-2.5">
            <Warning weight="fill" className="size-4 shrink-0 text-coin" />
            <span className="text-[13px] font-bold text-coin">
              Signing you out in two minutes — this console idles out.
            </span>
            <span className="flex-1" />
            <Button variant="coin" size="sm" onClick={stay}>
              Stay signed in
            </Button>
          </div>
        ) : null}

        <main className="col-scroll flex-1 p-6">{children}</main>
      </div>

      <Palette
        open={palette}
        onClose={() => setPalette(false)}
        permissions={identity.permissions}
        onGo={onGo}
      />
    </div>
  );
}
