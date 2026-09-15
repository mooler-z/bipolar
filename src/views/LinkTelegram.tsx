import { useState } from "react";
import { useMutation, useQuery } from "convex/react";
import { CheckCircle, PaperPlaneTilt, Warning } from "@phosphor-icons/react";

import { api } from "../../convex/_generated/api";
import { toSignIn } from "../lib/nav";
import { Button } from "../ui/Button";

/**
 * Connecting the bot to an account.
 *
 * The bot knows a Telegram id and nothing else, so it cannot be the side that
 * decides which bipolar account is meant — only a live session can say that.
 * Hence the direction: the bot mints a code, this page redeems it as whoever
 * is signed in here.
 *
 * **It never redeems on load.** A link is a thing people forward, and a page
 * that attached on sight would let a forwarded link silently bind somebody
 * else's Telegram account to whoever opened it. The button is the consent, and
 * it says which account it is about to use.
 */
export function LinkTelegram({ code, onDone }: { code: string; onDone: () => void }) {
  const me = useQuery(api.users.me);
  const status = useQuery(api.telegramLink.status);
  const redeem = useMutation(api.telegramLink.redeem);
  const [state, setState] = useState<"idle" | "busy" | "done">("idle");
  const [error, setError] = useState("");

  async function connect() {
    setState("busy");
    setError("");
    try {
      await redeem({ code });
      setState("done");
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
      setState("idle");
    }
  }

  return (
    <div className="grid min-h-[calc(100dvh-var(--bar))] place-items-center px-[clamp(1.25rem,4vw,4rem)]">
      <div className="w-full max-w-md">
        <p className="label mb-2">Telegram</p>

        {state === "done" ? (
          <>
            <h1 className="text-[clamp(1.6rem,4vw,2.4rem)]">Connected.</h1>
            <p className="mt-3 text-[14px] leading-relaxed text-ink-3">
              Go back to the chat — the bot has dealt you a question. Every vote you
              cast there counts exactly as it does here.
            </p>
            <Button variant="go" size="lg" block className="mt-6" onClick={onDone}>
              Back to the run
            </Button>
          </>
        ) : !me ? (
          <>
            <h1 className="text-[clamp(1.6rem,4vw,2.4rem)]">Sign in first.</h1>
            <p className="mt-3 text-[14px] leading-relaxed text-ink-3">
              The bot needs to know which account to vote as, and only you can say
              that. Sign in and open the link again.
            </p>
            <Button variant="go" size="lg" block className="mt-6" onClick={toSignIn}>
              Sign in
            </Button>
          </>
        ) : status?.linked ? (
          <>
            <h1 className="text-[clamp(1.6rem,4vw,2.4rem)]">Already connected.</h1>
            <p className="mt-3 text-[14px] leading-relaxed text-ink-3">
              This account is already attached to Telegram. To move it to a different
              chat, send <span className="key">🚪 Sign out</span> to the bot first.
            </p>
            <Button variant="steel" size="lg" block className="mt-6" onClick={onDone}>
              Back to the run
            </Button>
          </>
        ) : (
          <>
            <h1 className="text-[clamp(1.6rem,4vw,2.4rem)]">Vote from Telegram?</h1>
            <p className="mt-3 text-[14px] leading-relaxed text-ink-3">
              The bot will vote as{" "}
              <span className="font-bold text-ink">{me.displayName}</span>. Votes cast
              in the chat are the same votes — same record, same streak.
            </p>

            <span className="mt-5 flex items-start gap-2.5 rounded-[var(--r-btn)] border border-line bg-surface-2 px-3.5 py-3">
              <CheckCircle weight="fill" className="mt-0.5 size-4 shrink-0 text-go" />
              <span className="text-[12.5px] leading-snug text-ink-3">
                Only the connection is made. The bot never spends your wallet — every
                vote it casts is free.
              </span>
            </span>

            <Button
              variant="go"
              size="lg"
              block
              className="mt-5"
              disabled={state === "busy"}
              onClick={() => void connect()}
            >
              <PaperPlaneTilt weight="fill" className="size-4" />
              {state === "busy" ? "Connecting…" : "Connect this account"}
            </Button>
            <Button variant="ghost" size="sm" block className="mt-2" onClick={onDone}>
              Not now
            </Button>
          </>
        )}

        {error ? (
          <p className="mt-4 flex items-start gap-2 rounded-[var(--r-btn)] bg-love-fill/15 px-3 py-2.5 text-[12.5px] font-semibold text-love">
            <Warning weight="fill" className="mt-0.5 size-4 shrink-0" />
            {error}
          </p>
        ) : null}
      </div>
    </div>
  );
}
