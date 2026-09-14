import { useEffect, useRef, useState } from "react";

/**
 * Roll a number up to its value instead of printing it.
 *
 * A figure that appears has been calculated; a figure that climbs has been
 * *earned*, and the difference is most of why a result feels like a payoff.
 * Eased out, so it sprints and then settles rather than ticking mechanically.
 *
 * `overshoot` runs past the target and comes back — the winning percentage
 * on a result lands like something thrown, not something typed. Never used on
 * money: a balance that reads 3 for a frame when it is 2 is a lie, however
 * brief.
 */
export function useCountUp(to: number, ms = 900, overshoot = false): number {
  const [value, setValue] = useState(0);
  const frame = useRef(0);

  useEffect(() => {
    if (reducedMotion()) {
      setValue(to);
      return;
    }
    const start = performance.now();
    const tick = (now: number) => {
      const t = Math.min(1, (now - start) / ms);
      const eased = overshoot ? easeOutBack(t) : 1 - Math.pow(1 - t, 3);
      setValue(Math.max(0, Math.round(to * eased)));
      if (t < 1) frame.current = requestAnimationFrame(tick);
      else setValue(to);
    };
    frame.current = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame.current);
  }, [to, ms, overshoot]);

  return value;
}

/** Fast, then past the target, then settling — Penner's back ease. */
function easeOutBack(t: number): number {
  const c1 = 1.70158;
  const c3 = c1 + 1;
  return 1 + c3 * Math.pow(t - 1, 3) + c1 * Math.pow(t - 1, 2);
}

function reducedMotion(): boolean {
  return !!window.matchMedia?.("(prefers-reduced-motion: reduce)")?.matches;
}

/**
 * Grow a bar from nothing on first paint.
 *
 * Returns false for one frame so a width transition has something to animate
 * from — setting the final width immediately gives the browser nothing to
 * interpolate and the bar simply exists, which reads as a static image.
 */
export function useGrow(delay = 40): boolean {
  const [grown, setGrown] = useState(false);
  useEffect(() => {
    const id = window.setTimeout(() => setGrown(true), delay);
    return () => window.clearTimeout(id);
  }, [delay]);
  return grown;
}

/** Fire once when a number goes up — for the moment a streak extends. */
export function useIncreased(value: number): boolean {
  const previous = useRef(value);
  const [hit, setHit] = useState(false);

  useEffect(() => {
    if (value > previous.current) {
      setHit(true);
      const id = window.setTimeout(() => setHit(false), 600);
      previous.current = value;
      return () => window.clearTimeout(id);
    }
    previous.current = value;
  }, [value]);

  return hit;
}

/**
 * The time, ticking.
 *
 * A "2m ago" that never becomes "3m ago" is a small lie that a live rail tells
 * constantly. Re-renders on an interval so relative times stay true.
 */
export function useNow(everyMs = 15_000): number {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const id = window.setInterval(() => setNow(Date.now()), everyMs);
    return () => window.clearInterval(id);
  }, [everyMs]);
  return now;
}

/** `now` / `3m` / `2h` / `4d` — the shortest true thing about a timestamp. */
export function ago(at: number, now: number): string {
  const s = Math.max(0, Math.round((now - at) / 1000));
  if (s < 60) return "now";
  if (s < 3600) return `${Math.floor(s / 60)}m`;
  if (s < 86_400) return `${Math.floor(s / 3600)}h`;
  return `${Math.floor(s / 86_400)}d`;
}
