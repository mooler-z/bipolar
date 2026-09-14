import { ArrowUUpLeft, MagnifyingGlass, Moon, Sun } from "@phosphor-icons/react";

import { cn } from "../../lib/cn";
import { useTheme } from "../../lib/theme";
import { Button } from "../../ui/Button";

/**
 * The strip across the top of the work.
 *
 * It says where you are and what this section is for, and it carries only the
 * things that belong to the console rather than to the section: the jump, the
 * theme, and the way out. Everything that acts on the *contents* of a section
 * lives on that section's own toolbar, one line below. Mixing the two is how an
 * admin header ends up with eleven buttons and no hierarchy.
 */
export function Bar({
  title,
  blurb,
  onPalette,
  onGo,
}: {
  title: string;
  blurb: string;
  onPalette: () => void;
  onGo: (path: string) => void;
}) {
  const [theme, toggleTheme] = useTheme();

  return (
    <header className="flex h-14 shrink-0 items-center gap-4 border-b border-line px-4">
      <span className="min-w-0">
        <h1 className="display truncate text-[17px]">{title}</h1>
        <p className="truncate text-[11.5px] leading-tight text-mute max-sm:hidden">
          {blurb}
        </p>
      </span>

      <span className="flex-1" />

      <Button
        bare
        onClick={onPalette}
        className={cn(
          "lift flex min-h-9 w-[min(22rem,30vw)] items-center gap-2.5 rounded-[var(--r-btn)] max-md:w-auto",
          "border border-line-2 bg-surface-2 px-3 text-[13px] font-medium text-mute",
          "hover:border-mute hover:text-ink-3",
        )}
      >
        <MagnifyingGlass className="size-4 shrink-0" />
        <span className="flex-1 truncate text-left max-md:hidden">
          Jump to a section…
        </span>
        <kbd className="key max-md:hidden">&#8984;K</kbd>
      </Button>

      <Button
        bare
        aria-label={theme === "light" ? "Switch to dark" : "Switch to light"}
        onClick={toggleTheme}
        className="grid size-9 shrink-0 place-items-center rounded-[var(--r-sm)] text-mute transition-colors hover:bg-surface-2 hover:text-ink"
      >
        {theme === "light" ? (
          <Moon key="m" weight="fill" className="pop-in size-4" />
        ) : (
          <Sun key="s" weight="fill" className="pop-in size-4" />
        )}
      </Button>

      <Button variant="ghost" size="sm" onClick={() => onGo("/")} className="shrink-0">
        <ArrowUUpLeft className="size-4" />
        <span className="max-sm:hidden">Back to the app</span>
      </Button>
    </header>
  );
}
