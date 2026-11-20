import { db } from "@/lib/db";
import { requirePerm } from "@/lib/auth";
import { can } from "@/lib/permissions";
import { JobbersClient } from "./JobbersClient";

export default async function JobbersPage() {
  const me = await requirePerm("jobbers");
  const jobbers = await db.jobber.findMany({
    where: { deletedAt: null },
    orderBy: { name: "asc" },
    select: {
      id: true,
      name: true,
      ownerName: true,
      gstNo: true,
      mobile1: true,
      mobile2: true,
      address: true,
      _count: {
        select: {
          challans: { where: { deletedAt: null } },
          jobs: { where: { deletedAt: null, status: { not: "COMPLETED" } } },
        },
      },
    },
  });

  return (
    <JobbersClient
      canWrite={can(me.perms, "jobbers", "write")}
      canModify={can(me.perms, "jobbers", "modify")}
      rows={jobbers.map(({ _count, ...j }) => ({
        ...j,
        challans: _count.challans,
        openJobs: _count.jobs,
      }))}
    />
  );
}
