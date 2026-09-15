import { useQuery } from "convex/react";
import { LockKey, SignOut } from "@phosphor-icons/react";

import { api } from "../../convex/_generated/api";
import { fmtInt } from "../lib/format";
import { signOut } from "../lib/auth-client";
import { Button } from "../ui/Button";
import { Wordmark } from "../ui/Wordmark";

/**
 * What a suspended account sees, instead of the app.
 *
 * The server already refuses every write — `requireUser` is the one function
 * they all pass through — so nothing here is the control. It exists because
 * being refused eight times without being told why is worse than being told
 * once: the app looked entirely normal, and every tap failed with a sentence
 * that scrolled away.
 *
 * It still shows what the account did, and says the votes are kept. A
 * suspension takes away what somebody can do next, not what they already said,
 * and a screen that implies otherwise invites a support message that did not
 * need to exist.
 *
 * The way out is deliberately not a form. There is no appeal button because
 * there is no appeal queue behind it, and a button that files nothing is worse
 * than a sentence saying who to talk to.
 */
export function Suspended() {
  const me = useQuery(api.users.me);
  const calls = useQuery(api.calls.me);

  return (
    <div className="grid min-h-[calc(100dvh-var(--bar))] place-items-center px-[clamp(1.25rem,4vw,4rem)]">
      <div className="rise w-full max-w-md text-center">
        <Wordmark className="mx-auto mb-7" />

        <span className="mx-auto grid size-14 place-items-center rounded-full bg-love-fill/15 text-love">
          <LockKey weight="fill" className="size-6" />
        </span>

        <h1 className="display mt-5 text-[clamp(1.5rem,3.5vw,2.2rem)]">
          This account is suspended.
        </h1>
        <p className="mx-auto mt-3 max-w-[38ch] text-[14px] leading-relaxed text-ink-3">
          You cannot vote, comment or spend while it is. Everything you have
          already said stays exactly where it is.
        </p>

        {me && (me.topicsBacked > 0 || (calls?.made ?? 0) > 0) ? (
          <p className="mt-5 flex items-center justify-center gap-4 text-[12px] text-mute">
            {(calls?.made ?? 0) > 0 ? (
              <span>
                <span className="num font-bold text-ink-3">{fmtInt(calls!.made)}</span> calls
                made
              </span>
            ) : null}
            {me.topicsBacked > 0 ? (
              <span>
                <span className="num font-bold text-coin">{fmtInt(me.topicsBacked)}</span>{" "}
                topics backed
              </span>
            ) : null}
          </p>
        ) : null}

        <p className="mx-auto mt-6 max-w-[38ch] text-[12.5px] leading-relaxed text-mute">
          If you think this is a mistake, reply to any mail bipolar has sent you
          and a moderator will look again.
        </p>

        <Button
          variant="steel"
          size="lg"
          className="mt-7"
          onClick={() => void signOut()}
        >
          <SignOut weight="bold" className="size-4" /> Sign out
        </Button>
      </div>
    </div>
  );
}
