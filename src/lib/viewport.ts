import { useEffect, useState } from "react";

/**
 * Is this the desk, or the deck?
 *
 * `xl` — the same 1280px the layout turns on, quoted once here rather than
 * spelled out at each call site, because a breakpoint that lives in two places
 * eventually lives at two different numbers.
 *
 * This exists because one decision genuinely cannot be made in CSS: the
 * keyboard walkthrough puts the product into a **rehearsal**, where nothing a
 * press does is sent, and it leaves that state only when every key has been
 * pressed. Hiding the tour with `xl:flex` hid the pill and left the rehearsal
 * running — so on a phone, which has no keys to finish it with, every tap on
 * every answer did nothing at all, for good. A class cannot fix that; the tour
 * has to not be handed to the column in the first place.
 */
const DESK = "(min-width: 1280px)";

export function useIsDesk(): boolean {
  const [desk, setDesk] = useState(() => {
    try {
      return window.matchMedia(DESK).matches;
    } catch {
      // No matchMedia: assume the desk, which is the product's own shape.
      return true;
    }
  });

  useEffect(() => {
    const mq = window.matchMedia?.(DESK);
    if (!mq) return;
    const onChange = () => setDesk(mq.matches);
    onChange();
    mq.addEventListener("change", onChange);
    return () => mq.removeEventListener("change", onChange);
  }, []);

  return desk;
}
