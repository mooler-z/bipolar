import { useState } from "react";
import { Check, GoogleLogo, Lightning } from "@phosphor-icons/react";

import { signIn, signUp } from "../../lib/auth-client";
import { Button } from "../../ui/Button";
import { Field } from "../../ui/Field";

/**
 * The door.
 *
 * Two halves of the window: the claim on the left, the form on the right. The
 * claim is there because this is the one page a stranger reaches before they
 * have seen a single question, and "sign in" with no reason attached is the
 * weakest possible ask.
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
    <div className="grid min-h-[calc(100dvh-4rem)] lg:grid-cols-2">
      {/* The claim. */}
      <section className="flex flex-col justify-center border-line px-[clamp(1.5rem,5vw,5rem)] py-14 lg:border-r">
        <h1 className="display max-w-[14ch] text-[clamp(2.5rem,5vw,4.5rem)]">
          Pick a side.
        </h1>
        <p className="mt-5 max-w-[44ch] text-[clamp(1rem,1.2vw,1.25rem)] leading-relaxed text-ink-3">
          Everyone votes for free. Only some pay 50&cent; to be counted
          separately — and the gap between those two numbers is the whole point.
        </p>

        <ul className="mt-9 space-y-3.5">
          {PROMISES.map((line) => (
            <li key={line} className="flex items-start gap-3">
              <span className="mt-0.5 grid size-6 shrink-0 place-items-center rounded-full bg-go/15">
                <Check weight="bold" className="size-3.5 text-go" />
              </span>
              <span className="text-[15px] text-ink-2">{line}</span>
            </li>
          ))}
        </ul>

        <p className="mt-9 inline-flex w-fit items-center gap-2 rounded-[var(--r-pill)] border border-coin/35 bg-coin/10 px-4 py-2.5 text-[13px] font-bold text-coin">
          <Lightning weight="fill" className="size-4" />
          New accounts start with sparks on the house
        </p>
      </section>

      {/* The form. */}
      <section className="flex flex-col justify-center px-[clamp(1.5rem,5vw,5rem)] py-14">
        <div className="w-full max-w-md">
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
            <p className="mt-5 rounded-[var(--r-btn)] bg-love/15 px-3.5 py-2.5 text-sm font-semibold text-love">
              {error}
            </p>
          ) : null}
        </div>
      </section>
    </div>
  );
}
