import { useEffect, useRef, useState } from "react";

/**
 * Roll a number up to its value instead of printing it.
 *
 * A figure that appears has been calculated; a figure that climbs has been
 * *earned*, and the difference is most of why a result feels like a payoff.
 * Eased out, so it sprints and then settles rather than ticking mechanically.
 */
export function useCountUp(to: number, ms = 900): number {
  const [value, setValue] = useState(0);
  const frame = useRef(0);

  useEffect(() => {
    const reduced = window.matchMedia?.(
      "(prefers-reduced-motion: reduce)",
    )?.matches;
    if (reduced) {
      setValue(to);
      return;
    }

    const from = 0;
    const start = performance.now();
    const tick = (now: number) => {
      const t = Math.min(1, (now - start) / ms);
      // Cubic ease-out: fast, then settling.
      const eased = 1 - Math.pow(1 - t, 3);
      setValue(Math.round(from + (to - from) * eased));
      if (t < 1) frame.current = requestAnimationFrame(tick);
    };
    frame.current = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame.current);
  }, [to, ms]);

  return value;
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
