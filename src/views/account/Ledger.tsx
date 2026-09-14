import { Lightning, Receipt } from "@phosphor-icons/react";

import { cn } from "../../lib/cn";
import { fmtMoney, fmtShortDate } from "../../lib/format";
import { Panel } from "../../ui/Panel";

/**
 * The ledger. Append-only, and shown as such: every row is a thing that
 * happened, credits in green, spends quiet, nothing editable.
 */

export type LedgerRow = {
  type: string;
  amountCents: number;
  packId?: string | null;
  at?: number;
};

export function Ledger({ rows, className }: { rows: LedgerRow[]; className?: string }) {
  return (
    <Panel
      title="Ledger"
      icon={<Receipt className="size-4 text-mute" />}
      bodyClassName="p-2"
      className={className}
    >
      <ul>
        {rows.map((row, i) => {
          const credit = row.amountCents >= 0;
          return (
            <li
              key={i}
              className="stagger flex items-center gap-3 border-b border-line px-2 py-2.5 last:border-0"
              style={{ animationDelay: `${Math.min(i, 10) * 35}ms` }}
            >
              <span
                className={cn(
                  "grid size-7 shrink-0 place-items-center rounded-[7px]",
                  credit ? "bg-coin-fill/15 text-coin" : "bg-surface-3 text-mute",
                )}
              >
                <Lightning weight="fill" className="size-3.5" />
              </span>
              <span className="min-w-0 flex-1">
                <span className="block truncate text-[13px] font-semibold text-ink-2 capitalize">
                  {row.type}
                  {row.packId ? (
                    <span className="text-mute"> · {row.packId}</span>
                  ) : null}
                </span>
                {row.at ? (
                  <span className="label num">{fmtShortDate(row.at)}</span>
                ) : null}
              </span>
              <span
                className={cn(
                  "num text-[13px] font-bold",
                  credit ? "text-go" : "text-mute",
                )}
              >
                {credit ? "+" : ""}
                {fmtMoney(row.amountCents)}
              </span>
            </li>
          );
        })}
      </ul>
    </Panel>
  );
}
