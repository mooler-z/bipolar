import { useState } from "react";
import { useMutation, useQuery } from "convex/react";
import {
  ArrowLeft,
  Envelope,
  Fire,
  Lightning,
  PencilSimple,
  Receipt,
  Target,
} from "@phosphor-icons/react";

import { api } from "../../../convex/_generated/api";
import { PackShelf } from "../../components/PackShelf";
import { cn } from "../../lib/cn";
import { fmtMoney, rankOf } from "../../lib/format";
import { Button } from "../../ui/Button";
import { Field } from "../../ui/Field";
import { Flag } from "../../ui/Flag";
import { Chip, Label } from "../../ui/Label";
import { Panel } from "../../ui/Panel";

/**
 * The profile: who this account turns out to be, according to what it did.
 *
 * A banner across the full width, then a grid of independent cards — the read
 * on your own behaviour, the catalogue, the settings, the ledger. It is not a
 * 512px column: this page is reached from a desktop console and looking like a
 * phone screen dropped into the middle of one is exactly the complaint.
 *
 * The identity card is the payoff. Forty votes are worthless as a list and
 * worth screenshotting as a sentence.
 */

function Figure({
  value,
  label,
  tone,
}: {
  value: string;
  label: string;
  tone?: string;
}) {
  return (
    <span className="block">
      <span className={cn("display num block text-[clamp(1.75rem,3vw,2.75rem)]", tone)}>
        {value}
      </span>
      <Label>{label}</Label>
    </span>
  );
}

export function Profile({ onDone }: { onDone: () => void }) {
  const me = useQuery(api.users.me);
  const calls = useQuery(api.calls.me);
  const history = useQuery(api.wallet.history, { limit: 12 });
  const setCountry = useMutation(api.users.setCountry);
  const setDigest = useMutation(api.users.setDigestOptIn);

  const [country, setCountryText] = useState("");
  const [error, setError] = useState("");

  async function attempt(run: () => Promise<unknown>) {
    setError("");
    try {
      await run();
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    }
  }

  // The row is created by `App`, which reconciles the session wherever the
  // reader lands. Rendering is not the place to cause a write.
  if (me === null) {
    return <p className="p-16 text-center text-mute">Setting you up&hellip;</p>;
  }

  const rank = me ? rankOf(me.topicsBacked) : null;
  const graded = calls && calls.graded >= 5;

  return (
    <div className="min-h-[calc(100dvh-4rem)]">
      {/* The banner. */}
      <header className="border-b border-line bg-surface/40 px-[clamp(1.25rem,3vw,3.5rem)] py-[clamp(1.5rem,3vh,2.5rem)]">
        <div className="flex flex-wrap items-center gap-x-8 gap-y-6">
          <span className="grid size-[clamp(3.5rem,5vw,5rem)] shrink-0 place-items-center rounded-full bg-surface-3 text-[clamp(1.25rem,2vw,2rem)] font-extrabold text-ink-2">
            {(me?.displayName ?? "?").slice(0, 1).toUpperCase()}
          </span>

          <span className="min-w-0">
            <h1 className="display text-[clamp(1.6rem,2.6vw,2.5rem)]">
              {me?.displayName}
            </h1>
            <span className="mt-2 flex flex-wrap items-center gap-2">
              <Chip>
                <Envelope className="size-3" />
                {me?.email}
              </Chip>
              {rank ? <Chip tone="coin">{rank.title}</Chip> : null}
              {me?.countryCode ? (
                <Chip>
                  <Flag code={me.countryCode} withCode />
                </Chip>
              ) : null}
              {me?.role && me.role !== "user" ? <Chip>{me.role}</Chip> : null}
            </span>
          </span>

          <span className="flex-1" />

          <span className="flex flex-wrap gap-x-[clamp(1.5rem,3vw,3.5rem)] gap-y-4">
            <Figure value={String(me?.sparks ?? 0)} label="Sparks" tone="text-coin" />
            <Figure value={String(me?.quillBalance ?? 0)} label="Quills" />
            <Figure
              value={fmtMoney(me?.walletBalanceCents ?? 0)}
              label="Balance"
            />
            <Figure value={String(me?.topicsBacked ?? 0)} label="Backed" />
          </span>

          <Button variant="ghost" onClick={onDone} className="shrink-0">
            <ArrowLeft className="size-4" /> Back to voting
          </Button>
        </div>
      </header>

      <div className="grid gap-5 px-[clamp(1.25rem,3vw,3.5rem)] py-[clamp(1.25rem,3vh,2rem)] lg:grid-cols-2 xl:grid-cols-3">
        {/* The read on your own behaviour. */}
        <Panel
          title={graded ? "Your read" : "Your read — locked"}
          icon={<Target className="size-4 text-go" />}
          className={cn(graded && "burst")}
        >
          {graded ? (
            <>
              <h3 className="display text-[clamp(1.25rem,1.8vw,1.75rem)]">
                {calls.contrarian >= 55
                  ? "You're a contrarian."
                  : calls.contrarian <= 30
                    ? "You are the room."
                    : "You're hard to place."}
              </h3>
              <p className="mt-2.5 text-[14.5px] leading-relaxed text-ink-3">
                You break from the crowd{" "}
                <strong className="text-ink">{calls.contrarian}%</strong> of the
                time, and you read it right{" "}
                <strong className="text-ink">{calls.accuracy}%</strong> of the
                time across {calls.made} {calls.made === 1 ? "call" : "calls"}.
              </p>
              <div className="mt-5 flex flex-wrap gap-x-9 gap-y-4">
                <Figure
                  value={String(calls.streak)}
                  label="Streak"
                  tone={calls.streak > 0 ? "text-streak" : undefined}
                />
                <Figure value={String(calls.bestStreak)} label="Best" />
                <Figure value={`${calls.accuracy}%`} label="Read right" />
              </div>
            </>
          ) : (
            <>
              <p className="text-[14.5px] leading-relaxed text-ink-3">
                Call which way the room will go, five times, and this becomes a
                sentence about you instead of a counter.
              </p>
              <div className="mt-4 flex items-center gap-3">
                <span className="h-2.5 flex-1 overflow-hidden rounded-[var(--r-pill)] bg-surface-3">
                  <span
                    className="block h-full rounded-[var(--r-pill)] bg-go transition-[width] duration-700"
                    style={{
                      width: `${Math.min(100, ((calls?.graded ?? 0) / 5) * 100)}%`,
                    }}
                  />
                </span>
                <span className="num text-[13px] font-bold text-mute">
                  {calls?.graded ?? 0}/5
                </span>
              </div>
              {calls && calls.streak > 0 ? (
                <p className="mt-4">
                  <Chip tone="streak">
                    <Fire weight="fill" className="size-3.5 flicker" />
                    <span className="num font-bold">{calls.streak}</span> on the
                    board already
                  </Chip>
                </p>
              ) : null}
            </>
          )}
        </Panel>

        <PackShelf />

        {/* Settings. */}
        <Panel title="Settings" icon={<PencilSimple className="size-4 text-mute" />}>
          <div className="flex items-end gap-3">
            <span className="flex-1">
              <Field
                label="Voting from (ISO code)"
                value={country}
                maxLength={2}
                placeholder={me?.countryCode ?? "ET"}
                onChange={(e) => setCountryText(e.target.value.toUpperCase())}
              />
            </span>
            <Button
              disabled={country.length !== 2}
              onClick={() => attempt(() => setCountry({ countryCode: country }))}
            >
              Set
            </Button>
          </div>
          <p className="mt-2">
            <Label>Twice a month · every change is recorded</Label>
          </p>

          <div className="mt-6 flex items-center gap-3 rounded-[var(--r-btn)] bg-surface-2 p-3">
            <Envelope className="size-5 shrink-0 text-mute" />
            <span className="min-w-0 flex-1">
              <span className="block text-[14px] font-bold">Daily hot topics</span>
              <Label>One email, the sharpest questions of the day</Label>
            </span>
            <Button
              variant={me?.digestOptIn ? "go" : "steel"}
              size="sm"
              onClick={() => attempt(() => setDigest({ optIn: !me?.digestOptIn }))}
            >
              {me?.digestOptIn ? "On" : "Off"}
            </Button>
          </div>

          {error ? (
            <p className="mt-4 rounded-[var(--r-btn)] bg-love/15 px-3.5 py-2.5 text-sm font-semibold text-love">
              {error}
            </p>
          ) : null}
        </Panel>

        {/* The ledger. Append-only, and shown as such. */}
        {history?.length ? (
          <Panel
            title="Ledger"
            icon={<Receipt className="size-4 text-mute" />}
            bodyClassName="p-2"
            className="lg:col-span-2 xl:col-span-1"
          >
            <ul>
              {history.map((row, i) => (
                <li
                  key={i}
                  className="stagger flex items-center gap-3 border-b border-line px-2 py-2.5 last:border-0"
                  style={{ animationDelay: `${Math.min(i, 10) * 35}ms` }}
                >
                  <Lightning
                    weight="fill"
                    className={cn(
                      "size-3.5 shrink-0",
                      row.amountCents >= 0 ? "text-coin" : "text-mute",
                    )}
                  />
                  <span className="flex-1 truncate text-[13px] font-semibold text-ink-2">
                    {row.type}
                    {row.packId ? ` · ${row.packId}` : ""}
                  </span>
                  <span
                    className={cn(
                      "num text-[13px] font-bold",
                      row.amountCents >= 0 ? "text-go" : "text-mute",
                    )}
                  >
                    {row.amountCents >= 0 ? "+" : ""}
                    {fmtMoney(row.amountCents)}
                  </span>
                </li>
              ))}
            </ul>
          </Panel>
        ) : null}
      </div>
    </div>
  );
}
