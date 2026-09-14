import { useQuery } from "convex/react";
import {
  ArrowLeft,
  Envelope,
  SignOut,
  Feather,
  Lightning,
  ShieldCheck,
  Wallet,
} from "@phosphor-icons/react";

import { api } from "../../../convex/_generated/api";
import { PackShelf } from "../../components/PackShelf";
import { signOut } from "../../lib/auth-client";
import { fmtMoney, rankOf } from "../../lib/format";
import { Avatar } from "../../ui/Avatar";
import { Button } from "../../ui/Button";
import { Flag } from "../../ui/Flag";
import { Chip } from "../../ui/Label";
import { Tile } from "../../ui/Tile";
import { IdentityCard } from "./IdentityCard";
import { Ledger } from "./Ledger";
import { Settings } from "./Settings";

/**
 * The profile: who this account turns out to be, according to what it did.
 *
 * A banner across the full width, then a bento of independent cards — the
 * read on your own behaviour, the catalogue, the settings, the ledger. It is
 * not a 512px column: this page is reached from a desktop console and looking
 * like a phone screen dropped into the middle of one is exactly the complaint.
 *
 * The identity card is the payoff, so it takes the widest cell.
 */
export function Profile({ onDone }: { onDone: () => void }) {
  const me = useQuery(api.users.me);
  const calls = useQuery(api.calls.me);
  const history = useQuery(api.wallet.history, { limit: 12 });

  // The row is created by `App`, which reconciles the session wherever the
  // reader lands. Rendering is not the place to cause a write.
  if (me === null) {
    return <p className="p-16 text-center text-mute">Setting you up&hellip;</p>;
  }
  if (me === undefined) {
    return (
      <div className="space-y-4 px-[clamp(1.25rem,3vw,3.5rem)] py-8">
        <span className="shimmer block h-20 w-1/2 rounded-[var(--r-card)]" />
        <span className="shimmer block h-64 w-full rounded-[var(--r-card)]" />
      </div>
    );
  }

  const rank = rankOf(me.topicsBacked);
  const name = me.displayName || "You";

  return (
    <div className="min-h-[calc(100dvh-var(--bar))]">
      {/* The banner. */}
      <header className="border-b border-line bg-surface/40 px-[clamp(1.25rem,3vw,3.5rem)] py-[clamp(1.25rem,2.5vh,2rem)]">
        <div className="flex flex-wrap items-center gap-x-6 gap-y-5">
          <Avatar
            name={name}
            className="size-[clamp(3.5rem,5vw,5rem)] text-[clamp(1.4rem,2.2vw,2.2rem)]"
          />

          <span className="min-w-0">
            <h1 className="display text-[clamp(1.6rem,2.6vw,2.5rem)]">{name}</h1>
            <span className="mt-2 flex flex-wrap items-center gap-2">
              <Chip>
                <Envelope className="size-3" />
                {me.email}
              </Chip>
              <Chip tone="coin">{rank.title}</Chip>
              {me.countryCode ? (
                <Chip>
                  <Flag code={me.countryCode} withCode />
                </Chip>
              ) : null}
              {me.role !== "user" ? (
                <Chip tone="go">
                  <ShieldCheck weight="fill" className="size-3" />
                  {me.role}
                </Chip>
              ) : null}
            </span>
          </span>

          <span className="flex-1" />

          <div className="grid w-full grid-cols-2 gap-2.5 sm:grid-cols-4 lg:w-auto lg:min-w-[34rem]">
            <Tile
              icon={<Lightning weight="fill" className="size-3.5" />}
              value={me.sparks}
              label="Sparks"
              tone="coin"
              delay={0}
              hint="50¢ each"
            />
            <Tile
              icon={<Feather weight="fill" className="size-3.5" />}
              value={me.quillBalance}
              label="Quills"
              tone="hate"
              delay={80}
              hint="1 comment each"
            />
            <Tile
              icon={<Wallet weight="fill" className="size-3.5" />}
              value={fmtMoney(me.walletBalanceCents)}
              label="Balance"
              delay={160}
            />
            <Tile
              icon={<Lightning weight="bold" className="size-3.5" />}
              value={me.topicsBacked}
              label="Backed"
              tone="love"
              delay={240}
              hint={rank.title}
            />
          </div>

          <span className="flex shrink-0 items-center gap-2">
            <Button variant="ghost" onClick={onDone}>
              <ArrowLeft className="size-4" /> Back to voting
            </Button>
            {/* The bar drops this on a phone, so it has to live somewhere. */}
            <Button variant="ghost" onClick={() => void signOut()} className="sm:hidden">
              <SignOut className="size-4" /> Sign out
            </Button>
          </span>
        </div>
      </header>

      {/* The bento. */}
      <div className="grid gap-5 px-[clamp(1.25rem,3vw,3.5rem)] py-[clamp(1.25rem,3vh,2rem)] lg:grid-cols-2 xl:grid-cols-3">
        <div className="lg:col-span-2 xl:col-span-2">
          <IdentityCard calls={calls} />
        </div>

        <PackShelf />

        <Settings countryCode={me.countryCode} digestOptIn={me.digestOptIn} />

        {history?.length ? (
          <Ledger rows={history} className="lg:col-span-2 xl:col-span-2" />
        ) : null}
      </div>
    </div>
  );
}
