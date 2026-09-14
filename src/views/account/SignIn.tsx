import { useState } from "react";
import { Check, GoogleLogo, Lightning } from "@phosphor-icons/react";

import { signIn, signUp } from "../../lib/auth-client";
import { Button } from "../../ui/Button";
import { Field } from "../../ui/Field";
import { Wordmark } from "../../ui/Wordmark";
import { Hero } from "./Hero";

/**
 * The door.
 *
 * Two halves of the window: the claim on the left, the form on the right. The
 * claim is there because this is the one page a stranger reaches before they
 * have seen a single question, and "sign in" with no reason attached is the
 * weakest possible ask. So the arena itself is the first thing on the page.
 */

const PROMISES = [
  "Vote free on every topic, forever",
  "See what the people who paid actually think",
  "Call the room before it answers, and keep a streak",
];

export function SignIn() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");

  async function attempt(run: () => Promise<unknown>) {
    setError("");
    try {
      await run();
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    }
  }

  return (
    <div className="grid min-h-[calc(100dvh-var(--bar))] lg:grid-cols-[minmax(0,1.15fr)_minmax(0,1fr)]">
      {/* The claim. */}
      <section className="flex flex-col justify-center border-line px-[clamp(1.5rem,5vw,5rem)] py-12 lg:border-r">
        <div className="rise">
          <Hero />
        </div>

        <h1 className="display mt-8 max-w-[14ch] text-[clamp(2.5rem,4.8vw,4.5rem)]">
          Pick a side.
        </h1>
        <p className="mt-4 max-w-[46ch] text-[clamp(1rem,1.15vw,1.2rem)] leading-relaxed text-ink-3">
          Everyone votes for free. Only some pay 50&cent; to be counted
          separately &mdash; and the gap between those two numbers is the whole
          point.
        </p>

        <ul className="mt-8 grid gap-2.5">
          {PROMISES.map((line, i) => (
            <li
              key={line}
              className="stagger flex items-center gap-3 rounded-[var(--r-btn)] border border-line bg-surface px-3.5 py-3"
              style={{ animationDelay: `${180 + i * 80}ms` }}
            >
              <span className="grid size-7 shrink-0 place-items-center rounded-[8px] bg-go-fill text-on-go">
                <Check weight="bold" className="size-4" />
              </span>
              <span className="text-[15px] font-semibold text-ink-2">{line}</span>
            </li>
          ))}
        </ul>

        <p className="mt-7 inline-flex w-fit items-center gap-2 rounded-[var(--r-pill)] border border-coin-fill/40 bg-coin-fill/10 px-4 py-2.5 text-[13px] font-bold text-coin">
          <Lightning weight="fill" className="size-4" />
          New accounts start with sparks on the house
        </p>
      </section>

      {/* The form. */}
      <section className="flex flex-col justify-center px-[clamp(1.5rem,5vw,5rem)] py-12">
        <div className="w-full max-w-md">
          <Wordmark size="lg" />
          <p className="mt-4 mb-7 text-[14px] text-mute">
            Sign in, or make an account in the same two boxes.
          </p>

          <Button
            variant="steel"
            size="lg"
            block
            onClick={() =>
              attempt(async () => {
                await signIn.social({ provider: "google" });
              })
            }
          >
            <GoogleLogo weight="bold" className="size-5" />
            Continue with Google
          </Button>

          <p className="my-7 flex items-center gap-3">
            <span className="h-px flex-1 bg-line" />
            <span className="label">or with an email</span>
            <span className="h-px flex-1 bg-line" />
          </p>

          <div className="space-y-5">
            <Field
              label="Email"
              type="email"
              autoComplete="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
            <Field
              label="Password"
              type="password"
              autoComplete="current-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
          </div>

          <div className="mt-7 flex gap-3">
            <Button
              variant="go"
              size="lg"
              className="flex-1"
              onClick={() =>
                attempt(async () => {
                  await signIn.email({ email, password });
                })
              }
            >
              Sign in
            </Button>
            <Button
              variant="steel"
              size="lg"
              className="flex-1"
              onClick={() =>
                attempt(async () => {
                  await signUp.email({
                    email,
                    password,
                    name: email.split("@")[0],
                  });
                })
              }
            >
              Create account
            </Button>
          </div>

          {error ? (
            <p className="mt-5 rounded-[var(--r-btn)] border border-love-fill/40 bg-love-fill/12 px-3.5 py-2.5 text-sm font-semibold text-love">
              {error}
            </p>
          ) : null}
        </div>
      </section>
    </div>
  );
}
