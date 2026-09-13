import { useQuery } from "convex/react";
import { Fire, Lightning, Plus, SignOut, Target } from "@phosphor-icons/react";

import { api } from "../../convex/_generated/api";
import { cn } from "../lib/cn";
import { fmtInt, fmtMoney, rankOf } from "../lib/format";
import { useIncreased } from "../lib/motion";
import { signOut } from "../lib/auth-client";
import { Button } from "../ui/Button";

/**
 * The bar: what the house is doing, and what you have.
 *
 * A header on a wide screen is mostly middle, and a middle holding a tagline is
 * a middle holding nothing. This one carries the live totals instead — they are
 * a Convex subscription, so the number of votes cast moves while somebody is
 * reading a question, which is the cheapest proof the room is real.
 *
 * The wallet is deliberately **not** a filled gold slab. An empty wallet
 * rendered as the loudest object on the page announces a zero; here it is a
 * quiet pill that turns into an invitation when there is nothing in it.
 */

function Tick({ label, value }: { label: string; value: string }) {
  return (
    <span className="flex items-baseline gap-1.5">
      <span className="num text-[13px] font-bold text-ink-2">{value}</span>
      <span className="text-[11px] font-semibold tracking-wide text-mute uppercase">
        {label}
      </span>
    </span>
  );
}

export function TopBar({
  signedIn,
  onAccount,
  onHome,
}: {
  signedIn: boolean;
  onAccount: () => void;
  onHome: () => void;
}) {
  const me = useQuery(api.users.me);
  const calls = useQuery(api.calls.me);
  const global = useQuery(api.stats.global);
  const extended = useIncreased(calls?.streak ?? 0);
  const rank = me ? rankOf(me.topicsBacked) : null;
  const sparks = me?.sparks ?? 0;

  return (
    <header className="sticky top-0 z-40 flex h-16 shrink-0 items-center gap-3 border-b border-line bg-canvas px-4 sm:px-6">
      <Button
        bare
        onClick={onHome}
        className="lift flex items-baseline gap-0.5 pr-2"
      >
        <span className="display text-[21px] text-love">bi</span>
        <span className="display text-[21px] text-hate">polar</span>
      </Button>

      {/* The house, live. */}
      {global ? (
        <div className="hidden items-center gap-5 border-l border-line pl-5 lg:flex">
          <Tick label="topics" value={fmtInt(global.topics)} />
          <Tick label="votes" value={fmtInt(global.votes)} />
          <Tick label="staked" value={fmtMoney(global.stakedCents)} />
          <Tick label="countries" value={fmtInt(global.countries)} />
        </div>
      ) : null}

      <span className="flex-1" />

      {/* Loss aversion, in the one place it is always visible. */}
      {calls && calls.streak > 0 ? (
        <span
          className={cn(
            "chip !bg-streak/15 !text-streak transition-transform",
            extended && "pop-in",
          )}
        >
          <Fire weight="fill" className="size-3.5 flicker" />
          <span className="num font-bold">{calls.streak}</span>
        </span>
      ) : null}

      {calls && calls.made >= 5 ? (
        <span className="chip hidden !bg-surface-2 sm:inline-flex">
          <Target className="size-3.5 text-go" />
          <span className="num font-bold">{calls.accuracy}%</span> read
        </span>
      ) : rank ? (
        <span className="chip hidden !bg-surface-2 sm:inline-flex">
          {rank.title}
        </span>
      ) : null}

      {me ? (
        <Button
          bare
          aria-label={`${sparks} sparks — get more`}
          onClick={onAccount}
          className={cn(
            "lift flex min-h-10 items-center gap-2 rounded-[var(--r-pill)] border pr-1 pl-3",
            sparks > 0
              ? "border-line bg-surface-2 hover:border-coin/50"
              : "border-coin/40 bg-coin/10 hover:border-coin",
          )}
        >
          <Lightning weight="fill" className="size-4 text-coin" />
          {sparks > 0 ? (
            <span key={sparks} className="num flash text-[14px] font-bold text-coin">
              {sparks}
            </span>
          ) : (
            <span className="text-[13px] font-bold text-coin">Get sparks</span>
          )}
          <span className="grid size-8 place-items-center rounded-full bg-coin text-black">
            <Plus weight="bold" className="size-3.5" />
          </span>
        </Button>
      ) : null}

      {signedIn ? (
        <>
          <Button
            bare
            aria-label="Your account"
            onClick={onAccount}
            className="lift flex min-h-10 items-center gap-2 rounded-[var(--r-pill)] pr-3 pl-1 hover:bg-surface-2"
          >
            <span className="grid size-8 shrink-0 place-items-center rounded-full bg-surface-3 text-[13px] font-bold text-ink-2">
              {(me?.displayName ?? "?").slice(0, 1).toUpperCase()}
            </span>
            <span className="hidden text-[13px] font-bold sm:block">
              {(me?.displayName?.split(" ")[0] ?? "You").slice(0, 12)}
            </span>
          </Button>
          <Button
            bare
            aria-label="Sign out"
            onClick={() => void signOut()}
            className="grid size-10 place-items-center rounded-[var(--r-btn)] text-mute transition-colors hover:bg-surface-2 hover:text-ink"
          >
            <SignOut className="size-4" />
          </Button>
        </>
      ) : (
        <Button variant="go" size="sm" onClick={onAccount}>
          Sign in
        </Button>
      )}
    </header>
  );
}
