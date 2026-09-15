import { useCallback, useMemo, useState } from "react";

/**
 * A walkthrough of the keyboard, one key at a time.
 *
 * Rule 5 says the keyboard is a real path through this product, not an
 * accessibility afterthought — but a path nobody is told about is a path
 * nobody walks, and a permanent row of key caps under the answer is furniture
 * everybody stops seeing by the third question.
 *
 * So it is a tour instead. One step is on screen at a time, it names the key
 * and what that key does, it points at the control it is about, and it
 * advances the moment the key is actually pressed — not on a timer and not on
 * a "next" button, because the step *is* the practice. Pressing the control
 * with the mouse teaches nothing and does not advance it.
 *
 * It can be walked out of at any point, and it never comes back: finished or
 * skipped, both end as every key learned.
 *
 * Remembered per browser, because it is about this person's hands. A cleared
 * store just means the tour runs again, which is the safe direction to fail.
 */

const STORE = "bipolar:keys-learned";

export type KeyName = "l" | "h" | "space" | "right" | "left" | "u" | "enter";

export type Lesson = {
  name: KeyName;
  /** What is printed on the cap. */
  cap: string;
  /** Completes "Press L to …". */
  does: string;
  /** The control it points at, for the spotlight. */
  points: "arena" | "spark" | "skip" | "back" | null;
  /** Which screen can teach it. */
  on: "question" | "result";
};

/**
 * The order of the tour. Answer first, because that is the product; the money
 * second, because it only means something once you have answered for free;
 * the ways out last.
 */
export const LESSONS: Lesson[] = [
  { name: "l", cap: "L", does: "love it", points: "arena", on: "question" },
  { name: "h", cap: "H", does: "hate it", points: "arena", on: "question" },
  { name: "space", cap: "space", does: "back it with a spark", points: "spark", on: "question" },
  { name: "right", cap: "→", does: "skip the question", points: "skip", on: "question" },
  { name: "left", cap: "←", does: "go back one", points: "back", on: "question" },
  { name: "enter", cap: "↵", does: "take the next topic", points: null, on: "result" },
  { name: "u", cap: "U", does: "take the vote back", points: null, on: "result" },
];

/** The tour is the question's keys. The reveal's two carry their own caps. */
const TOUR = LESSONS.filter((k) => k.on === "question");

function read(): Set<KeyName> {
  try {
    const raw = window.localStorage.getItem(STORE);
    return new Set(raw ? (JSON.parse(raw) as KeyName[]) : []);
  } catch {
    // A private window, or storage the browser refuses: run the tour.
    return new Set();
  }
}

function write(keys: Set<KeyName>) {
  try {
    window.localStorage.setItem(STORE, JSON.stringify([...keys]));
  } catch {
    /* Remembering is a nicety; teaching twice is not a failure. */
  }
}

export type Tour = {
  /** The step on screen, or null when the tour is over. */
  step: Lesson | null;
  /** 1-based, for "2 of 5". */
  index: number;
  total: number;
  /** Walk out. Ends the tour for good, exactly as finishing it does. */
  skip: () => void;
};

export function useKeyTutor() {
  const [learned, setLearned] = useState<Set<KeyName>>(read);

  /** A key did something. If it was the step on screen, the tour moves on. */
  const mark = useCallback((name: KeyName) => {
    setLearned((was) => {
      if (was.has(name)) return was;
      const next = new Set(was).add(name);
      write(next);
      return next;
    });
  }, []);

  const skip = useCallback(() => {
    setLearned((was) => {
      const next = new Set(was);
      for (const k of LESSONS) next.add(k.name);
      write(next);
      return next;
    });
  }, []);

  const tour = useMemo<Tour>(() => {
    const step = TOUR.find((k) => !learned.has(k.name)) ?? null;
    return {
      step,
      index: step ? TOUR.indexOf(step) + 1 : TOUR.length,
      total: TOUR.length,
      skip,
    };
  }, [learned, skip]);

  return { mark, tour };
}
