import { useState } from "react";
import { useMutation, useQuery } from "convex/react";
import { Check, Lightning } from "@phosphor-icons/react";

import { api } from "../../convex/_generated/api";
import { cn } from "../lib/cn";
import { fmtMoney } from "../lib/format";
import { Button } from "../ui/Button";
import { Chip } from "../ui/Label";
import { Panel } from "../ui/Panel";

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
 * stays true later. One claim per account, or the catalogue is an unlimited
 * wallet and the paid vote stops meaning anything.
 */
export function PackShelf() {
  const catalogue = useQuery(api.wallet.packs);
  const claim = useMutation(api.wallet.claimPack);
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState("");

  if (!catalogue) return null;
  const { free, claimedPackId, items } = catalogue;

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
    <Panel title="Get credit" icon={<Lightning className="size-4 text-coin" />}>
      {free ? (
        <p className="mb-4 rounded-[var(--r-card)] border border-coin/35 bg-coin/10 px-3.5 py-3 text-[14px] leading-snug text-coin">
          <strong>Free during the hackathon.</strong> No card is charged and
          nothing asks for one. The prices are what a pack will cost when
          payments are real — and what your wallet is credited now, so a spark
          still costs 50&cent; and still runs out.
        </p>
      ) : null}

      <ul className="space-y-2.5">
        {items.map((pack) => {
          const taken = claimedPackId === pack.id;
          const spent = claimedPackId !== null;
          return (
            <li
              key={pack.id}
              className={cn(
                "flex items-center gap-3 rounded-[var(--r-card)] border p-3.5 transition-colors",
                taken ? "border-go/40 bg-go/10" : "border-line bg-surface-2",
              )}
            >
              <div className="min-w-0 flex-1">
                <p className="text-[15px] font-bold">{pack.label}</p>
                <p className="mt-1.5 flex flex-wrap items-center gap-1.5">
                  {pack.sparks > 0 ? (
                    <Chip tone="coin">
                      <span className="num">{pack.sparks}</span> sparks
                    </Chip>
                  ) : null}
                  {pack.quills > 0 ? (
                    <Chip>
                      <span className="num">{pack.quills}</span> quills
                    </Chip>
                  ) : null}
                  <Chip className="num">{fmtMoney(pack.priceCents)} value</Chip>
                </p>
              </div>

              {taken ? (
                <Chip tone="go">
                  <Check className="size-3.5" /> Claimed
                </Chip>
              ) : (
                <Button
                  variant={spent ? "ghost" : "go"}
                  size="sm"
                  disabled={spent || busy !== null}
                  onClick={() => void take(pack.id)}
                  className="shrink-0"
                >
                  {busy === pack.id ? "…" : free ? "Claim" : "Buy"}
                </Button>
              )}
            </li>
          );
        })}
      </ul>

      <p className="mt-3 text-[12px] text-mute">
        One pack per account. Recorded as a grant, never a purchase — the ledger
        never claims money that did not exist.
      </p>

      {error ? (
        <p className="mt-3 rounded-[var(--r-btn)] bg-love/15 px-3 py-2 text-[13px] font-semibold text-love">
          {error}
        </p>
      ) : null}
    </Panel>
  );
}
