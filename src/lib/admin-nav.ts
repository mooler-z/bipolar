import type { Icon } from "@phosphor-icons/react";
import {
  ClipboardText,
  Gauge,
  Scroll,
  Stack,
  Users,
  Wrench,
} from "@phosphor-icons/react";

import type { Permission } from "../../convex/lib/rbac";

/**
 * The console's navigation, declared once.
 *
 * The rail and the command palette both read this list and both apply the same
 * permission filter, so there is exactly one place a section can be added and
 * no way for the two to disagree about what a role may reach.
 *
 * Three bands, and the order is the order of the job: **the house** is what is
 * going on, **the work** is what you came to do, **the record** is what was
 * done. A console that files everything under one long list makes the reader
 * decide every time which of those they are looking at.
 *
 * `ready` is deliberate honesty: a section that has not been built yet is shown
 * dimmed rather than hidden, because the shape of the console is useful to see
 * and a link that silently does nothing is worse than one that says so.
 */
export type NavEntry = {
  id: string;
  label: string;
  icon: Icon;
  permission: Permission;
  ready: boolean;
  /** What the section is for, in one line. Shown in the palette and the bar. */
  blurb: string;
  /** Sections under a heading; the heading renders above the first of them. */
  group?: string;
};

export const NAV: NavEntry[] = [
  {
    id: "",
    label: "Overview",
    icon: Gauge,
    permission: "dashboard:view",
    ready: true,
    blurb: "What the house is doing right now",
  },
  {
    id: "topics",
    label: "Topics",
    icon: Stack,
    permission: "topics:update",
    ready: true,
    blurb: "Everything the feed can serve",
    group: "The work",
  },
  {
    id: "queue",
    label: "Review queue",
    icon: ClipboardText,
    permission: "topics:publish",
    ready: true,
    blurb: "Drafts waiting on a decision",
  },
  {
    id: "record",
    label: "The record",
    icon: Scroll,
    permission: "audit:read",
    ready: true,
    blurb: "Every privileged write, newest first",
    group: "Accountability",
  },
  {
    id: "users",
    label: "Users",
    icon: Users,
    permission: "users:read",
    ready: false,
    blurb: "Accounts, roles and suspensions",
  },
  {
    id: "maintenance",
    label: "Maintenance",
    icon: Wrench,
    permission: "maintenance:run",
    ready: false,
    blurb: "Backfills, resets and the census",
  },
];

/** The path a section lives at. The overview is the bare `/admin`. */
export function pathOf(id: string): string {
  return id ? `/admin/${id}` : "/admin";
}

/**
 * Which section a path is showing.
 *
 * Unknown, unbuilt and **unreachable** paths all fall back to the overview. The
 * last of those is not cosmetic: every section behind this console is a query
 * that refuses a role it does not recognise, and a refused query thrown during
 * render takes the whole app down. A typed URL must not be able to do that, so
 * a role that cannot open a section is simply never handed it.
 */
export function sectionOf(path: string, permissions: string[] = []): string {
  const rest = path.replace(/^\/admin\/?/, "");
  const entry = NAV.find((n) => n.id === rest && n.ready);
  if (!entry) return "";
  return permissions.includes(entry.permission) ? rest : "";
}

/** The entry for a section id, or the overview. */
export function entryOf(id: string): NavEntry {
  return NAV.find((n) => n.id === id) ?? NAV[0]!;
}

/** What this role may actually open, in nav order. */
export function reachable(permissions: string[]): NavEntry[] {
  return NAV.filter((n) => permissions.includes(n.permission));
}
