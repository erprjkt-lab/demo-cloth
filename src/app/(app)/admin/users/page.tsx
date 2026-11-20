import { db } from "@/lib/db";
import { requirePerm } from "@/lib/auth";
import { can } from "@/lib/permissions";
import { UsersClient } from "./UsersClient";

export default async function UsersPage() {
  const me = await requirePerm("users");
  const [users, jobbers] = await Promise.all([
    db.user.findMany({
      orderBy: { createdAt: "asc" },
      select: { id: true, username: true, name: true, role: true, jobberId: true, isActive: true, lockedUntil: true, jobber: { select: { name: true } } },
    }),
    db.jobber.findMany({ where: { deletedAt: null }, orderBy: { name: "asc" }, select: { id: true, name: true } }),
  ]);
  const now = new Date();

  return (
    <UsersClient
      meId={me.id}
      canWrite={can(me.perms, "users", "write")}
      canModify={can(me.perms, "users", "modify")}
      jobbers={jobbers.map((j) => ({ value: j.id, label: j.name }))}
      rows={users.map(({ jobber, lockedUntil, ...u }) => ({ ...u, jobber: jobber?.name ?? null, locked: !!lockedUntil && lockedUntil > now }))}
    />
  );
}
