// Menu access, CoreFlow style: Read / Write (create) / Modify (edit, status) / Delete / Approve per menu.
// Pure data so the sidebar (client) and every Server Action (server) read the same rules.

export const ACTIONS = ["read", "write", "modify", "delete", "approve"] as const;
export type Action = (typeof ACTIONS)[number];
type Role = "ADMIN" | "STAFF" | "JOBBER";

/** Each menu lists only the actions it supports. */
export const MODULES = [
  { key: "dashboard", label: "Dashboard", actions: ["read"] },
  { key: "jobs", label: "Job Work", actions: ["read", "write", "modify", "delete", "approve"] },
  { key: "challans", label: "Challans", actions: ["read", "write", "modify", "delete"] },
  { key: "catalogs", label: "Catalogues", actions: ["read", "write", "modify", "delete"] },
  { key: "jobbers", label: "Jobbers", actions: ["read", "write", "modify"] },
  { key: "transfers", label: "Job Transfer", actions: ["read", "write"] },
  { key: "tasks", label: "Tasks", actions: ["read", "write", "modify"] },
  { key: "users", label: "Users", actions: ["read", "write", "modify"] },
  { key: "permissions", label: "Permissions", actions: ["read", "modify"] },
] as const satisfies readonly { key: string; label: string; actions: readonly Action[] }[];

export type ModuleKey = (typeof MODULES)[number]["key"];
export type PermMap = Partial<Record<ModuleKey, Action[]>>;

const all = (): PermMap => Object.fromEntries(MODULES.map((m) => [m.key, [...m.actions]]));

/**
 * Starting access per role. Jobbers' "modify" on jobs/tasks means updating their own status.
 * Staff create job work as drafts; approving a draft (and so assigning it) is admin-only by default.
 */
export const ROLE_DEFAULTS: Record<Role, PermMap> = {
  ADMIN: all(),
  STAFF: {
    dashboard: ["read"],
    jobs: ["read", "write", "modify"],
    challans: ["read", "write", "modify"],
    catalogs: ["read", "write", "modify"],
    jobbers: ["read", "write", "modify"],
    transfers: ["read", "write"],
    tasks: ["read", "write", "modify"],
  },
  JOBBER: {
    jobs: ["read", "modify"],
    challans: ["read"],
    tasks: ["read", "modify"],
  },
};

type Override = { module: string } & Record<Action, boolean>;

/** Role defaults, replaced per menu by the user's saved overrides. Admin is always full (no lock-out). */
export function effectivePerms(role: Role, overrides: Override[]): PermMap {
  if (role === "ADMIN") return all();
  const perms: PermMap = { ...ROLE_DEFAULTS[role] };
  for (const o of overrides) {
    const mod = MODULES.find((m) => m.key === o.module);
    if (mod) perms[mod.key] = (mod.actions as readonly Action[]).filter((a) => o[a]);
  }
  return perms;
}

export const can = (perms: PermMap, module: ModuleKey, action: Action = "read") =>
  perms[module]?.includes(action) ?? false;
