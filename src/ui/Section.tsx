import type { ReactNode } from "react";

import { cn } from "../lib/cn";

/**
 * A coloured label, a rule, and whatever belongs under it. No box.
 *
 * The house alternative to a bordered card for anything that is not itself
 * a card. Structure comes from the label and the space around it, so a page
 * built from these reads as one sheet rather than a grid of widgets.
 */
export function Section({
  label,
  tone = "text-ink-3",
  action,
  className,
  children,
}: {
  label: string;
  /** A text colour class. The product's accents, or the quiet default. */
  tone?: string;
  action?: ReactNode;
  className?: string;
  children: ReactNode;
}) {
  return (
    <section className={className}>
      <div className="mb-3 flex items-center gap-3 border-b border-line pb-2">
        <h2 className={cn("text-[11px] font-extrabold tracking-[0.12em] uppercase", tone)}>
          {label}
        </h2>
        <span className="flex-1" />
        {action}
      </div>
      {children}
    </section>
  );
}
