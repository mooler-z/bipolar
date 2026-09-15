import { useState } from "react";
import { useMutation, useQuery } from "convex/react";
import { LockKey, LockKeyOpen, ShieldCheck, Warning } from "@phosphor-icons/react";

import { api } from "../../../convex/_generated/api";
import type { Id } from "../../../convex/_generated/dataModel";
import { ROLES } from "../../../convex/lib/rbac";
import { cn } from "../../lib/cn";
import { fmtInt } from "../../lib/format";
import { Avatar } from "../../ui/Avatar";
import { Button } from "../../ui/Button";
import { Flag } from "../../ui/Flag";
import { Stat, TelegramLine } from "./UserRow";

/**
 * One account, and the two things that can be done to it.
 *
 * Both are confirmed rather than instant. Suspending somebody and changing
 * what they are allowed to do are the only acts in this console that reach a
 * person rather than a topic, and a single misdirected click doing either is
 * not a risk worth the saved second.
 *
 * `actionable` comes from the server, which decides it the same way the
 * mutations do: never yourself, and never anybody at or above your own rank.
 * The buttons follow that flag so the screen agrees with what will happen —
 * but the refusal in the mutation is the actual control, not this.
 */
export function UserInspector({
  userId,
  permissions,
}: {
  userId: Id<"users">;
  permissions: string[];
}) {
  const detail = useQuery(api.adminUsers.detail, { userId });
  const setBanned = useMutation(api.adminUsers.setBanned);
  const setRole = useMutation(api.adminUsers.setRole);
  const [confirm, setConfirm] = useState<"ban" | "role" | null>(null);
  const [role, setRoleChoice] = useState<string>("");
  const [error, setError] = useState("");

  if (detail === undefined) {
    return (
      <div className="space-y-2 p-4">
        <span className="shimmer block h-16 rounded-[var(--r-btn)]" />
        <span className="shimmer block h-24 rounded-[var(--r-btn)]" />
      </div>
    );
  }
  if (detail === null) {
    return <p className="p-4 text-[13px] text-mute">That account is gone.</p>;
  }

  const u = detail.user;
  const canBan = permissions.includes("users:ban") && u.actionable;
  const canSetRole = permissions.includes("users:set_role") && u.actionable;
  const accuracy =
    detail.calls.graded > 0
      ? Math.round((detail.calls.right / detail.calls.graded) * 100)
      : null;

  async function run(what: () => Promise<unknown>) {
    setError("");
    try {
      await what();
      setConfirm(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    }
  }

  return (
    <div className="space-y-4 p-4">
      <div className="flex items-start gap-3">
        <Avatar name={u.displayName} className="size-11 shrink-0 text-[16px]" />
        <div className="min-w-0 flex-1">
          <p className="flex items-center gap-1.5">
            <span className="truncate text-[15px] font-extrabold text-ink">
              {u.displayName}
            </span>
            {u.countryCode ? <Flag code={u.countryCode} /> : null}
          </p>
          <p className="truncate text-[12px] text-mute">{u.email}</p>
          <p className="mt-1 flex items-center gap-2">
            <span className="label">{u.role}</span>
            <span className="text-[11px] text-mute">
              joined {new Date(u.joinedAt).toLocaleDateString()}
            </span>
          </p>
        </div>
      </div>

      {u.isBanned ? (
        <p className="flex items-center gap-2 rounded-[var(--r-btn)] border border-love-fill/45 bg-love-fill/12 px-3 py-2 text-[12px] font-bold text-love">
          <LockKey weight="fill" className="size-4 shrink-0" />
          Suspended. Cannot vote, comment or sign in to the console.
        </p>
      ) : null}

      {detail.telegram ? <TelegramLine handle={detail.telegram} /> : null}

      <div className="grid grid-cols-2 gap-2">
        <Stat label="Votes" value={fmtInt(detail.votes)} />
        <Stat
          label="Lean"
          value={
            detail.votes === 0
              ? "—"
              : `${Math.round((detail.love / detail.votes) * 100)}% love`
          }
        />
        <Stat label="Sparks" value={fmtInt(detail.paid)} tone="text-coin" />
        <Stat label="Comments" value={fmtInt(detail.comments)} />
        <Stat label="Wallet" value={`$${(u.walletBalanceCents / 100).toFixed(2)}`} />
        <Stat label="Quills" value={fmtInt(u.quillBalance)} />
        <Stat
          label="Calls right"
          value={accuracy === null ? "—" : `${accuracy}%`}
          tone={accuracy !== null && accuracy >= 60 ? "text-go" : undefined}
        />
        <Stat label="Streak" value={fmtInt(detail.calls.streak)} tone="text-streak" />
      </div>

      {detail.acted > 0 ? (
        <p className="flex items-center gap-1.5 text-[11.5px] text-mute">
          <ShieldCheck weight="fill" className="size-3.5 shrink-0 text-go" />
          <span className="num font-bold text-ink-3">{fmtInt(detail.acted)}</span> privileged
          acts on the record
        </p>
      ) : null}

      {/* ── what can be done ──────────────────────────────────────────── */}

      {!u.actionable ? (
        <p className="rounded-[var(--r-btn)] border border-line bg-surface-2 px-3 py-2.5 text-[12px] leading-snug text-mute">
          {u.role === "admin" || u.role === "moderator"
            ? "This account ranks at or above yours, so it cannot be changed here."
            : "You cannot change your own account from this console."}
        </p>
      ) : (
        <div className="space-y-2 border-t border-line pt-4">
          {canSetRole ? (
            <>
              <span className="label block">Role</span>
              <div className="flex flex-wrap gap-1.5">
                {ROLES.map((r) => (
                  <Button
                    key={r}
                    size="sm"
                    variant={u.role === r ? "go" : "steel"}
                    disabled={u.role === r}
                    onClick={() => {
                      setRoleChoice(r);
                      setConfirm("role");
                    }}
                    className="!min-h-8 !px-2.5 !text-[11.5px]"
                  >
                    {r}
                  </Button>
                ))}
              </div>
            </>
          ) : null}

          {confirm === "role" ? (
            <Confirm
              what={`Make ${u.displayName} a ${role}?`}
              why="Roles decide what somebody can reach in this console. The change is recorded against your name."
              onCancel={() => setConfirm(null)}
              onConfirm={() => void run(() => setRole({ userId, role }))}
            />
          ) : null}

          {canBan ? (
            <Button
              size="sm"
              variant={u.isBanned ? "steel" : "hate"}
              block
              className="mt-1"
              onClick={() => setConfirm("ban")}
            >
              {u.isBanned ? (
                <>
                  <LockKeyOpen weight="bold" className="size-4" /> Reinstate
                </>
              ) : (
                <>
                  <LockKey weight="bold" className="size-4" /> Suspend
                </>
              )}
            </Button>
          ) : null}

          {confirm === "ban" ? (
            <Confirm
              what={
                u.isBanned
                  ? `Reinstate ${u.displayName}?`
                  : `Suspend ${u.displayName}?`
              }
              why={
                u.isBanned
                  ? "They can vote, comment and sign in again."
                  : "They keep every vote they have cast, and can do nothing further until reinstated."
              }
              onCancel={() => setConfirm(null)}
              onConfirm={() =>
                void run(() => setBanned({ userId, banned: !u.isBanned }))
              }
            />
          ) : null}
        </div>
      )}

      {error ? (
        <p className="flex items-start gap-2 rounded-[var(--r-btn)] bg-love-fill/15 px-3 py-2 text-[12px] font-semibold text-love">
          <Warning weight="fill" className="mt-0.5 size-3.5 shrink-0" />
          {error}
        </p>
      ) : null}
    </div>
  );
}

/** A second press, and a sentence saying what the first one meant. */
function Confirm({
  what,
  why,
  onCancel,
  onConfirm,
}: {
  what: string;
  why: string;
  onCancel: () => void;
  onConfirm: () => void;
}) {
  return (
    <div className={cn("slide-up rounded-[var(--r-btn)] border-2 border-coin-fill/45 bg-coin-fill/[0.08] p-3")}>
      <p className="text-[12.5px] font-bold text-ink">{what}</p>
      <p className="mt-1 text-[11.5px] leading-snug text-ink-3">{why}</p>
      <div className="mt-2.5 flex gap-2">
        <Button size="sm" variant="go" onClick={onConfirm} className="!min-h-8 flex-1">
          Confirm
        </Button>
        <Button size="sm" variant="steel" onClick={onCancel} className="!min-h-8">
          Cancel
        </Button>
      </div>
    </div>
  );
}
