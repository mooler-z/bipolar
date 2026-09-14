import { useEffect, useState } from "react";

/**
 * Idle sign-out for the staff console.
 *
 * A console left open on an unlocked machine is the cheapest way to lose an
 * account with `users:ban` on it, so the session ends itself. The warning comes
 * two minutes early and any activity clears it — the point is to close an
 * abandoned session, not to interrupt a working one.
 *
 * `visibilitychange` is bound to `document` because it never fires on `window`,
 * and returning to the tab counts as activity while leaving it does not.
 */
const IDLE_MS = 30 * 60 * 1000;
const WARN_MS = 2 * 60 * 1000;
const THROTTLE_MS = 1000;

const EVENTS = [
  "mousemove",
  "mousedown",
  "keydown",
  "scroll",
  "touchstart",
] as const;

export function useIdle(onExpire: () => void): { warning: boolean; stay: () => void } {
  const [warning, setWarning] = useState(false);

  // A counter, not a boolean: bumping it restarts the effect and therefore the
  // timers, which is the whole of "reset the clock".
  const [beat, setBeat] = useState(0);

  useEffect(() => {
    let last = 0;
    setWarning(false);

    const warn = window.setTimeout(() => setWarning(true), IDLE_MS - WARN_MS);
    const expire = window.setTimeout(onExpire, IDLE_MS);

    function activity() {
      const now = Date.now();
      if (now - last < THROTTLE_MS) return;
      last = now;
      setBeat((n) => n + 1);
    }
    function onVisible() {
      if (document.visibilityState === "visible") activity();
    }

    for (const e of EVENTS) {
      window.addEventListener(e, activity, { passive: true });
    }
    document.addEventListener("visibilitychange", onVisible);

    return () => {
      window.clearTimeout(warn);
      window.clearTimeout(expire);
      for (const e of EVENTS) window.removeEventListener(e, activity);
      document.removeEventListener("visibilitychange", onVisible);
    };
    // `beat` is the dependency that matters: every reset re-runs this effect.
  }, [beat, onExpire]);

  return { warning, stay: () => setBeat((n) => n + 1) };
}
