import { useQuery } from "convex/react";
import { Globe, Lightning, Plus } from "@phosphor-icons/react";

import { api } from "../../convex/_generated/api";
import { openAsk } from "../lib/ask";
import { AskButton } from "../ui/AskButton";
import { cn } from "../lib/cn";
import { fmtInt, fmtMoney } from "../lib/format";
import { Notifications } from "./Notifications";
import { UserMenu } from "./UserMenu";
import { Search } from "./Search";
import { Button } from "../ui/Button";
import { Wordmark } from "../ui/Wordmark";

import "./topbar.css";

/**
 * The bar: what the house is doing, and what you have.
 *
 * A header on a wide screen is mostly middle, and a middle holding a tagline
 * is a middle holding nothing. This one carries the live totals as a ticker —
 * a Convex subscription, so the number of votes cast moves while somebody is
 * reading a question, and each number flashes once when it does. That is the
 * cheapest proof there is that the room is real.
 *
 * The right half is two groups with a rule between them: **the house** — the
 * world page and the wallet, things about the product — and **you** — the
 * bell, the theme, the account. It used to also carry a rank title
 * ("Regular"), the call streak and a sign-out button; the rank said nothing
 * anybody acts on, the streak belonged to a step that no longer exists, and
 * signing out is a once-a-month act that does not need a permanent seat on
 * every screen. It lives on the account page, which the avatar is one tap
 * from.
 *
 * **On a phone it is cut to the bone**, and deliberately: 48px tall, the mark
 * alone, the wallet, the bell, you. Everything dropped has a home — the theme
 * and the way out are both on the account screen, which the avatar is one tap
 * from. A phone gives the question its whole screen; a header carrying six
 * things it could have carried is a header taking a sixth of it.
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
  atWorld = false,
  onAccount,
  onHome,
  onWorld,
}: {
  signedIn: boolean;
  /** Already on the account route, so the bar has nowhere to send them. */
  atAccount?: boolean;
  /** On the world page: its link reads as the place you are. */
  atWorld?: boolean;
  onAccount: () => void;
  onHome: () => void;
  /** The world page. Every number on it is one somebody can go and move. */
  onWorld: () => void;
}) {
  const me = useQuery(api.users.me);
  const global = useQuery(api.stats.global);
  const sparks = me?.sparks ?? 0;
  /* Read here as well as inside `Notifications`, because on a phone the bell
     is not rendered and the avatar is what has to carry the count. Convex
     dedupes the subscription, so the second reader costs nothing. */
  const unread = useQuery(api.notifications.unread) ?? 0;

  return (
    <header className="topbar sticky top-0 z-40 flex h-[var(--bar)] shrink-0 items-center gap-2 border-b border-line/70 px-3 sm:gap-3 sm:px-5">
      {/* The grain, under everything in the bar. Without it a strip this wide
          and this translucent bands in visible steps over the ground. */}
      <svg aria-hidden className="topbar-grain" xmlns="http://www.w3.org/2000/svg">
        <filter id="bp-bar-grain">
          <feTurbulence type="fractalNoise" baseFrequency="0.72" numOctaves="4" stitchTiles="stitch" />
        </filter>
        <rect width="100%" height="100%" filter="url(#bp-bar-grain)" />
      </svg>

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

      {/* Finding a name. Wide enough to read a question in, and gone on a
          phone, where the header is cut to the bone. */}
      <Search className="hidden w-[min(22rem,26vw)] md:block" />

      {/* The one control up here asking to be pressed, and allowed to look
          like it. Everything else is furniture somebody reaches for on
          purpose; this is what a first-time reader should notice. */}
      <AskButton onClick={openAsk} className="hidden sm:flex" />

      {/* ── the house ─────────────────────────────────────────────────── */}
      <Button
        bare
        onClick={onWorld}
        aria-label="The world so far"
        aria-current={atWorld ? "page" : undefined}
        className={cn(
          "lift hidden min-h-9 items-center gap-1.5 rounded-[var(--r-btn)] px-3 text-[12.5px] font-bold sm:flex",
          atWorld ? "bg-surface-2 text-ink" : "text-mute hover:bg-surface-2 hover:text-ink",
        )}
      >
        <Globe weight="fill" className="size-4" />
        World
      </Button>

      {/* Gone from a phone. The wallet has a home on the account screen and
          the balance is on the question itself, beside the switch that spends
          it — which is the only place a reader is deciding about it. Up here it
          was the loudest thing in a bar that is meant to be furniture. */}
      {me ? (
        <Button
          bare
          aria-label={`${sparks} sparks — get more`}
          onClick={onAccount}
          className={cn(
            "snap hidden min-h-9 items-center gap-1.5 rounded-[var(--r-btn)] px-3 sm:flex sm:min-h-10 sm:gap-2 sm:pr-1.5 sm:pl-3.5",
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

      {/* ── you ─────────────────────────────────────────────────────────── */}
      {signedIn ? <span aria-hidden className="mx-1 hidden h-6 w-px bg-line sm:block" /> : null}

      {/* The bell is a desk control now. On a phone the header is cut to the
          bone and a second icon beside the avatar is a second thing to aim a
          thumb at; the count moves onto the avatar instead, which is where
          somebody already goes to find their own things. */}
      {signedIn ? (
        <span className="hidden sm:block">
          <Notifications />
        </span>
      ) : null}

      {signedIn ? (
        <UserMenu
          name={me?.displayName ?? "You"}
          sparks={sparks}
          role={me?.role ?? "user"}
          unread={unread}
          onAccount={onAccount}
          onWorld={onWorld}
        />
      ) : atAccount ? null : (
        <Button variant="go" size="sm" onClick={onAccount}>
          Sign in
        </Button>
      )}
    </header>
  );
}
