import { useCallback, useEffect, useState } from "react";
import { CaretDown } from "@phosphor-icons/react";

import { cn } from "../../lib/cn";
import { Button } from "../../ui/Button";

/**
 * The phone deck: the same three panels, one screen each, snapped.
 *
 * A desktop shows the run, the decision and the room at once; a phone cannot,
 * and stacking them into one long page buries the vote under a rail nobody
 * asked for. So below `xl` the three become a vertical deck — the question
 * owns the screen, a swipe up lands squarely on the room, another on the run,
 * and a swipe down comes back to the question. `scroll-snap-stop: always` is
 * what makes it *land* on each one rather than fling past two of them.
 *
 * Nothing here exists above `xl`: the same markup is a grid there, and the
 * observer reports every panel on screen at once, which is why the pager is
 * hidden rather than merely idle.
 */

export type Deck = {
  /** A callback ref: the deck is mounted late, after the first query lands. */
  ref: (node: HTMLDivElement | null) => void;
  /** Which panel is filling the screen. Panels are in DOM order. */
  active: number;
  count: number;
  goTo: (index: number) => void;
};

/** Put `ref` on the scroller and `data-panel` on each child that is a screen. */
export function useDeck(): Deck {
  /*
   * A callback ref, not `useRef`.
   *
   * Both views render a loading shell before the first query lands, so the
   * scroller does not exist on the first pass. An effect that read a ref once
   * on mount would find nothing, never run again, and leave the pager showing
   * a deck of zero panels — which is exactly what it did.
   */
  const [root, setRoot] = useState<HTMLDivElement | null>(null);
  const ref = useCallback((node: HTMLDivElement | null) => setRoot(node), []);
  const [active, setActive] = useState(0);
  const [count, setCount] = useState(0);

  useEffect(() => {
    if (!root) {
      setCount(0);
      return;
    }
    const panels = Array.from(root.querySelectorAll<HTMLElement>("[data-panel]"));
    setCount(panels.length);
    if (panels.length === 0) return;

    const watch = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) {
            setActive(panels.indexOf(entry.target as HTMLElement));
          }
        }
      },
      // Half a screen: whichever panel owns most of the viewport is the one
      // you are on, which is true the moment a snap begins rather than when
      // it finishes.
      { root, threshold: 0.5 },
    );
    for (const panel of panels) watch.observe(panel);
    return () => watch.disconnect();
  }, [root]);

  const goTo = useCallback(
    (index: number) => {
      const panels = root?.querySelectorAll<HTMLElement>("[data-panel]");
      panels?.[index]?.scrollIntoView({ behavior: "smooth", block: "start" });
    },
    [root],
  );

  return { ref, active, count, goTo };
}

/**
 * Where you are in the deck, and a way to anywhere else.
 *
 * A dot per panel on the right edge — the active one stretches into a bar.
 * Small, out of the content, and always reachable with a thumb.
 */
export function Pager({ deck, labels }: { deck: Deck; labels: string[] }) {
  if (deck.count < 2) return null;
  return (
    <nav
      aria-label="Sections"
      className="fixed top-1/2 right-1.5 z-30 flex -translate-y-1/2 flex-col gap-2 xl:hidden"
    >
      {labels.slice(0, deck.count).map((label, i) => {
        const here = deck.active === i;
        return (
          <Button
            key={label}
            bare
            aria-label={label}
            aria-current={here ? "true" : undefined}
            title={label}
            onClick={() => deck.goTo(i)}
            className="grid h-7 w-6 place-items-center"
          >
            <span
              className={cn(
                "w-1.5 rounded-full transition-all duration-300",
                here ? "h-5 bg-go-fill" : "h-1.5 bg-surface-4",
              )}
            />
          </Button>
        );
      })}
    </nav>
  );
}

/**
 * The nudge: proof there is anything below the first screen.
 *
 * It sits in the decision's own foot rather than floating over it, because a
 * pill hovering above the two answers is a pill covering the two answers.
 */
export function DeckHint({ label, onGo }: { label: string; onGo: () => void }) {
  return (
    <Button
      bare
      onClick={onGo}
      className="flex items-center gap-1.5 text-[11.5px] font-bold text-mute transition-colors hover:text-ink"
    >
      <CaretDown weight="bold" className="bob size-3.5" />
      {label}
    </Button>
  );
}
