import { useEffect, useState, type ReactNode } from "react";
import { useQuery } from "convex/react";
import { Warning } from "@phosphor-icons/react";

import { api } from "../../../convex/_generated/api";
import { entryOf } from "../../lib/admin-nav";
import { useIdle } from "../../lib/useIdle";
import { Button } from "../../ui/Button";
import { Bar } from "./Bar";
import { Palette } from "./Palette";
import { Rail } from "./Rail";

/**
 * The staff console's frame.
 *
 * Three zones that fill the window and never scroll it — the rail, the work,
 * the aside — with their three header strips lined up across the top so the
 * whole console reads as one grid rather than three panels that happen to be
 * adjacent. The sections render the work and the aside; this owns everything
 * around them.
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

export function Console({
  identity,
  section,
  onGo,
  onSignOut,
  children,
}: {
  identity: Identity;
  section: string;
  onGo: (path: string) => void;
  onSignOut: () => void;
  /** The section: a `Work` and an `Aside`, in that order. */
  children: ReactNode;
}) {
  const [collapsed, setCollapsed] = useState(false);
  const [palette, setPalette] = useState(false);
  const { warning, stay } = useIdle(onSignOut);
  const entry = entryOf(section);

  /* The one number in this console that wants something from you. Every staff
     role holds `topics:update`, so this is safe to ask for from the frame. */
  const discovery = useQuery(api.settings.discovery);

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
      <Rail
        identity={identity}
        section={section}
        badges={{ queue: discovery?.pending ?? 0 }}
        collapsed={collapsed}
        onToggle={() => setCollapsed((c) => !c)}
        onGo={onGo}
        onSignOut={onSignOut}
      />

      <div className="flex min-w-0 flex-1 flex-col">
        {/* An idle warning is a banner, not a toast: it must not be dismissable
            by looking away, which is exactly what being idle is. */}
        {warning ? (
          <div className="slide-up flex shrink-0 items-center gap-3 bg-coin-fill px-4 py-2.5 text-on-coin">
            <Warning weight="fill" className="size-4 shrink-0" />
            <span className="text-[13px] font-extrabold">
              Signing you out in two minutes — this console idles out.
            </span>
            <span className="flex-1" />
            <Button variant="steel" size="sm" onClick={stay}>
              Stay signed in
            </Button>
          </div>
        ) : null}

        <Bar
          title={entry.label}
          blurb={entry.blurb}
          onPalette={() => setPalette(true)}
          onGo={onGo}
        />

        {/* The work and the aside, side by side. A section renders both. */}
        <div className="flex min-h-0 flex-1">{children}</div>
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
