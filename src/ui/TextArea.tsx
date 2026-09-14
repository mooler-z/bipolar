import type { TextareaHTMLAttributes } from "react";

import { cn } from "../lib/cn";

/** The canonical multi-line field. The only file allowed to write a `<textarea>`. */
export function TextArea({
  label,
  className,
  ...rest
}: TextareaHTMLAttributes<HTMLTextAreaElement> & { label: string }) {
  return (
    <label className="block">
      <span className="sr-only">{label}</span>
      <textarea
        className={cn(
          "block w-full resize-none rounded-[var(--r-btn)] border-2 border-line bg-surface-2 px-3.5 py-2.5",
          "text-[14px] text-ink outline-none transition-colors",
          "placeholder:text-mute focus-visible:border-hate-fill",
          className,
        )}
        {...rest}
      />
    </label>
  );
}
