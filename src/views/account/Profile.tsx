import { useQuery } from "convex/react";
import {
  ArrowLeft,
  ArrowRight,
  Envelope,
  Feather,
  Lightning,
  ShieldCheck,
  SignOut,
  Wallet,
} from "@phosphor-icons/react";

import { api } from "../../../convex/_generated/api";
import { PackShelf } from "../../components/PackShelf";
import { signOut } from "../../lib/auth-client";
import { cn } from "../../lib/cn";
import { fmtInt, fmtMoney, rankOf } from "../../lib/format";
import { Avatar } from "../../ui/Avatar";
import { Button } from "../../ui/Button";
import { Flag } from "../../ui/Flag";
import { Chip } from "../../ui/Label";
import { Section } from "../../ui/Section";
import { IdentityCard } from "./IdentityCard";
import { Ledger } from "./Ledger";
import { Settings } from "./Settings";

/**
 * The account: who this turns out to be, what it has, and what it chose.
 *
 * It was a banner with four stat tiles jammed into it and a bento of four
 * bordered cards underneath — the same grid-of-boxes shape as every account
 * page on the internet. It is a sheet now, with three things in three
 * weights. **The wallet** is a band under the name: three figures, big, and
 * the one button that changes them. **The read** — the sentence the calls add
 * up to — is the widest thing on the page because it is the one thing here
 * meant to be looked at rather than used. **Settings, packs and the ledger**
 * are lists under coloured labels, because that is what they are.
 *
 * Not a 512px column. This is reached from a desktop console, and a phone
 * screen dropped into the middle of one is exactly the complaint.
 */
export function Profile({ onDone }: { onDone: () => void }) {
  const me = useQuery(api.users.me);
  const calls = useQuery(api.calls.me);
  const history = useQuery(api.wallet.history, { limit: 14 });

  // The row is created by `App`, which reconciles the session wherever the
  // reader lands. Rendering is not the place to cause a write.
  if (me === null) {
    return <p className="p-16 text-center text-mute">Setting you up&hellip;</p>;
  }
  if (me === undefined) {
    return (
      <div className="space-y-5 px-[clamp(1.25rem,3vw,3.5rem)] py-8">
        <span className="shimmer block h-16 w-1/2 rounded-[var(--r-card)]" />
        <span className="shimmer block h-24 w-full rounded-[var(--r-card)]" />
        <span className="shimmer block h-64 w-full rounded-[var(--r-card)]" />
      </div>
    );
  }

  const rank = rankOf(me.topicsBacked);
  const name = me.displayName || "You";
  const PAD = "px-[clamp(1.25rem,3vw,3.5rem)]";

  return (
    <div className="min-h-[calc(100dvh-var(--bar))]">
      {/* Who. */}
      <header className={cn("flex flex-wrap items-center gap-x-5 gap-y-4 pt-[clamp(1.25rem,3vh,2.25rem)] pb-5", PAD)}>
        <Avatar
          name={name}
          className="size-[clamp(3.5rem,5.5vw,5.5rem)] text-[clamp(1.5rem,2.4vw,2.4rem)]"
        />
        <span className="min-w-0 flex-1">
          <h1 className="display text-[clamp(1.7rem,3vw,2.8rem)]">{name}</h1>
          <span className="mt-2 flex flex-wrap items-center gap-1.5">
            {/* The flag leads, always. */}
            {me.countryCode ? (
              <Chip>
                <Flag code={me.countryCode} withCode />
              </Chip>
            ) : null}
            <Chip tone="coin">{rank.title}</Chip>
            {me.role !== "user" ? (
              <Chip tone="go">
                <ShieldCheck weight="fill" className="size-3" /> {me.role}
              </Chip>
            ) : null}
            <Chip>
              <Envelope className="size-3" /> {me.email}
            </Chip>
          </span>
        </span>
        <span className="flex shrink-0 items-center gap-2">
          <Button variant="ghost" onClick={onDone}>
            <ArrowLeft className="size-4" /> Back to voting
          </Button>
          {/* The bar drops this on a phone, so it has to live somewhere. */}
          <Button variant="ghost" onClick={() => void signOut()} className="sm:hidden">
            <SignOut className="size-4" /> Sign out
          </Button>
        </span>
      </header>

      {/* What you have. One band, three figures, one button. */}
      <div className={cn("border-y border-line bg-surface/50 py-5", PAD)}>
        <div className="flex flex-wrap items-center gap-x-10 gap-y-4">
          <Balance
            icon={<Lightning weight="fill" className="size-5" />}
            value={fmtInt(me.sparks)}
            label={me.sparks === 1 ? "spark" : "sparks"}
            hint="50¢ each · one paid vote or one peek"
            tone="text-coin"
            flash={me.sparks}
          />
          <Balance
            icon={<Feather weight="fill" className="size-5" />}
            value={fmtInt(me.quillBalance)}
            label={me.quillBalance === 1 ? "quill" : "quills"}
            hint="one comment each"
            tone="text-hate"
          />
          <Balance
            icon={<Wallet weight="fill" className="size-5" />}
            value={fmtMoney(me.walletBalanceCents)}
            label="balance"
            hint="what the sparks are worth"
            tone="text-ink"
          />
          <span className="flex-1" />
          <Button variant="coin" size="md" asChild>
            <a href="#packs">
              Get sparks <ArrowRight weight="bold" className="size-4" />
            </a>
          </Button>
        </div>
      </div>

      {/* How you think, and what you chose. */}
      <div className={cn("grid gap-x-10 gap-y-9 py-[clamp(1.5rem,3vh,2.5rem)] xl:grid-cols-[minmax(0,3fr)_minmax(20rem,2fr)]", PAD)}>
        <div className="space-y-9">
          <Section label="Your read" tone="text-go">
            <IdentityCard calls={calls} />
          </Section>

          <Section label="Settings" tone="text-ink-3">
            <Settings
              countryCode={me.countryCode}
              digestOptIn={me.digestOptIn}
              skipReveal={me.skipReveal}
            />
          </Section>
        </div>

        <div className="space-y-9">
          <Section label="Packs" tone="text-coin" className="scroll-mt-24" >
            <span id="packs" />
            <PackShelf />
          </Section>

          {history?.length ? (
            <Section label="Ledger" tone="text-ink-3">
              <Ledger rows={history} />
            </Section>
          ) : null}
        </div>
      </div>
    </div>
  );
}

function Balance({
  icon,
  value,
  label,
  hint,
  tone,
  flash,
}: {
  icon: React.ReactNode;
  value: string;
  label: string;
  hint: string;
  tone: string;
  /** Re-keys the number so it flashes when this changes. */
  flash?: number;
}) {
  return (
    <span className="flex items-center gap-3">
      <span className={cn("shrink-0", tone)}>{icon}</span>
      <span className="leading-none">
        <span className="flex items-baseline gap-1.5">
          <span key={flash} className={cn("display num text-[clamp(1.8rem,2.6vw,2.5rem)]", tone, flash !== undefined && "flash inline-block")}>
            {value}
          </span>
          <span className="text-[11px] font-extrabold tracking-[0.1em] text-mute uppercase">{label}</span>
        </span>
        <span className="mt-1.5 block text-[11.5px] text-mute">{hint}</span>
      </span>
    </span>
  );
}
