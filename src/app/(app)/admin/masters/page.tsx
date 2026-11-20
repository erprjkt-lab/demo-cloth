import { requirePerm } from "@/lib/auth";
import { db } from "@/lib/db";
import { can } from "@/lib/permissions";
import { MastersClient } from "./MastersClient";

export default async function MastersPage() {
  const me = await requirePerm("masters");
  const items = await db.masterItem.findMany({
    orderBy: [{ sort: "asc" }, { name: "asc" }],
    include: { _count: { select: { challanLines: true, catalogs: true } } },
  });

  return (
    <MastersClient
      canWrite={can(me.perms, "masters", "write")}
      canModify={can(me.perms, "masters", "modify")}
      items={items.map((i) => ({
        id: i.id,
        kind: i.kind,
        name: i.name,
        sort: i.sort,
        isActive: i.isActive,
        used: i.kind === "PART" ? i._count.challanLines : i._count.catalogs,
      }))}
    />
  );
}
