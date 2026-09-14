import { Check } from "@phosphor-icons/react";

import { cn } from "../../lib/cn";
import { Button } from "../../ui/Button";

export type Category = { _id: string; slug: string; name: string };

/**
 * The interests: large cut chips in a wrapping grid, each one a key that
 * presses down. A chosen one goes green and gets a check; nothing is a
 * filter, only a head start for the ranker.
 */
export function InterestStep({
  categories,
  chosen,
  onToggle,
}: {
  categories: Category[] | undefined;
  chosen: Set<string>;
  onToggle: (slug: string) => void;
}) {
  if (!categories) {
    return (
      <ul className="flex flex-wrap gap-3">
        {Array.from({ length: 8 }, (_, i) => (
          <li key={i} className="shimmer h-14 w-36 rounded-[var(--r-btn)]" />
        ))}
      </ul>
    );
  }

  return (
    <ul className="col-scroll flex flex-wrap content-start gap-3">
      {categories.map((c, i) => {
        const on = chosen.has(c.slug);
        return (
          <li
            key={c._id}
            className="stagger"
            style={{ animationDelay: `${Math.min(i, 20) * 35}ms` }}
          >
            <Button
              variant={on ? "go" : "steel"}
              size="lg"
              aria-pressed={on}
              onClick={() => onToggle(c.slug)}
              className={cn("capitalize", on && "pop-in")}
            >
              {on ? <Check weight="bold" className="size-4" /> : null}
              {c.name}
            </Button>
          </li>
        );
      })}
    </ul>
  );
}
