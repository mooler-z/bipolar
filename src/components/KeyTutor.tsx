import { X } from "@phosphor-icons/react";

import type { Tour } from "../lib/keyTutor";
import { cn } from "../lib/cn";
import { Button } from "../ui/Button";

/**
 * One step of the keyboard walkthrough.
 *
 * It names the key, says what pressing it does, and shows how far along the
 * tour is. It advances only when the key is actually pressed — the control it
 * points at is lit at the same time, so the instruction and the thing it is
 * about are never in two different places.
 *
 * While it runs, the product is a **rehearsal**: the controls still move under
 * a mouse and nothing is sent. The word is on the pill, because an arena that
 * animates a press and does not count it owes the reader an explanation.
 *
 * When the tour is done this becomes the quiet line of caps the foot always
 * had. Somebody who learned the keys last week still wants reminding which is
 * which; it is the *tour* that should not outstay its welcome.
 *
 * Desk only. A key cap on a phone is a hint about nothing.
 */
export function KeyTutor({ tour }: { tour: Tour }) {
  const step = tour.step;

  /* The tour is what is temporary. Once it is walked — or skipped — the foot
     goes back to the quiet line of caps it always had, because somebody who
     learned the keys last week still wants reminding which is which. */
  if (!step) {
    return (
      <span className="hidden items-center gap-1.5 text-[11.5px] text-mute xl:flex">
        <kbd className="key">L</kbd>
        <kbd className="key">H</kbd>
        <span className="ml-1">to answer</span>
        <span className="mx-1 text-line-2">·</span>
        <kbd className="key">space</kbd>
        <span className="ml-1">to back it</span>
      </span>
    );
  }

  return (
    <span
      key={step.name}
      className={cn(
        "pop-in hidden items-center gap-2.5 rounded-[var(--r-btn)] xl:flex",
        "border-2 border-go-fill/45 bg-go-fill/[0.08] py-1 pr-1 pl-2.5",
      )}
    >
      <kbd className="key !bg-go-fill !px-2 !text-on-go !shadow-none">{step.cap}</kbd>
      <span className="text-[12.5px] font-bold text-ink">to {step.does}</span>
      {/* Said out loud, because the arena still animates under a mouse press
          and a reader is owed the truth about whether it counted. */}
      <span className="text-[11px] font-bold text-coin">practice</span>
      <span className="num text-[11px] font-bold text-mute">
        {tour.index}/{tour.total}
      </span>
      <Button
        bare
        aria-label="Skip the keyboard tour"
        title="Skip the tour"
        onClick={tour.skip}
        className="grid size-6 place-items-center rounded-[6px] text-mute transition-colors hover:bg-surface-3 hover:text-ink"
      >
        <X weight="bold" className="size-3.5" />
      </Button>
    </span>
  );
}

/** What the current step points at gets a ring. Nothing else moves. */
export function spotlit(tour: Tour, what: NonNullable<Tour["step"]>["points"]): string {
  return tour.step?.points === what
    ? "rounded-[var(--r-btn)] ring-2 ring-go-fill ring-offset-4 ring-offset-canvas animate-pulse"
    : "";
}
