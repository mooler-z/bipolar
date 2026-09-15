import { Lightning, LockKey, PaperPlaneTilt } from "@phosphor-icons/react";

import { cn } from "../../lib/cn";
import { fmtInt } from "../../lib/format";
import { Avatar } from "../../ui/Avatar";
import { Button } from "../../ui/Button";
import { Flag } from "../../ui/Flag";

/**
 * One account in the list.
 *
 * The role is the loudest thing on the row after the name, because it is the
 * only field on this screen that grants anybody anything. A suspension reads
 * louder still — a banned account that looks like every other row is how one
 * gets quietly reinstated by somebody skim-reading.
 */

export type UserRowData = {
  _id: string;
  displayName: string;
  email: string;
  avatarUrl: string | null;
  role: string;
  isBanned: boolean;
  countryCode: string | null;
  walletBalanceCents: number;
  quillBalance: number;
  topicsBacked: number;
  joinedAt: number;
  actionable: boolean;
};

/** Staff read as staff at a glance; a plain reader stays quiet. */
const TONE: Record<string, string> = {
  admin: "border-love-fill/45 bg-love-fill/15 text-love",
  moderator: "border-coin-fill/45 bg-coin-fill/15 text-coin",
  creator: "border-go-fill/45 bg-go-fill/15 text-go",
  user: "border-line-2 bg-surface-3 text-mute",
};

export function UserRow({
  row,
  selected,
  onOpen,
}: {
  row: UserRowData;
  selected: boolean;
  onOpen: () => void;
}) {
  return (
    <li>
      <Button
        bare
        onClick={onOpen}
        className={cn(
          "card-hover flex w-full items-center gap-3 rounded-[var(--r-btn)] border px-3 py-2.5 text-left",
          selected
            ? "border-hate-fill bg-surface-2"
            : "border-line bg-surface-2/40 hover:border-line-2 hover:bg-surface-2",
          row.isBanned && "opacity-70",
        )}
      >
        <Avatar name={row.displayName} className="size-8 shrink-0 text-[13px]" />

        <span className="min-w-0 flex-1">
          <span className="flex items-center gap-1.5">
            <span
              className={cn(
                "truncate text-[13.5px] font-bold",
                row.isBanned ? "text-mute line-through" : "text-ink",
              )}
            >
              {row.displayName}
            </span>
            {row.countryCode ? <Flag code={row.countryCode} /> : null}
          </span>
          <span className="block truncate text-[11.5px] text-mute">{row.email}</span>
        </span>

        {/* What they have spent, not what they have said: this console is about
            accounts, and a wallet is the part of one that can go wrong. */}
        <span className="hidden shrink-0 items-center gap-3 sm:flex">
          {row.topicsBacked > 0 ? (
            <span className="flex items-center gap-1 text-[11.5px] font-bold text-coin">
              <Lightning weight="fill" className="size-3.5" />
              <span className="num">{fmtInt(row.topicsBacked)}</span>
            </span>
          ) : null}
          <span className="num w-14 text-right text-[11.5px] font-bold text-ink-3">
            ${(row.walletBalanceCents / 100).toFixed(2)}
          </span>
        </span>

        {row.isBanned ? (
          <span className="flex shrink-0 items-center gap-1 rounded-[var(--r-pill)] border border-love-fill/45 bg-love-fill/15 px-2 py-0.5 text-[10px] font-extrabold tracking-[0.06em] text-love uppercase">
            <LockKey weight="fill" className="size-3" />
            suspended
          </span>
        ) : (
          <span
            className={cn(
              "shrink-0 rounded-[var(--r-pill)] border px-2 py-0.5 text-[10px] font-extrabold tracking-[0.06em] uppercase",
              TONE[row.role] ?? TONE.user,
            )}
          >
            {row.role}
          </span>
        )}
      </Button>
    </li>
  );
}

/** The one-line summary the inspector opens with. */
export function Stat({
  label,
  value,
  tone,
}: {
  label: string;
  value: string;
  tone?: string;
}) {
  return (
    <span className="rounded-[var(--r-btn)] border border-line bg-surface-2 px-3 py-2">
      <span className="label block">{label}</span>
      <span className={cn("num block text-[15px] font-extrabold", tone ?? "text-ink")}>
        {value}
      </span>
    </span>
  );
}

/** Shown on the inspector when an account reaches the bot. */
export function TelegramLine({ handle }: { handle: string }) {
  return (
    <span className="flex items-center gap-1.5 text-[12px] text-ink-3">
      <PaperPlaneTilt weight="fill" className="size-3.5 shrink-0 text-hate" />
      Votes from Telegram as{" "}
      <span className="font-bold text-ink">
        {handle.startsWith("@") ? handle : `@${handle}`}
      </span>
    </span>
  );
}
