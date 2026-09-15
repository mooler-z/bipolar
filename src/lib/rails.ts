import { useCallback, useEffect, useState, type CSSProperties } from "react";

/**
 * Which rails are up.
 *
 * Three columns at once is the product's whole shape on a desk, and it is
 * also the complaint: readers said there was too much going on. So each rail
 * can be put away — but the column stays exactly where it is and its contents
 * go behind the weather instead. Collapsing the track reflowed the question,
 * which is the biggest type in the app jumping sideways the moment somebody
 * tidied a rail they were not even reading.
 *
 * Remembered per browser. Somebody who put a rail away meant it, and having to
 * do it again on every load is the same complaint one layer down.
 *
 * Only on a desk. Below `xl` the three are a swiped deck and there is nothing
 * to dock — a phone shows one at a time already.
 */

const STORE = "bipolar:rails";

export type Rails = { run: boolean; room: boolean };

function read(): Rails {
  try {
    const raw = window.localStorage.getItem(STORE);
    if (!raw) return { run: true, room: true };
    const value = JSON.parse(raw) as Partial<Rails>;
    return { run: value.run !== false, room: value.room !== false };
  } catch {
    // A private window, or storage the browser refuses: show everything.
    return { run: true, room: true };
  }
}

/**
 * How far the question's ground has to reach past its own column.
 *
 * A docked rail keeps its track — the question must not move when somebody
 * tidies a column they were not reading — and goes transparent, so what shows
 * through it is the middle's own ground carried out under it. The widths are
 * `--rail-l` and `--rail-r` in `index.css`, which is where the grid takes them
 * from too, so the reach and the track can never disagree.
 *
 * Zero below `xl`, where there is no grid and nothing to dock.
 *
 * It reaches exactly as far as the track it is filling. It used to overshoot,
 * to stop the fields tapering as they got to the edge — a blob is a radial
 * gradient and its last inch is its faintest — but overshooting *here* makes
 * the box lopsided by more than the column it covers, and the art inside a
 * lopsided box slides sideways with it: dock one rail and one answer was
 * winning behind the question before anybody had voted. `--ground-over` does
 * that job now, in `backdrop.css`, where it lands on both ends of the field at
 * once and therefore moves nothing.
 *
 * The fields keep the strength they have. Turning them up while a rail was
 * docked was tried and is a worse bargain than it sounds: it means the ground
 * behind the question changes every time somebody tidies a column, so the
 * page has two different moods for reasons that have nothing to do with the
 * question. Reaching further is the effect that was wanted; getting louder was
 * never part of it.
 */
export function bleed(rails: Rails, desk: boolean): CSSProperties {
  const docked = desk && (!rails.run || !rails.room);
  return {
    "--bleed-l": desk && !rails.run ? "var(--rail-l)" : "0px",
    "--bleed-r": desk && !rails.room ? "var(--rail-r)" : "0px",
    "--ground-over": docked ? "10rem" : "0px",
  } as CSSProperties;
}

export function useRails() {
  const [rails, setRails] = useState<Rails>(read);

  useEffect(() => {
    try {
      window.localStorage.setItem(STORE, JSON.stringify(rails));
    } catch {
      /* Remembering is a nicety; showing the rails is not a failure. */
    }
  }, [rails]);

  const toggle = useCallback((which: keyof Rails) => {
    setRails((was) => ({ ...was, [which]: !was[which] }));
  }, []);

  return { rails, toggle };
}
