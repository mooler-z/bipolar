import { useEffect, useRef, useState } from "react";
import { ArrowRight } from "@phosphor-icons/react";

import { cn } from "../../lib/cn";
import type { Card } from "../../lib/phoneTour";
import { Button } from "../../ui/Button";
import { TourArt } from "./TourArt";

/**
 * The walkthrough, on a phone, once.
 *
 * It is a **scroller, not a slideshow**: the cards sit in a snapped row and a
 * swipe moves between them. That is the point — the first thing this product
 * asks a thumb to do is swipe a snapped panel, and a tutorial that taught
 * swiping with a Next button would be teaching it with the wrong hand. The
 * button is there as well, because somebody who has not worked out the gesture
 * yet must not be trapped inside the screen explaining gestures.
 *
 * It never appears above `xl`, where the keyboard tour runs instead, and it
 * says nothing about keys — a phone has none, and a lesson you cannot practise
 * is a lesson that reads as a list of things you are missing.
 *
 * A dismiss is final, whichever way it was dismissed. Somebody who swiped past
 * the last card has finished; somebody who pressed Skip has decided; neither
 * wants it again tomorrow.
 */
export function PhoneTour({ cards, onDone }: { cards: Card[]; onDone: () => void }) {
  const [at, setAt] = useState(0);
  const track = useRef<HTMLDivElement | null>(null);
  const last = at === cards.length - 1;

  /* The console behind it is a scroller too, and a tutorial you can swipe the
     page out from under is a tutorial nobody reads to the end. */
  useEffect(() => {
    const was = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = was;
    };
  }, []);

  function goTo(i: number) {
    const el = track.current;
    if (!el) return;
    el.scrollTo({ left: i * el.clientWidth, behavior: "smooth" });
  }

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="How this works"
      className="fixed inset-0 z-[60] flex flex-col justify-end bg-canvas/80 backdrop-blur-sm xl:hidden"
    >
      <div className="slide-up rounded-t-[22px] border-t-2 border-line-2 bg-surface pb-[max(1rem,env(safe-area-inset-bottom))]">
        {/* The grab handle, which is also the promise that this is a sheet. */}
        <span aria-hidden className="mx-auto mt-2.5 block h-1 w-9 rounded-full bg-surface-4" />

        <div
          ref={track}
          onScroll={(e) => {
            const el = e.currentTarget;
            setAt(Math.round(el.scrollLeft / Math.max(1, el.clientWidth)));
          }}
          className="flex snap-x snap-mandatory overflow-x-auto overscroll-x-contain [scrollbar-width:none]"
        >
          {cards.map((card) => (
            <section
              key={card.title}
              className="w-full shrink-0 snap-center snap-always px-6 pt-4 pb-1 text-center"
            >
              <TourArt art={card.art} />
              <h2 className="mt-4 text-[19px] leading-tight font-extrabold text-ink">
                {card.title}
              </h2>
              <p className="mx-auto mt-1.5 max-w-[19rem] text-[13.5px] leading-snug text-ink-3">
                {card.body}
              </p>
            </section>
          ))}
        </div>

        <div className="mt-3 flex items-center justify-between gap-3 px-5">
          <Button
            bare
            onClick={onDone}
            className="min-h-9 px-1 text-[12.5px] font-bold text-mute transition-colors hover:text-ink"
          >
            Skip
          </Button>

          <span aria-hidden className="flex items-center gap-1.5">
            {cards.map((card, i) => (
              <span
                key={card.title}
                className={cn(
                  "h-1.5 rounded-full transition-all duration-300",
                  i === at ? "w-5 bg-go-fill" : "w-1.5 bg-surface-4",
                )}
              />
            ))}
          </span>

          <Button
            variant="go"
            size="sm"
            onClick={() => (last ? onDone() : goTo(at + 1))}
            className="!min-h-9 !px-3.5"
          >
            {last ? "Start" : "Next"}
            {last ? null : <ArrowRight weight="bold" className="size-3.5" />}
          </Button>
        </div>
      </div>
    </div>
  );
}
