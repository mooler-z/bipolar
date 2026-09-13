import {
  Children,
  cloneElement,
  forwardRef,
  isValidElement,
  type ButtonHTMLAttributes,
  type ReactElement,
} from "react";

import { cn } from "../lib/cn";

/**
 * The canonical Button, and the only file allowed to write a `<button>`.
 *
 * A slab on a 4px edge of its own darker tone. Pressing moves it down onto the
 * edge and the edge vanishes, so it behaves like a key rather than a rectangle
 * that changed colour — Duolingo's trick, and the reason its controls feel
 * worth touching a hundred times a day.
 */

type Variant =
  | "none"
  | "go"
  | "love"
  | "hate"
  | "coin"
  | "steel"
  | "ghost"
  | "link";
type Size = "sm" | "md" | "lg";

const VARIANTS: Record<Variant, string> = {
  none: "",
  go: "slab bg-go text-black shadow-[0_4px_0_0_var(--go-deep)]",
  love: "slab bg-love text-white shadow-[0_4px_0_0_var(--love-deep)]",
  hate: "slab bg-hate text-black shadow-[0_4px_0_0_var(--hate-deep)]",
  coin: "slab bg-coin text-black shadow-[0_4px_0_0_var(--coin-deep)]",
  steel: "slab bg-surface-3 text-ink-2 hover:text-ink",
  ghost: "rounded-[var(--r-btn)] text-mute hover:bg-surface-3 hover:text-ink",
  link: "text-mute underline underline-offset-4 hover:text-ink",
};

// Nothing under 44px. This is a phone product before it is anything else.
const SIZES: Record<Size, string> = {
  sm: "min-h-11 gap-1.5 px-3.5 text-[13px]",
  md: "min-h-12 gap-2 px-5 text-[14px]",
  lg: "min-h-14 gap-2 px-7 text-[15px]",
};

type Props = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: Variant;
  size?: Size;
  block?: boolean;
  /** Behaviour and focus only — for regions that are clickable but not slabs. */
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
    ...rest
  },
  ref,
) {
  const chosen = variant ?? (bare ? "none" : "steel");
  const slab = chosen !== "none" && chosen !== "ghost" && chosen !== "link";

  const classes = cn(
    "group relative inline-flex items-center justify-center font-bold",
    "tracking-[-0.01em] outline-none select-none",
    "focus-visible:ring-2 focus-visible:ring-coin focus-visible:ring-offset-2 focus-visible:ring-offset-canvas",
    "disabled:pointer-events-none disabled:opacity-40",
    bare ? "" : SIZES[size],
    slab && "hover:brightness-110 active:slab-press",
    VARIANTS[chosen],
    block && "flex w-full",
    className,
  );

  if (asChild) {
    const only = Children.only(children) as ReactElement<{ className?: string }>;
    if (!isValidElement(only)) return null;
    return cloneElement(only, { className: cn(classes, only.props.className) });
  }

  return (
    <button ref={ref} type="button" className={classes} {...rest}>
      {children}
    </button>
  );
});
