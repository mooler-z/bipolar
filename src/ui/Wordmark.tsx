import { cn } from "../lib/cn";

/**
 * The mark: the owner's logo — a heart, half love-red and half hate-blue —
 * with the name beside it: `bi` in love-red, `pol` in ink so it reads in both
 * themes, `ar` in hate-blue. The image is `public/logo.png`, which is also
 * the favicon and the installed app's icon, so the thing in the corner of
 * every page is the thing in the tab and on the home screen.
 */
export function Wordmark({
  size = "md",
  className,
  /** The heart alone, for tight corners. */
  markOnly = false,
  /** Extra classes on the name — the bar hides it on a phone with this. */
  nameClassName,
}: {
  size?: "md" | "lg" | "xl";
  className?: string;
  markOnly?: boolean;
  nameClassName?: string;
}) {
  /* Three sizes, not two. `xl` exists for the door, where the mark is the
     first thing a stranger sees and the bar's 28px version reads as a
     favicon that has wandered onto the page. */
  const xl = size === "xl";
  const lg = size === "lg";
  return (
    <span className={cn("inline-flex items-center select-none", xl ? "gap-3" : "gap-2", className)}>
      <img
        src="/logo.png"
        alt="bipolar"
        width={534}
        height={468}
        decoding="async"
        className={cn("block w-auto", xl ? "h-14 sm:h-16" : lg ? "h-10" : "h-7")}
      />
      {markOnly ? null : (
        <span
          aria-hidden
          className={cn(
            "display leading-none",
            /* Sized to the heart beside it rather than to the line it sits
               on: at `xl` the mark is the page's headline and a name half its
               height beside it reads as a caption. */
            xl ? "text-[44px] sm:text-[52px]" : lg ? "text-[24px]" : "text-[17px]",
            nameClassName,
          )}
        >
          <span className="text-love">bi</span>
          <span className="text-ink">pol</span>
          <span className="text-hate">ar</span>
        </span>
      )}
    </span>
  );
}
