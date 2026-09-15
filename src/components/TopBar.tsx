import { useQuery } from "convex/react";
import {
  Fire,
  Globe,
  Lightning,
  Moon,
  Plus,
  SignOut,
  Sun,
  Target,
} from "@phosphor-icons/react";

import { api } from "../../convex/_generated/api";
import { cn } from "../lib/cn";
import { fmtInt, fmtMoney, rankOf } from "../lib/format";
import { useIncreased } from "../lib/motion";
import { signOut } from "../lib/auth-client";
import { Notifications } from "./Notifications";
import { useTheme } from "../lib/theme";
import { Avatar } from "../ui/Avatar";
import { Button } from "../ui/Button";
import { Wordmark } from "../ui/Wordmark";

/**
 * The bar: what the house is doing, and what you have.
 *
 * A header on a wide screen is mostly middle, and a middle holding a tagline
 * is a middle holding nothing. This one carries the live totals as a ticker —
 * a Convex subscription, so the number of votes cast moves while somebody is
 * reading a question, and each number flashes once when it does. That is the
 * cheapest proof there is that the room is real.
 *
 * **On a phone it is cut to the bone**, and deliberately: 48px tall, the mark
 * alone, the streak, the wallet, you. Everything dropped has a home — the
 * theme and the way out are both on the account screen, which the avatar is
 * one tap from. A phone gives the question its whole screen; a header
 * carrying six things it could have carried is a header taking a sixth of it.
 */

function Tick({ label, value }: { label: string; value: string }) {
  return (
    <span className="flex items-baseline gap-1.5">
      <span key={value} className="num flash text-[13px] font-extrabold text-ink">
        {value}
      </span>
      <span className="text-[10.5px] font-bold tracking-[0.06em] text-mute uppercase">
        {label}
      </span>
    </span>
  );
}

export function TopBar({
  signedIn,
  atAccount = false,
  onAccount,
  onHome,
  onWorld,
}: {
  signedIn: boolean;
  /** Already on the account route, so the bar has nowhere to send them. */
  atAccount?: boolean;
  onAccount: () => void;
  onHome: () => void;
  /** The world page. Every number on it is one somebody can go and move. */
  onWorld: () => void;
}) {
  const me = useQuery(api.users.me);
  const calls = useQuery(api.calls.me);
  const global = useQuery(api.stats.global);
  const extended = useIncreased(calls?.streak ?? 0);
  const sparks = me?.sparks ?? 0;
  const [theme, toggleTheme] = useTheme();

  return (
    <header className="sticky top-0 z-40 flex h-[var(--bar)] shrink-0 items-center gap-2 border-b border-line bg-canvas px-3 sm:gap-3 sm:px-5">
      <Button bare onClick={onHome} className="lift shrink-0" aria-label="Home">
        <Wordmark nameClassName="hidden sm:inline" />
      </Button>

      {/* The house, live. */}
      {global ? (
        <div className="ml-2 hidden items-center gap-5 border-l border-line pl-5 lg:flex">
          <span className="size-2 rounded-full bg-go-fill pulse-dot" aria-hidden />
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
            "flex items-center gap-1 rounded-[var(--r-pill)] bg-streak-fill/15 px-2.5 py-1.5 text-[13px] font-extrabold text-streak sm:gap-1.5 sm:px-3",
            extended && "pop-in",
          )}
        >
          <Fire weight="fill" className="size-4 flicker" />
          <span className="num">{calls.streak}</span>
        </span>
      ) : null}

      <Button
        bare
        onClick={onWorld}
        aria-label="The world so far"
        title="The world so far"
        className="lift hidden min-h-9 items-center gap-1.5 rounded-[var(--r-btn)] px-2.5 text-mute hover:bg-surface-2 hover:text-ink sm:flex"
      >
        <Globe weight="fill" className="size-4" />
        <span className="text-[12.5px] font-bold">World</span>
      </Button>

      {calls && calls.made >= 5 ? (
        <span className="chip hidden !bg-go-fill/12 !text-go sm:inline-flex">
          <Target weight="fill" className="size-3.5" />
          <span className="num font-extrabold">{calls.accuracy}%</span> read
        </span>
      ) : me ? (
        <span className="chip hidden !bg-surface-2 sm:inline-flex">{rankOf(me.topicsBacked).title}</span>
      ) : null}

      {me ? (
        <Button
          bare
          aria-label={`${sparks} sparks — get more`}
          onClick={onAccount}
          className={cn(
            "snap flex min-h-9 items-center gap-1.5 rounded-[var(--r-btn)] px-3 sm:min-h-10 sm:gap-2 sm:pr-1.5 sm:pl-3.5",
            sparks > 0 ? "bg-coin-fill text-on-coin" : "bg-surface-3 text-coin hover:bg-surface-4",
          )}
        >
          <Lightning weight="fill" className="size-4" />
          {sparks > 0 ? (
            <span key={sparks} className="num flash text-[14px] font-extrabold">{sparks}</span>
          ) : (
            <span className="text-[13px] font-extrabold">Get sparks</span>
          )}
          <span
            className={cn(
              "hidden size-7 place-items-center rounded-[8px] sm:grid",
              sparks > 0 ? "bg-current/15" : "bg-coin-fill text-on-coin",
            )}
          >
            <Plus weight="bold" className="size-3.5" />
          </span>
        </Button>
      ) : null}

      {/* The bell stays on a phone: it is the only thing up here that is
          about something that happened rather than something to press. */}
      {signedIn ? <Notifications /> : null}

      {/* Both of these have a home on the account screen, so the phone drops
          them rather than shrinking them. */}
      <Button
        bare
        aria-label={theme === "light" ? "Switch to dark" : "Switch to light"}
        title={theme === "light" ? "Dark" : "Light"}
        onClick={toggleTheme}
        className="hidden size-10 place-items-center rounded-[var(--r-btn)] text-mute transition-colors hover:bg-surface-2 hover:text-ink sm:grid"
      >
        {theme === "light" ? (
          <Moon key="moon" weight="fill" className="pop-in size-4" />
        ) : (
          <Sun key="sun" weight="fill" className="pop-in size-4" />
        )}
      </Button>

      {signedIn ? (
        <>
          <Button
            bare
            aria-label="Your account"
            onClick={onAccount}
            className="lift flex min-h-9 items-center gap-2 rounded-[var(--r-pill)] pr-0 pl-0 hover:bg-surface-2 sm:min-h-10 sm:pr-3 sm:pl-1"
          >
            <Avatar name={me?.displayName ?? "?"} />
            <span className="hidden text-[13px] font-bold sm:block">
              {(me?.displayName?.split(" ")[0] ?? "You").slice(0, 12)}
            </span>
          </Button>
          <Button
            bare
            aria-label="Sign out"
            onClick={() => void signOut()}
            className="hidden size-10 place-items-center rounded-[var(--r-btn)] text-mute transition-colors hover:bg-surface-2 hover:text-ink sm:grid"
          >
            <SignOut className="size-4" />
          </Button>
        </>
      ) : atAccount ? null : (
        <Button variant="go" size="sm" onClick={onAccount}>
          Sign in
        </Button>
      )}
    </header>
  );
}
