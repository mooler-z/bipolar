import { useState } from "react";
import { Check, GoogleLogo, Lightning } from "@phosphor-icons/react";

import { returnTo, signIn, signUp } from "../../lib/auth-client";
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
 */

const PROMISES = [
  "Vote free on every topic, forever",
  "See what the people who paid actually think",
  "Call the room before it answers, and keep a streak",
];

/** This page's own address, including the remembered doorstep. */
const here = () => window.location.pathname + window.location.search;

export function SignIn() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

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
    <div className="flex min-h-[calc(100dvh-var(--bar))] flex-col lg:grid lg:grid-cols-[minmax(0,1.05fr)_minmax(0,1fr)]">
      {/* The form. First on a phone, second across a desk. */}
      <section className="order-1 flex flex-col justify-center px-[clamp(1.25rem,5vw,5rem)] py-8 sm:py-12 lg:order-2">
        <div className="rise w-full max-w-md lg:mx-auto lg:ml-0">
          <Wordmark size="lg" />
          <h1 className="display mt-5 text-[clamp(1.75rem,3vw,2.25rem)] lg:hidden">
            Pick a side.
          </h1>
          <p className="mt-3 mb-6 text-[14.5px] leading-relaxed text-mute">
            Sign in, or make an account in the same two boxes.
          </p>

          <Button
            variant="steel"
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
            <Button
              variant="go"
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
      <section className="order-2 flex flex-col justify-center border-line px-[clamp(1.25rem,5vw,5rem)] pb-12 max-lg:border-t max-lg:pt-10 lg:order-1 lg:border-r lg:py-12">
        <Hero className="rise" />

        <h1 className="display mt-8 hidden max-w-[14ch] text-[clamp(2.5rem,4.8vw,4.5rem)] lg:block">
          Pick a side.
        </h1>
        <p className="mt-6 max-w-[46ch] text-[clamp(0.95rem,1.15vw,1.2rem)] leading-relaxed text-ink-3 lg:mt-4">
          Everyone votes for free. Only some pay 50&cent; to be counted
          separately &mdash; and the gap between those two numbers is the whole
          point.
        </p>

        <ul className="mt-6 grid gap-2.5 lg:mt-8">
          {PROMISES.map((line, i) => (
            <li
              key={line}
              className="stagger flex items-center gap-3 rounded-[var(--r-btn)] border border-line bg-surface px-3.5 py-3"
              style={{ animationDelay: `${180 + i * 80}ms` }}
            >
              <span className="grid size-7 shrink-0 place-items-center rounded-[8px] bg-go-fill text-on-go">
                <Check weight="bold" className="size-4" />
              </span>
              <span className="text-[14.5px] font-semibold text-ink-2">{line}</span>
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
