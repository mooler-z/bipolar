import { useState } from "react";
import { useMutation, useQuery } from "convex/react";
import { Check, Feather, Lightning } from "@phosphor-icons/react";

import { api } from "../../convex/_generated/api";
import { cn } from "../lib/cn";
import { fmtMoney } from "../lib/format";
import { Button } from "../ui/Button";
import { Chip } from "../ui/Label";

/**
 * The catalogue.
 *
 * **It says free, first, because it is.** No card is charged during the
 * hackathon. A checkout that mimics a payment and silently is not is worse than
 * an honest button — and somebody who believes they were charged and was not
 * will say so publicly, at the worst possible moment.
 *
 * Prices are still shown: they are what a pack will cost when payments are real
 * and what the wallet is credited now, so the arithmetic a reader does today
 * stays true later.
 *
 * **One pack at a time, not one per account.** A pack returns when the balance
 * it carries has run dry, so a row is either a button or a note saying what is
 * still in the wallet. The server decides which — `claimable` arrives per pack,
 * because the spark packs and the quill pack empty independently.
 */
export function PackShelf() {
  const catalogue = useQuery(api.wallet.packs);
  const claim = useMutation(api.wallet.claimPack);
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState("");

  if (!catalogue) return null;
  const { free, claimedPackId, items } = catalogue;
  /** Taken something before, so the verb is "again". */
  const returning = claimedPackId !== null;

  async function take(packId: string) {
    setBusy(packId);
    setError("");
    try {
      await claim({ packId });
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setBusy(null);
    }
  }

  return (
    <div>
      {free ? (
        <p className="mb-3.5 text-[13px] leading-relaxed text-ink-3">
          <strong className="text-coin">Free during the hackathon.</strong> No
          card is charged and nothing asks for one. The prices are what a pack
          will cost when payments are real &mdash; and what your wallet is
          credited now, so a spark still costs 50&cent; and still runs out.
        </p>
      ) : null}

      <ul className="space-y-2.5">
        {items.map((pack, i) => {
          const last = claimedPackId === pack.id;
          return (
            <li
              key={pack.id}
              className={cn(
                "stagger flex items-center gap-3 rounded-[var(--r-btn)] border-2 p-3.5 transition-colors",
                pack.claimable
                  ? last
                    ? "border-go-fill/50 bg-go-fill/10"
                    : "border-line-2 bg-surface-2"
                  : "border-line bg-surface-2 opacity-60",
              )}
              style={{ animationDelay: `${i * 60}ms` }}
            >
              <div className="min-w-0 flex-1">
                <p className="text-[15px] font-bold">{pack.label}</p>
                <p className="mt-1.5 flex flex-wrap items-center gap-1.5">
                  {pack.sparks > 0 ? (
                    <Chip tone="coin">
                      <Lightning weight="fill" className="size-3" />
                      <span className="num">{pack.sparks}</span> sparks
                    </Chip>
                  ) : null}
                  {pack.quills > 0 ? (
                    <Chip tone="hate">
                      <Feather weight="fill" className="size-3" />
                      <span className="num">{pack.quills}</span> quills
                    </Chip>
                  ) : null}
                  <Chip className="num">{fmtMoney(pack.priceCents)} value</Chip>
                </p>
              </div>

              {pack.claimable ? (
                <Button
                  variant="go"
                  size="sm"
                  disabled={busy !== null}
                  onClick={() => void take(pack.id)}
                  className="shrink-0"
                >
                  {busy === pack.id
                    ? "…"
                    : !free
                      ? "Buy"
                      : returning
                        ? "Take again"
                        : "Claim"}
                </Button>
              ) : (
                // Not a refusal either: the wallet still has what this pack
                // carries, which is the reason the row is quiet.
                <Chip tone="go">
                  <Check weight="bold" className="size-3.5" />
                  {pack.sparks > 0 ? "Sparks left" : "Quills left"}
                </Chip>
              )}
            </li>
          );
        })}
      </ul>

      <p className="mt-3 text-[12px] leading-relaxed text-mute">
        One pack at a time. Spend the sparks and it comes back, up to three
        times a day. Every one is recorded as a grant, never a purchase &mdash;
        the ledger never claims money that did not exist.
      </p>

      {error ? (
        <p className="mt-3 text-[13px] font-semibold text-love">{error}</p>
      ) : null}
    </div>
  );
}
