/**
 * Roles, permissions, and the mapping between them.
 *
 * **The single source of truth.** This module is imported by the Convex
 * functions that enforce access *and* by the React client that decides what to
 * render, so a change here breaks both sides at once rather than letting the UI
 * drift into offering something the server refuses.
 *
 * A user holds exactly one role, and roles are a strict superset hierarchy:
 *
 *     user ⊂ creator ⊂ moderator ⊂ admin
 *
 * Roles are static and code-defined. There is no runtime role editing, because
 * a permission set that can be changed at runtime is a permission set nothing
 * can be reasoned about.
 */

export const ROLES = ["user", "creator", "moderator", "admin"] as const;
export type Role = (typeof ROLES)[number];

/** Higher means more access. Drives the hierarchy and ownership scoping. */
export const ROLE_RANK: Record<Role, number> = {
  user: 0,
  creator: 1,
  moderator: 2,
  admin: 3,
};

/**
 * The catalogue. Every guard checks a capability, **never a role name** — the
 * moment a check reads `role === "admin"` the hierarchy stops being the thing
 * that decides, and the next tier added silently loses access it should have.
 */
export const PERMISSIONS = [
  "dashboard:view",
  "topics:create",
  "topics:update",
  "topics:archive",
  "topics:publish",
  "topics:feature",
  "topics:lock",
  "users:read",
  "users:ban",
  "users:set_role",
  "audit:read",
  "ingest:run",
  "maintenance:run",
  "settings:manage",
] as const;
export type Permission = (typeof PERMISSIONS)[number];

/**
 * What each tier adds **on top of** the tier below it.
 *
 * Incremental on purpose: the effective set is the union of a tier and every
 * tier under it, which makes the superset relationship a property of the data
 * rather than a convention three people have to remember.
 */
const INCREMENTAL: Record<Role, readonly Permission[]> = {
  user: [],
  creator: ["dashboard:view", "topics:create", "topics:update"],
  moderator: [
    "topics:archive",
    "topics:publish",
    "topics:feature",
    "topics:lock",
    "users:read",
    "users:ban",
  ],
  admin: [
    "users:set_role",
    "audit:read",
    "ingest:run",
    "maintenance:run",
    "settings:manage",
  ],
};

/** Every permission a role actually holds. */
export function permissionsFor(role: Role): Permission[] {
  const max = ROLE_RANK[role];
  const out = new Set<Permission>();
  for (const r of ROLES) {
    if (ROLE_RANK[r] <= max) for (const p of INCREMENTAL[r]) out.add(p);
  }
  return [...out];
}

export function hasPermission(role: Role, permission: Permission): boolean {
  return permissionsFor(role).includes(permission);
}

/** True when the role meets or exceeds `min` in the hierarchy. */
export function roleAtLeast(role: Role, min: Role): boolean {
  return ROLE_RANK[role] >= ROLE_RANK[min];
}

/**
 * Who may enter the console at all — anyone above a plain reader. Individual
 * pages still gate on their own capability; this only opens the door.
 */
export function isStaff(role: Role): boolean {
  return roleAtLeast(role, "creator");
}

/**
 * Content ownership scoping.
 *
 * A creator may only act on topics they authored; moderators and above act on
 * everything. This cannot live in a permission check — a capability does not
 * know who wrote the row — so it is enforced where the document is in hand.
 */
export function canManageAllContent(role: Role): boolean {
  return roleAtLeast(role, "moderator");
}
