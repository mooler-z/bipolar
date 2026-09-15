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
  size?: "md" | "lg";
  className?: string;
  markOnly?: boolean;
  nameClassName?: string;
}) {
  const lg = size === "lg";
  return (
    <span className={cn("inline-flex items-center gap-2 select-none", className)}>
      <img
        src="/logo.png"
        alt="bipolar"
        width={534}
        height={468}
        decoding="async"
        className={cn("block w-auto", lg ? "h-10" : "h-7")}
      />
      {markOnly ? null : (
        <span
          aria-hidden
          className={cn("display leading-none", lg ? "text-[24px]" : "text-[17px]", nameClassName)}
        >
          <span className="text-love">bi</span>
          <span className="text-ink">pol</span>
          <span className="text-hate">ar</span>
        </span>
      )}
    </span>
  );
}
