import type { ReactNode } from "react";
import { X } from "@phosphor-icons/react";

import { cn } from "../../lib/cn";
import { Button } from "../../ui/Button";

/**
 * The console's two working columns.
 *
 * Every section renders exactly these: the **work**, which is the list or the
 * grid being operated on, and the **aside**, which is context for whatever is
 * selected in it. That is the whole structure of this console, and it is the
 * public one's structure turned to a different job — there, a vote never
 * navigates anywhere and the middle column swaps around you; here, opening a
 * topic never navigates anywhere either. A moderator who has to leave a filtered
 * list of eighty rows to look at one of them, and then find their place again,
 * is a moderator who stops looking.
 *
 * Both columns own their own scrollbar. The window never scrolls — the three
 * header strips across the top of the rail, the work and the aside line up, and
 * a page-level scrollbar would move all three at once.
 */
export function Work({
  toolbar,
  footer,
  children,
}: {
  /** The section's own controls. Sits on the strip, not in the list. */
  toolbar?: ReactNode;
  /** Anything that must stay in view while the list scrolls under it. */
  footer?: ReactNode;
  children: ReactNode;
}) {
  return (
    <section className="flex min-w-0 flex-1 flex-col">
      {toolbar ? (
        <div className="flex h-14 shrink-0 items-center gap-2.5 border-b border-line px-4">
          {toolbar}
        </div>
      ) : null}
      <div className="col-scroll flex-1 p-4">{children}</div>
      {footer}
    </section>
  );
}

/**
 * The right-hand column.
 *
 * A static third column on a desk. Below the console's own breakpoint there is
 * no room for three, so it becomes a sheet over the work — but only when
 * something is actually selected. Its resting content (the record) is a desk
 * luxury and simply steps aside on a narrow screen rather than being stacked
 * underneath the list where nobody would ever scroll to it.
 */
export function Aside({
  title,
  icon,
  sheet = false,
  onClose,
  children,
}: {
  title: string;
  icon?: ReactNode;
  /** Something is selected: on a narrow screen this becomes an overlay. */
  sheet?: boolean;
  onClose?: () => void;
  children: ReactNode;
}) {
  return (
    <>
      {sheet ? (
        <span
          aria-hidden
          onClick={onClose}
          className="fixed inset-0 z-30 bg-canvas/70 xl:hidden"
        />
      ) : null}

      <aside
        className={cn(
          "flex min-h-0 shrink-0 flex-col border-l border-line bg-surface",
          "xl:w-[clamp(20rem,24vw,26rem)]",
          sheet
            ? "slide-in max-xl:fixed max-xl:inset-y-0 max-xl:right-0 max-xl:z-40 max-xl:w-[min(26rem,92vw)]"
            : "max-xl:hidden",
        )}
      >
        <header className="flex h-14 shrink-0 items-center gap-2 border-b border-line px-4">
          {icon}
          <h2 className="flex-1 truncate text-[11px] font-extrabold tracking-[0.1em] text-mute uppercase">
            {title}
          </h2>
          {onClose ? (
            <Button
              bare
              aria-label="Close"
              onClick={onClose}
              className="grid size-8 place-items-center rounded-[var(--r-sm)] text-mute transition-colors hover:bg-surface-3 hover:text-ink"
            >
              <X weight="bold" className="size-4" />
            </Button>
          ) : null}
        </header>
        <div className="col-scroll flex-1">{children}</div>
      </aside>
    </>
  );
}

/** Nothing here, said in the console's own voice rather than with a shrug. */
export function Empty({
  icon,
  title,
  hint,
}: {
  icon?: ReactNode;
  title: string;
  hint?: string;
}) {
  return (
    <div className="rise grid place-items-center px-6 py-16 text-center">
      {icon ? <span className="mb-3 text-mute">{icon}</span> : null}
      <p className="display text-[15px]">{title}</p>
      {hint ? (
        <p className="mt-1.5 max-w-[36ch] text-[13px] leading-relaxed text-mute">
          {hint}
        </p>
      ) : null}
    </div>
  );
}
