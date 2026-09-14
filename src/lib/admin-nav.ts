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
 * The sidebar and the command palette both read this list and both apply the
 * same permission filter, so there is exactly one place a section can be added
 * and no way for the two to disagree about what a role may reach.
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
  /** Sections under a heading; the heading renders above the first of them. */
  group?: string;
};

export const NAV: NavEntry[] = [
  { id: "", label: "Dashboard", icon: Gauge, permission: "dashboard:view", ready: true },
  { id: "topics", label: "Topics", icon: Stack, permission: "topics:update", ready: true },
  { id: "queue", label: "Review queue", icon: ClipboardText, permission: "topics:create", ready: false },
  { id: "users", label: "Users", icon: Users, permission: "users:read", ready: false },
  { id: "audit", label: "Audit log", icon: Scroll, permission: "audit:read", ready: false, group: "System" },
  { id: "maintenance", label: "Maintenance", icon: Wrench, permission: "maintenance:run", ready: false },
];

/** The path a section lives at. The dashboard is the bare `/admin`. */
export function pathOf(id: string): string {
  return id ? `/admin/${id}` : "/admin";
}

/** Which section a path is showing. Unknown paths fall back to the dashboard. */
export function sectionOf(path: string): string {
  const rest = path.replace(/^\/admin\/?/, "");
  return NAV.some((n) => n.id === rest && n.ready) ? rest : "";
}

/** What this role may actually open, in nav order. */
export function reachable(permissions: string[]): NavEntry[] {
  return NAV.filter((n) => permissions.includes(n.permission));
}
