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
 * Out of the content, and always reachable with a thumb.
 *
 * It rides its own capsule. Readers said they could not see it, and they were
 * right: a `--surface-4` dot sits two steps off the canvas, which disappears
 * outright over the question's ground and over any image the deck happens to
 * be scrolled onto. So the dots are carried on a blurred plate of their own
 * and drawn in ink rather than in a surface grey — the one colour that holds
 * on whatever the panel behind them is doing. The active one keeps its colour
 * and gains a halo, because "which one is lit" is the thing being asked.
 */
export function Pager({ deck, labels }: { deck: Deck; labels: string[] }) {
  if (deck.count < 2) return null;
  return (
    <nav
      aria-label="Sections"
      className={cn(
        "fixed top-1/2 right-2 z-30 flex -translate-y-1/2 flex-col items-center gap-1.5 xl:hidden",
        "rounded-full border border-line-2/70 bg-canvas/45 px-1 py-1.5 backdrop-blur-md",
      )}
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
            className="grid h-7 w-5 place-items-center"
          >
            <span
              className={cn(
                "w-2 rounded-full transition-all duration-300",
                here
                  ? "h-6 bg-go-fill shadow-[0_0_8px_var(--go-fill)]"
                  : "h-2 bg-ink/45",
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
