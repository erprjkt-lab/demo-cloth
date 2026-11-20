import { db } from "@/lib/db";
import { requirePerm } from "@/lib/auth";
import { can, effectivePerms } from "@/lib/permissions";
import { PermissionsClient } from "./PermissionsClient";

export default async function PermissionsPage() {
  const me = await requirePerm("permissions");
  const users = await db.user.findMany({
    where: { role: { not: "ADMIN" } },
    orderBy: [{ role: "asc" }, { name: "asc" }],
    select: {
      id: true,
      name: true,
      username: true,
      role: true,
      isActive: true,
      permissions: { select: { module: true, read: true, write: true, modify: true, delete: true, approve: true } },
    },
  });

  return (
    <PermissionsClient
      canGrant={can(me.perms, "permissions", "modify")}
      users={users.map((u) => ({
        id: u.id,
        label: `${u.name} (${u.username}) · ${u.role.toLowerCase()}${u.isActive ? "" : " · inactive"}`,
        custom: u.permissions.length > 0,
        perms: effectivePerms(u.role, u.permissions),
      }))}
    />
  );
}
