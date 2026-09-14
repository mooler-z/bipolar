import { Globe } from "@phosphor-icons/react";

import { cn } from "../lib/cn";
import { countryCode } from "../lib/format";

/**
 * A country, as its flag — drawn, not typed.
 *
 * The emoji flag was the one exception to the no-emoji rule, and it was a poor
 * one: Windows renders the pair of letters it is built from, every platform
 * draws a different flag, and none of them draws it at the size the layout
 * asked for. These are the `flag-icons` SVGs, so a flag is the same flag on
 * every machine, at 4:3, at whatever size the row needs.
 *
 * The code rides alongside it wherever there is room, because flags for
 * neighbouring countries are easy to confuse.
 *
 * An unknown country — the server's `ZZ`, or anything that is not a code — is
 * a globe, never two stray letters standing where a flag should be.
 */

/* Every flag the package ships, as a hashed URL. Eager, so the map exists at
   bundle time and a code resolves synchronously; `?url`, so only the address
   is in the bundle and the SVG itself stays a file the browser fetches when a
   flag is actually on screen. `vite.config.ts` keeps these out of the inline
   limit — otherwise every flag under 4KB would be pasted into the main bundle
   as base64. */
const FLAGS = import.meta.glob<string>(
  "../../node_modules/flag-icons/flags/4x3/*.svg",
  { eager: true, query: "?url", import: "default" },
);

const BY_CODE = new Map<string, string>();
for (const [path, url] of Object.entries(FLAGS)) {
  const file = path.slice(path.lastIndexOf("/") + 1, -".svg".length);
  BY_CODE.set(file.toUpperCase(), url);
}

/** The flag's address, or null for a code the package does not know. */
export function flagUrl(code: string): string | null {
  return BY_CODE.get(countryCode(code)) ?? null;
}

export function Flag({
  code,
  withCode = false,
  className,
  /** Tailwind size classes for the image. 4:3 by default. */
  size = "h-[15px] w-5",
}: {
  code: string;
  withCode?: boolean;
  className?: string;
  size?: string;
}) {
  const name = countryCode(code);
  const url = flagUrl(code);

  if (name === "??" || !url) {
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
      <img
        src={url}
        alt=""
        aria-hidden
        loading="lazy"
        decoding="async"
        className={cn("shrink-0 rounded-[2px] object-cover ring-1 ring-line-2", size)}
      />
      <span className="sr-only">{name}</span>
      {withCode ? (
        <span className="num text-[11px] font-bold text-mute">{name}</span>
      ) : null}
    </span>
  );
}
