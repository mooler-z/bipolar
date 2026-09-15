import { useState } from "react";
import { usePaginatedQuery } from "convex/react";
import { MagnifyingGlass, UserCircle, Users } from "@phosphor-icons/react";

import { api } from "../../../convex/_generated/api";
import type { Id } from "../../../convex/_generated/dataModel";
import { ROLES } from "../../../convex/lib/rbac";
import { PAGE } from "../../../convex/lib/page";
import { useAutoLoad } from "../../lib/useAutoLoad";
import { Button } from "../../ui/Button";
import { Field } from "../../ui/Field";
import { More } from "../../ui/More";
import { Aside, Empty, Work } from "./panes";
import { UserInspector } from "./UserInspector";
import { UserRow } from "./UserRow";

/**
 * Accounts, roles and suspensions.
 *
 * The same shape as every other section — a list on the left, whatever is
 * selected on the right — and for the same reason: somebody looking through
 * eighty accounts for one of them should never have to leave the list to read
 * it and then find their place again.
 *
 * The list is endless: twelve at a time, and the next twelve fetch themselves
 * as the end comes into view. Filters are applied to each page after it is
 * read — none of the three is an index — so a page can come back short and the
 * next scroll simply fetches another. Short pages, never missing rows.
 */

const STANDING = [
  { id: "", label: "All" },
  { id: "active", label: "Active" },
  { id: "banned", label: "Suspended" },
] as const;

export function UserList({ permissions }: { permissions: string[] }) {
  const [search, setSearch] = useState("");
  const [role, setRole] = useState("");
  const [standing, setStanding] = useState("");
  const [selected, setSelected] = useState<Id<"users"> | null>(null);

  const { results, status, loadMore } = usePaginatedQuery(
    api.adminUsers.list,
    {
      search: search || undefined,
      role: role || undefined,
      standing: standing || undefined,
    },
    { initialNumItems: PAGE },
  );
  const sentinel = useAutoLoad(status, loadMore, PAGE);

  const toolbar = (
    <>
      <span className="flex min-h-9 min-w-0 flex-1 items-center gap-2 rounded-[var(--r-btn)] border border-line-2 bg-surface-2 px-3 transition-colors focus-within:border-hate-fill">
        <MagnifyingGlass className="size-4 shrink-0 text-mute" />
        <Field
          bare
          label="Search accounts"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Name or email…"
        />
      </span>

      <span className="hidden shrink-0 items-center gap-1 lg:flex">
        {STANDING.map((s) => (
          <Button
            key={s.id || "all"}
            size="sm"
            variant={standing === s.id ? "go" : "steel"}
            onClick={() => setStanding(s.id)}
            className="!min-h-8 !px-2.5 !text-[11.5px]"
          >
            {s.label}
          </Button>
        ))}
      </span>

      <span className="hidden shrink-0 items-center gap-1 xl:flex">
        {["", ...ROLES].map((r) => (
          <Button
            key={r || "any"}
            size="sm"
            variant={role === r ? "go" : "steel"}
            onClick={() => setRole(r)}
            className="!min-h-8 !px-2.5 !text-[11.5px]"
          >
            {r || "Any role"}
          </Button>
        ))}
      </span>
    </>
  );

  return (
    <>
      <Work toolbar={toolbar}>
        {status === "LoadingFirstPage" ? (
          <ul className="space-y-2">
            {Array.from({ length: PAGE }, (_, i) => (
              <li key={i} className="shimmer h-14 rounded-[var(--r-btn)]" />
            ))}
          </ul>
        ) : results.length === 0 ? (
          <Empty
            icon={<Users weight="fill" className="size-6" />}
            title="Nobody matches"
            hint={
              search || role || standing
                ? "Nothing here answers to that. Clear the filters to see everybody."
                : "No accounts yet."
            }
          />
        ) : (
          <>
            <ul className="space-y-1.5">
              {results.map((row) => (
                <UserRow
                  key={row._id}
                  row={row}
                  selected={selected === row._id}
                  onOpen={() => setSelected(row._id as Id<"users">)}
                />
              ))}
            </ul>

            <More
              sentinel={sentinel}
              status={status}
              onMore={() => loadMore(PAGE)}
              count={results.length}
              noun="accounts"
            />
          </>
        )}
      </Work>

      <Aside
        title={selected ? "The account" : "Accounts"}
        icon={
          selected ? null : <UserCircle weight="fill" className="size-4 text-mute" />
        }
        sheet={!!selected}
        onClose={selected ? () => setSelected(null) : undefined}
      >
        {selected ? (
          <UserInspector userId={selected} permissions={permissions} />
        ) : (
          <div className="p-4">
            <p className="text-[13px] leading-relaxed text-mute">
              Open an account to see what it has done and what can be done to it.
            </p>
            <p className="mt-4 text-[12px] leading-relaxed text-mute">
              Roles are a strict hierarchy — user, creator, moderator, admin — and
              nobody can act on an account at or above their own rank, or on their
              own. Every suspension and every role change is recorded against the
              name that made it.
            </p>
          </div>
        )}
      </Aside>
    </>
  );
}
