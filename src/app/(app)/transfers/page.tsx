import { db } from "@/lib/db";
import { requirePerm } from "@/lib/auth";
import { challanNo, fmtDateTime } from "@/lib/format";
import { JOB_STATUS, jobNo, TRANSFERABLE } from "@/lib/jobs";
import { can } from "@/lib/permissions";
import { TransfersClient } from "./TransfersClient";

export default async function TransfersPage({ searchParams }: { searchParams: Promise<{ job?: string }> }) {
  const me = await requirePerm("transfers");
  const { job } = await searchParams;
  const canWrite = me.role !== "JOBBER" && can(me.perms, "transfers", "write");
  const [transfers, challans, jobs, jobbers] = await Promise.all([
    db.transfer.findMany({
      orderBy: { createdAt: "desc" },
      take: 500,
      include: {
        challan: { select: { id: true, no: true } },
        jobWork: { select: { id: true, no: true } },
        fromJobber: { select: { name: true } },
        toJobber: { select: { name: true } },
        createdBy: { select: { name: true } },
      },
    }),
    canWrite
      ? db.challan.findMany({ where: { deletedAt: null }, orderBy: { no: "desc" }, take: 500, select: { id: true, no: true, jobber: { select: { name: true } } } })
      : [],
    canWrite
      ? db.jobWork.findMany({
          where: { deletedAt: null, status: { in: TRANSFERABLE } },
          orderBy: { no: "desc" },
          select: { id: true, no: true, title: true, status: true, jobberId: true, jobber: { select: { name: true } }, _count: { select: { challans: { where: { deletedAt: null } } } } },
        })
      : [],
    canWrite ? db.jobber.findMany({ where: { deletedAt: null }, orderBy: { name: "asc" }, select: { id: true, name: true } }) : [],
  ]);

  return (
    <TransfersClient
      canWrite={canWrite}
      initialJobId={job}
      challans={challans.map((c) => ({ value: c.id, label: `${challanNo(c.no)} · ${c.jobber.name}` }))}
      jobs={jobs.map((j) => ({
        value: j.id,
        label: `${jobNo(j.no)} · ${j.title} · ${j.jobber.name} (${JOB_STATUS[j.status].label})`,
        jobberId: j.jobberId,
        challans: j._count.challans,
      }))}
      jobbers={jobbers.map((j) => ({ value: j.id, label: j.name }))}
      rows={transfers.map((t) => ({
        id: t.id,
        at: fmtDateTime(t.createdAt),
        what: t.jobWork
          ? { kind: "job" as const, id: t.jobWork.id, no: jobNo(t.jobWork.no) }
          : t.challan
            ? { kind: "challan" as const, id: t.challan.id, no: challanNo(t.challan.no) }
            : null,
        from: t.fromJobber.name,
        to: t.toJobber.name,
        type: t.type,
        note: t.note,
        by: t.createdBy.name,
      }))}
    />
  );
}
