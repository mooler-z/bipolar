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
    <div className="mt-2.5 flex flex-wrap items-center justify-between gap-3 rounded-[var(--r-btn)] border border-line bg-surface-2 px-4 py-2.5">
      <p className="flex items-center gap-2 text-[12.5px] leading-snug text-ink-3">
        <LockSimple weight="fill" className="size-3.5 shrink-0 text-mute" />
        {error || (
          <>
            The result is hidden until you decide. Or pay a spark to see it
            without committing — permanent, and not a vote.
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
