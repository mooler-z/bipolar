import {
  Children,
  cloneElement,
  forwardRef,
  isValidElement,
  useState,
  type ButtonHTMLAttributes,
  type PointerEvent,
  type ReactElement,
} from "react";

import { cn } from "../lib/cn";

/**
 * The canonical Button, and the only file allowed to write a `<button>`.
 *
 * A solid rounded block that answers the hand: hover lifts it and runs a
 * band of light across it; a press cocks it down and small, and release
 * springs it back past centre while a ring of its own colour bursts out from
 * the edge. The coloured variants speak in capitals because they are the
 * ones that do something; steel is for the rest.
 */

type Variant =
  | "none"
  | "go"
  | "love"
  | "hate"
  | "coin"
  | "streak"
  | "hollow"
  | "steel"
  | "paper"
  | "ghost"
  | "link";
type Size = "sm" | "md" | "lg";

const VARIANTS: Record<Variant, string> = {
  none: "",
  go: "snap rounded-[var(--r-btn)] bg-go-fill text-on-go uppercase tracking-[0.04em] [--ring:var(--go-fill)]",
  love: "snap rounded-[var(--r-btn)] bg-love-fill text-on-love uppercase tracking-[0.04em] [--ring:var(--love-fill)]",
  hate: "snap rounded-[var(--r-btn)] bg-hate-fill text-on-hate uppercase tracking-[0.04em] [--ring:var(--hate-fill)]",
  coin: "snap rounded-[var(--r-btn)] bg-coin-fill text-on-coin uppercase tracking-[0.04em] [--ring:var(--coin-fill)]",
  streak:
    "snap rounded-[var(--r-btn)] bg-streak-fill text-on-streak uppercase tracking-[0.04em] [--ring:var(--streak-fill)]",
  /* The same violet as `go`, hollow. For the control that sits beside the
     forward one and means the opposite of it: same hue, so it belongs to the
     same step of the run, but a block and an outline are never mistaken for
     each other at a glance. */
  hollow:
    "snap rounded-[var(--r-btn)] border-2 border-go-fill/55 bg-go-fill/10 text-go uppercase tracking-[0.04em] hover:bg-go-fill/20 hover:border-go-fill [--ring:var(--go-fill)]",
  steel:
    "snap rounded-[var(--r-btn)] bg-surface-3 text-ink-2 hover:bg-surface-4 hover:text-ink [--ring:var(--ink-3)]",
  /* The inverse of the page: whatever the ground is, this is the other one.
     For the one control that belongs to somebody else's brand and should not
     be wearing any of ours — a Google button is white on a dark page and dark
     on a light one everywhere else on the internet, and a reader finds it by
     that shape rather than by reading it. */
  paper:
    "snap rounded-[var(--r-btn)] bg-ink text-canvas hover:bg-ink-2 [--ring:var(--ink)]",
  ghost:
    "rounded-[var(--r-sm)] text-mute transition-colors hover:bg-surface-2 hover:text-ink",
  link: "text-mute underline underline-offset-4 hover:text-ink",
};

// Nothing under 40px tall.
const SIZES: Record<Size, string> = {
  sm: "min-h-10 gap-1.5 px-4 text-[12.5px]",
  md: "min-h-11 gap-2 px-5 text-[13.5px]",
  lg: "min-h-[3.25rem] gap-2 px-7 text-[14.5px]",
};

type Props = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: Variant;
  size?: Size;
  block?: boolean;
  /** Behaviour and focus only — for regions that are clickable but not blocks. */
  bare?: boolean;
  asChild?: boolean;
};

export const Button = forwardRef<HTMLButtonElement, Props>(function Button(
  {
    variant,
    size = "md",
    block = false,
    bare = false,
    asChild = false,
    className,
    children,
    onPointerDown,
    ...rest
  },
  ref,
) {
  const chosen = variant ?? (bare ? "none" : "steel");
  const springs = chosen !== "none" && chosen !== "ghost" && chosen !== "link";
  // The ring is keyed so every press draws a fresh one.
  const [ring, setRing] = useState(0);

  const classes = cn(
    "group relative inline-flex items-center justify-center font-bold",
    "tracking-[-0.01em] outline-none select-none",
    "focus-visible:ring-2 focus-visible:ring-coin-fill focus-visible:ring-offset-2 focus-visible:ring-offset-canvas",
    "disabled:pointer-events-none disabled:opacity-40",
    bare ? "" : SIZES[size],
    VARIANTS[chosen],
    block && "flex w-full",
    className,
  );

  if (asChild) {
    const only = Children.only(children) as ReactElement<{ className?: string }>;
    if (!isValidElement(only)) return null;
    return cloneElement(only, { className: cn(classes, only.props.className) });
  }

  function down(e: PointerEvent<HTMLButtonElement>) {
    if (springs) setRing((n) => n + 1);
    onPointerDown?.(e);
  }

  return (
    <button ref={ref} type="button" className={classes} onPointerDown={down} {...rest}>
      {springs ? (
        <>
          <span aria-hidden className="gleam overflow-hidden rounded-[inherit]" />
          {ring > 0 ? (
            <span
              key={ring}
              aria-hidden
              className="ping-ring pointer-events-none absolute inset-0 rounded-[inherit]"
              style={{ color: "var(--ring)" }}
            />
          ) : null}
        </>
      ) : null}
      {children}
    </button>
  );
});
