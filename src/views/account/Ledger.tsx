import { ArrowUUpLeft, Gift, Lightning, ShoppingBag } from "@phosphor-icons/react";

import { cn } from "../../lib/cn";
import { fmtMoney, fmtShortDate } from "../../lib/format";

/**
 * The ledger. Append-only, and shown as such: every line is a thing that
 * happened, in plain words, credits in colour, spends quiet, nothing editable.
 * It reads top to bottom as a timeline down a rule, the way the record does
 * in the console — it is the same kind of object, for one person.
 */

export type LedgerRow = {
  type: string;
  amountCents: number;
  packId?: string | null;
  at?: number;
};

const SAID: Record<string, string> = {
  grant: "Credit granted",
  purchase: "Bought a pack",
  spend: "Spark spent",
  refund: "Spark returned",
};

function iconOf(type: string) {
  if (type === "grant") return <Gift weight="fill" className="size-3.5" />;
  if (type === "purchase") return <ShoppingBag weight="fill" className="size-3.5" />;
  if (type === "refund") return <ArrowUUpLeft weight="bold" className="size-3.5" />;
  return <Lightning weight="fill" className="size-3.5" />;
}

export function Ledger({ rows, className }: { rows: LedgerRow[]; className?: string }) {
  return (
    <ol className={cn("relative ml-[13px] border-l border-line", className)}>
      {rows.map((row, i) => {
        const credit = row.amountCents >= 0;
        return (
          <li
            key={i}
            className="stagger relative flex items-center gap-3 py-2 pl-5"
            style={{ animationDelay: `${Math.min(i, 10) * 30}ms` }}
          >
            <span
              className={cn(
                "absolute -left-[14px] grid size-7 place-items-center rounded-full ring-4 ring-canvas",
                credit ? "bg-coin-fill text-on-coin" : "bg-surface-3 text-mute",
                row.type === "refund" && "bg-go-fill text-on-go",
              )}
            >
              {iconOf(row.type)}
            </span>
            <span className="min-w-0 flex-1 pl-3">
              <span className="block truncate text-[13px] font-bold text-ink-2">
                {SAID[row.type] ?? row.type}
                {row.packId ? (
                  <span className="font-semibold text-mute capitalize"> · {row.packId} pack</span>
                ) : null}
              </span>
              {row.at ? (
                <span className="num block text-[11px] text-mute">{fmtShortDate(row.at)}</span>
              ) : null}
            </span>
            <span
              className={cn(
                "num shrink-0 text-[13.5px] font-extrabold",
                credit ? "text-coin" : "text-mute",
                row.type === "refund" && "text-go",
              )}
            >
              {credit ? "+" : ""}
              {fmtMoney(row.amountCents)}
            </span>
          </li>
        );
      })}
    </ol>
  );
}
