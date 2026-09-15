import { useState } from "react";
import { useMutation } from "convex/react";
import { Eye, LockSimple } from "@phosphor-icons/react";

import { api } from "../../convex/_generated/api";
import type { Id } from "../../convex/_generated/dataModel";
import { toSignIn } from "../lib/nav";
import { Button } from "../ui/Button";

/**
 * Pay to see without committing.
 *
 * Offered on a topic somebody arrived at deliberately — a shared link, or a
 * row pulled out of a rail — and never in the middle of a run, where the whole
 * point is to answer rather than to browse. It is permanent and it is not a
 * vote: the spark buys the number, it does not put you in it.
 */
export function PeekOffer({
  topicId,
  signedIn,
  canSpark,
}: {
  topicId: string;
  signedIn: boolean;
  canSpark: boolean;
}) {
  const peek = useMutation(api.votes.peek);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  return (
    <div className="mt-2.5 flex flex-wrap items-center justify-between gap-2 rounded-[var(--r-btn)] border border-line bg-surface-2 px-3 py-2 sm:gap-3 sm:px-4 sm:py-2.5">
      <p className="flex min-w-0 flex-1 items-center gap-2 text-[12px] leading-snug text-ink-3 sm:text-[12.5px]">
        <LockSimple weight="fill" className="size-3.5 shrink-0 text-mute" />
        {/* Three lines of small print on a phone is three lines the question
            does not get. The short form says the same thing; the long one is
            for a screen with the room to be careful in. */}
        {error || (
          <>
            <span className="sm:hidden">Hidden until you decide.</span>
            <span className="hidden sm:inline">
              The result is hidden until you decide. Or pay a spark to see it
              without committing — permanent, and not a vote.
            </span>
          </>
        )}
      </p>
      <Button
        variant="coin"
        size="sm"
        disabled={busy || (signedIn && !canSpark)}
        onClick={() => {
          if (!signedIn) return toSignIn();
          setBusy(true);
          setError("");
          void peek({ topicId: topicId as Id<"topics"> })
            .catch((e: unknown) =>
              setError(e instanceof Error ? e.message : String(e)),
            )
            .finally(() => setBusy(false));
        }}
      >
        <Eye weight="fill" className="size-4" /> Peek · 1 spark
      </Button>
    </div>
  );
}
