import { Fragment } from "react";

import { mentioned } from "../../../convex/lib/mentions";

/**
 * What somebody said, with the names in it lit.
 *
 * The same matcher the server used to decide who to ring, run against the same
 * roster — so a name that is highlighted here is a name that was told, and one
 * that was not highlighted rang nobody. Two implementations of "what counts as
 * a mention" would eventually disagree, and the reader would be the one who
 * found out.
 */
export function Said({ text, people }: { text: string; people: string[] }) {
  if (!text.includes("@") || people.length === 0) return <>{text}</>;

  const named = mentioned(
    text,
    people.map((name) => ({ id: name, name })),
  );
  if (named.length === 0) return <>{text}</>;

  /* Longest first, so "@Sam Cole" is lit whole rather than as "@Sam" with a
     surname trailing after it in body colour. */
  const marks = named.map((p) => `@${p.name}`).sort((a, b) => b.length - a.length);
  const pattern = new RegExp(`(${marks.map(escape).join("|")})`, "gi");

  return (
    <>
      {text.split(pattern).map((part, i) =>
        marks.some((m) => m.toLowerCase() === part.toLowerCase()) ? (
          <span key={i} className="font-bold text-go">
            {part}
          </span>
        ) : (
          <Fragment key={i}>{part}</Fragment>
        ),
      )}
    </>
  );
}

/** A display name can hold anything, including regex punctuation. */
function escape(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}
