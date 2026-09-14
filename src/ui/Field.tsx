import type { InputHTMLAttributes } from "react";

import { cn } from "../lib/cn";

/**
 * The canonical text field. The only file allowed to write an `<input>`.
 *
 * `bare` strips the visible label and the frame for the places a field is the
 * whole surface rather than a row in a form — the command palette's search, for
 * instance. It is a **restyling, not a replacement**: the label survives as the
 * accessible name, so a bare-looking input is still an input with a name.
 */
export function Field({
  label,
  bare = false,
  className,
  ...rest
}: InputHTMLAttributes<HTMLInputElement> & { label: string; bare?: boolean }) {
  if (bare) {
    return (
      <input
        aria-label={label}
        className={cn(
          "block w-full bg-transparent text-[14px] font-medium text-ink outline-none",
          "placeholder:text-mute",
          className,
        )}
        {...rest}
      />
    );
  }

  return (
    <label className="block">
      <span className="label mb-1.5 block">{label}</span>
      <input
        className={cn(
          "block h-12 w-full rounded-[var(--r-btn)] border-2 border-line bg-surface-2 px-3.5",
          "text-[15px] font-medium text-ink outline-none transition-colors",
          "placeholder:text-mute focus-visible:border-hate-fill",
          className,
        )}
        {...rest}
      />
    </label>
  );
}
