import { Globe } from "@phosphor-icons/react";

import { cn } from "../lib/cn";
import { countryCode, flagEmoji } from "../lib/format";

/**
 * A country, as its flag.
 *
 * The single exception to the no-emoji rule, and it is a deliberate one: a flag
 * is recognised faster than any two letters and it is what makes a per-country
 * board readable at a glance rather than decoded row by row.
 *
 * The code rides alongside it wherever there is room, because flags for
 * neighbouring countries are easy to confuse and some platforms still render a
 * pair of letters instead of the glyph.
 *
 * An unknown country — the server's `ZZ`, or anything that is not a code — is
 * a globe, never two stray letters standing where a flag should be.
 */
export function Flag({
  code,
  withCode = false,
  className,
}: {
  code: string;
  withCode?: boolean;
  className?: string;
}) {
  const name = countryCode(code);
  if (name === "??") {
    return (
      <span
        className={cn("inline-flex shrink-0 items-center gap-1.5", className)}
        title="Unknown country"
      >
        <Globe weight="fill" className="size-[17px] text-mute" aria-hidden />
        <span className="sr-only">Unknown country</span>
        {withCode ? <span className="num text-[11px] font-bold text-mute">??</span> : null}
      </span>
    );
  }
  return (
    <span
      className={cn("inline-flex shrink-0 items-center gap-1.5", className)}
      title={name}
    >
      <span
        aria-hidden
        className="text-[17px] leading-none"
        style={{
          // The system emoji faces, so the glyph renders rather than falling
          // back to the two letters it is built from.
          fontFamily:
            '"Apple Color Emoji","Segoe UI Emoji","Noto Color Emoji",sans-serif',
        }}
      >
        {flagEmoji(code)}
      </span>
      <span className="sr-only">{name}</span>
      {withCode ? (
        <span className="num text-[11px] font-bold text-mute">{name}</span>
      ) : null}
    </span>
  );
}
