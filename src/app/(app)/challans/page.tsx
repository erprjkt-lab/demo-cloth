import { db } from "@/lib/db";
import { jobberScope, requirePerm } from "@/lib/auth";
import { can } from "@/lib/permissions";
import { challanRowInclude, toChallanRow } from "@/lib/rows";
import { ChallansClient } from "./ChallansClient";

export default async function ChallansPage() {
  const me = await requirePerm("challans");
  // ponytail: newest 500 only; move search to the server once there are more challans than that.
  const challans = await db.challan.findMany({
    where: { deletedAt: null, ...jobberScope(me) },
    orderBy: { no: "desc" },
    take: 500,
    include: challanRowInclude,
  });
  const office = me.role !== "JOBBER";

  return (
    <ChallansClient
      rows={challans.map(toChallanRow)}
      jobber={!office}
      canCreate={office && can(me.perms, "challans", "write")}
      canTransfer={office && can(me.perms, "transfers", "write")}
      canDelete={can(me.perms, "challans", "delete")}
    />
  );
}
