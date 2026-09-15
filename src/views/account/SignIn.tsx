import { useState } from "react";

import { cn } from "../../lib/cn";
import type { Side } from "../../lib/format";

import { GoogleLogo, Lightning } from "@phosphor-icons/react";

import { returnTo, signIn, signUp } from "../../lib/auth-client";
import { Backdrop } from "../../components/Backdrop";
import { Button } from "../../ui/Button";
import { Field } from "../../ui/Field";
import { Wordmark } from "../../ui/Wordmark";
import { Hero } from "./Hero";

/**
 * The door.
 *
 * On a desk it is two halves: the claim on the left, the form on the right,
 * both in view at once. The claim earns its place because this is the one page
 * a stranger reaches before seeing a single question, and "sign in" with no
 * reason attached is the weakest possible ask — so the arena itself, working,
 * is the first thing on it.
 *
 * **On a phone the order flips.** The same two halves stacked put a full
 * screen of pitch above the form, which is a page arguing with somebody who
 * already decided. So the phone gets the mark, one line, and the form; the
 * arena and the promises follow underneath for anyone still deciding. `order`
 * does it, so the reading order and the DOM order agree at both widths.
 *
 * **It stands on the same ground as the question.** This was a flat black
 * page with a hard grey rule down the middle of it, which is a form, and the
 * first thing a stranger saw of a product whose entire look is two colours
 * drifting behind an argument. It gets the weather now, under grain, with the
 * form on frosted glass over the top — the door and the room behind it made of
 * the same stuff.
 */

/**
 * What an account is for, in three lines.
 *
 * Each carries its own colour rather than three violet ticks in a row: the
 * free vote is the crowd's red, the paid layer is the committed's blue, the
 * call is the violet that means "go" everywhere else here. A reader who never
 * reads the words still learns that this product is made of three things and
 * that two of them are opposites.
 */
const PROMISES: { line: string; note: string; tone: "love" | "hate" | "go" }[] = [
  {
    line: "Vote free on every topic, forever",
    note: "No limit, no meter, no card",
    tone: "love",
  },
  {
    line: "See what the people who paid actually think",
    note: "The Crowd and the Committed, side by side",
    tone: "hate",
  },
  {
    line: "Call the room before it answers, and keep a streak",
    note: "Guess the result, build a record",
    tone: "go",
  },
];

const TONES = {
  love: "border-love-fill/35 bg-love-fill/[0.07] text-love hover:border-love-fill/70",
  hate: "border-hate-fill/35 bg-hate-fill/[0.07] text-hate hover:border-hate-fill/70",
  go: "border-go-fill/35 bg-go-fill/[0.07] text-go hover:border-go-fill/70",
} as const;

/** The rule along a card's top edge: the accent at full strength. */
const TILES = {
  love: "bg-love-fill",
  hate: "bg-hate-fill",
  go: "bg-go-fill",
} as const;

/** This page's own address, including the remembered doorstep. */
const here = () => window.location.pathname + window.location.search;

export function SignIn() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  /* Which card the demo arena is under. The whole door's ground answers it,
     which is the one thing on this page that is an argument rather than a
     claim about one. */
  const [lean, setLean] = useState<{ side: Side | null; pressed: boolean }>({
    side: null,
    pressed: false,
  });

  const ready = email.trim().length > 3 && password.length > 0;

  async function attempt(run: () => Promise<unknown>) {
    if (busy) return;
    setBusy(true);
    setError("");
    try {
      await run();
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="relative isolate flex min-h-[calc(100dvh-var(--bar))] flex-col overflow-hidden lg:grid lg:grid-cols-[minmax(0,65fr)_minmax(0,35fr)]">
      {/* The weather, and its own grain plate with it — `Backdrop` carries
          one, so a second here would be noise over noise. It leans with the
          demo arena above, the same way it leans behind a real question. */}
      <Backdrop lean={lean.side} flood={lean.pressed} />

      {/* The form. First on a phone, second across a desk. */}
      <section className="order-1 flex flex-col justify-center px-[clamp(1.25rem,5vw,5rem)] py-8 sm:py-12 lg:order-2">
        {/* No panel behind it. The fields and the buttons carry their own
            edges, which is enough of a frame — a card around them boxed the
            one part of the page that is meant to feel like it is standing on
            the ground rather than laid on top of it. */}
        {/* Centred in its own column. It used to be pinned to the column's
            left edge, which made sense when that column was the wider half —
            at 35% it just left the form hugging the divider with a hand's
            width of empty to its right. */}
        <div className="rise mx-auto w-full max-w-md">
          {/* Centred and large. This is the first thing a stranger sees of the
              product on the one page that has no question on it, and at the
              bar's size in the corner of a column it read as a favicon that
              had wandered onto the page.
              The wrapper does the centring: the mark is `inline-flex`, and
              `mx-auto` on an inline-level box centres nothing. */}
          <div className="flex justify-center">
            <Wordmark size="xl" />
          </div>
          <h1 className="display mt-5 text-center text-[clamp(1.75rem,3vw,2.25rem)] lg:hidden">
            Pick a side.
          </h1>
          <p className="mt-3 mb-7 text-center text-[14.5px] leading-relaxed text-ink-3">
            Sign in, or make an account in the same two boxes.
          </p>

          <Button
            variant="go"
            size="lg"
            block
            disabled={busy}
            onClick={() =>
              attempt(async () => {
                await signIn.social({
                  provider: "google",
                  // Absolute, and therefore honoured as given — see
                  // `returnTo`. This page's own address, so the `next` a gated
                  // action remembered survives the round trip.
                  callbackURL: returnTo(here()),
                  newUserCallbackURL: returnTo(here()),
                  errorCallbackURL: returnTo("/account"),
                });
              })
            }
          >
            <GoogleLogo weight="bold" className="size-5" />
            Continue with Google
          </Button>

          <p className="my-6 flex items-center gap-3">
            <span className="h-px flex-1 bg-line" />
            <span className="label">or with an email</span>
            <span className="h-px flex-1 bg-line" />
          </p>

          <div className="space-y-4">
            <Field
              label="Email"
              type="email"
              autoComplete="email"
              inputMode="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
            <Field
              label="Password"
              type="password"
              autoComplete="current-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && ready) {
                  void attempt(() => signIn.email({ email, password }));
                }
              }}
            />
          </div>

          {/* Stacked under 400px, side by side above it: two full-width slabs
              on a narrow phone beats two cramped ones. */}
          <div className="mt-6 flex flex-col gap-2.5 min-[400px]:flex-row min-[400px]:gap-3">
            {/* Violet solid is Google's, so the email pair steps down a rank
                rather than competing with it: the same hue hollowed out, then
                steel. Three actions, three weights, one colour family. */}
            <Button
              variant="hollow"
              size="lg"
              disabled={!ready || busy}
              className="flex-1"
              onClick={() => attempt(() => signIn.email({ email, password }))}
            >
              {busy ? "…" : "Sign in"}
            </Button>
            <Button
              variant="steel"
              size="lg"
              disabled={!ready || busy}
              className="flex-1"
              onClick={() =>
                attempt(() =>
                  signUp.email({ email, password, name: email.split("@")[0] }),
                )
              }
            >
              Create account
            </Button>
          </div>

          {error ? (
            <p
              role="alert"
              className="slide-up mt-5 rounded-[var(--r-btn)] border border-love-fill/40 bg-love-fill/12 px-3.5 py-2.5 text-sm font-semibold text-love"
            >
              {error}
            </p>
          ) : null}

          <p className="mt-6 flex w-fit items-center gap-2 rounded-[var(--r-pill)] border border-coin-fill/40 bg-coin-fill/10 px-3.5 py-2 text-[12.5px] font-bold text-coin lg:hidden">
            <Lightning weight="fill" className="size-4 shrink-0" />
            New accounts start with sparks on the house
          </p>
        </div>
      </section>

      {/* The claim. Under the form on a phone, beside it on a desk. */}
      <section className="order-2 flex flex-col justify-center border-line/50 px-[clamp(1.25rem,5vw,5rem)] pb-12 max-lg:border-t max-lg:pt-10 lg:order-1 lg:border-r lg:py-12">
        <Hero className="rise" onLean={setLean} />

        <h1 className="display mt-8 hidden max-w-[14ch] text-[clamp(2.5rem,4.8vw,4.5rem)] lg:block">
          Pick a side.
        </h1>
        <p className="mt-6 max-w-[52ch] text-[clamp(0.95rem,1.15vw,1.2rem)] leading-relaxed text-ink-3 lg:mt-4">
          Everyone votes for free. Only some pay 50&cent; to be counted
          separately &mdash; and the gap between those two numbers is the whole
          point.
        </p>

        {/* Three cards, not three bars.
            Stretched across a column this wide, a full-width row per promise
            is a row that is mostly empty — three of them stacked read as a
            settings screen, which is the opposite of what a door should look
            like. Side by side they are what they actually are: the three
            things this product is made of, one beside the next, each with the
            colour it belongs to running along its top edge. The numerals do
            the work the ticks were failing at — a tick says "yes" about
            something nobody asked a question about. */}
        <ul className="mt-7 grid gap-3 sm:grid-cols-3 lg:mt-9">
          {PROMISES.map((p, i) => (
            <li
              key={p.line}
              className={cn(
                "stagger card-hover relative overflow-hidden rounded-[var(--r-card)] border",
                "px-4 pt-5 pb-4 backdrop-blur-md hover:-translate-y-0.5",
                TONES[p.tone],
              )}
              style={{ animationDelay: `${180 + i * 80}ms` }}
            >
              <span aria-hidden className={cn("absolute inset-x-0 top-0 h-[3px]", TILES[p.tone])} />
              <span className="num display block text-[1.9rem] leading-none opacity-45">
                {`0${i + 1}`}
              </span>
              <span className="mt-3.5 block text-[15px] leading-snug font-extrabold text-ink">
                {p.line}
              </span>
              <span className="mt-1.5 block text-[12.5px] leading-snug text-mute">{p.note}</span>
            </li>
          ))}
        </ul>

        <p className="mt-7 hidden w-fit items-center gap-2 rounded-[var(--r-pill)] border border-coin-fill/40 bg-coin-fill/10 px-4 py-2.5 text-[13px] font-bold text-coin lg:inline-flex">
          <Lightning weight="fill" className="size-4" />
          New accounts start with sparks on the house
        </p>
      </section>
    </div>
  );
}
