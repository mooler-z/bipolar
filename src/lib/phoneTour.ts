import { useCallback, useState } from "react";

/**
 * The walkthrough a phone gets, which is a different walkthrough.
 *
 * The keyboard tour teaches keys, and a phone has none — so running it there
 * taught nothing and took the screen to do it. This one teaches the things a
 * thumb has to discover instead: that the screen is a deck of three and a
 * swipe moves it, that answering is a tap, what a spark buys, that a vote is
 * takeable-back for nine seconds, and that the argument is a swipe away.
 *
 * **Never the keyboard.** Nothing here mentions a key, on purpose.
 *
 * It is shown once per browser, like the keyboard tour, and remembered under
 * its own name — somebody who learned the keys on a desktop has learned
 * nothing about swiping, and the two stores would otherwise silence each other.
 * A cleared store means it runs again, which is the safe direction to fail.
 */

const STORE = "bipolar:phone-toured";

export type Art = "deck" | "answer" | "spark" | "undo" | "talk";

export type Card = {
  art: Art;
  title: string;
  /** Two lines at most. A tutorial nobody finishes reading taught nothing. */
  body: string;
};

export const CARDS: Card[] = [
  {
    art: "answer",
    title: "Tap a side",
    body: "Love it or hate it. One tap answers, and the room's split lands in the same frame.",
  },
  {
    art: "deck",
    title: "The screen is a deck",
    body: "Swipe up for the room, again for your run. Swipe back down to the question.",
  },
  {
    art: "spark",
    title: "Back it with a spark",
    body: "A free vote is the crowd. A spark is 50¢ from your wallet, counted in its own layer.",
  },
  {
    art: "undo",
    title: "Nine seconds to change your mind",
    body: "Undo sits under the result while the countdown runs. After that the vote is final.",
  },
  {
    art: "talk",
    title: "Argue about it",
    body: "The room is where the comments are. Type @ to name somebody who is already in the thread.",
  },
];

function seen(): boolean {
  try {
    return window.localStorage.getItem(STORE) === "1";
  } catch {
    // A private window, or storage the browser refuses: show it.
    return false;
  }
}

export function usePhoneTour() {
  const [done, setDone] = useState(seen);

  const finish = useCallback(() => {
    setDone(true);
    try {
      window.localStorage.setItem(STORE, "1");
    } catch {
      /* Remembering is a nicety; teaching twice is not a failure. */
    }
  }, []);

  return { open: !done, cards: CARDS, finish };
}
