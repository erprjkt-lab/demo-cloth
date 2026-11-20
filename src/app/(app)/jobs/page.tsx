import { db } from "@/lib/db";
import { jobScope, requirePerm } from "@/lib/auth";
import { QC_ISSUE_LABEL } from "@/lib/jobs";
import { can } from "@/lib/permissions";
import { JobsClient } from "./JobsClient";

export default async function JobsPage({ searchParams }: { searchParams: Promise<{ view?: string; tab?: string; new?: string }> }) {
  const me = await requirePerm("jobs");
  const { view, tab, new: openNew } = await searchParams;
  const office = me.role !== "JOBBER";
  const canEdit = office && (can(me.perms, "jobs", "write") || can(me.perms, "jobs", "modify"));

  // ponytail: newest 500 jobs; move filtering to the server once there are more.
  const [jobs, jobbers, catalogs] = await Promise.all([
    db.jobWork.findMany({
      where: { deletedAt: null, ...jobScope(me) },
      orderBy: { no: "desc" },
      take: 500,
      include: {
        jobber: { select: { name: true } },
        catalog: { select: { name: true, volume: true } },
        _count: { select: { challans: { where: { deletedAt: null } } } },
        qcs: {
          orderBy: { createdAt: "desc" },
          select: { result: true, receivedPieces: true, missingPieces: true, rejectedPieces: true, issues: { where: { resolvedAt: null }, select: { type: true, qty: true, note: true } } },
        },
      },
    }),
    canEdit ? db.jobber.findMany({ where: { deletedAt: null }, orderBy: { name: "asc" }, select: { id: true, name: true } }) : [],
    canEdit
      ? db.catalog.findMany({ where: { deletedAt: null }, orderBy: { updatedAt: "desc" }, select: { id: true, name: true, volume: true } })
      : [],
  ]);

  return (
    <JobsClient
      role={me.role}
      perms={me.perms.jobs ?? []}
      canTransfer={office && can(me.perms, "transfers", "write")}
      initialViewId={view}
      initialTab={tab}
      openNew={openNew === "1"}
      jobbers={jobbers}
      catalogs={catalogs.map((c) => ({ id: c.id, name: `${c.name} ${c.volume ?? ""}`.trim() }))}
      rows={jobs.map((j) => ({
        id: j.id,
        no: j.no,
        title: j.title,
        jobberId: j.jobberId,
        jobber: j.jobber.name,
        catalogId: j.catalogId,
        catalog: j.catalog ? `${j.catalog.name} ${j.catalog.volume ?? ""}`.trim() : null,
        pieces: j.pieces,
        dueDate: j.dueDate?.toISOString().slice(0, 10) ?? null,
        notes: j.notes,
        status: j.status,
        challans: j._count.challans,
        lastQc: j.qcs[0]?.result ?? null,
        // From the latest QC: what came back, what failed, what never arrived.
        received: j.qcs[0]?.receivedPieces ?? null,
        rejected: j.qcs[0]?.rejectedPieces ?? null,
        notReceived: j.qcs[0]?.missingPieces ?? null,
        openIssues: j.qcs.reduce((n, q) => n + q.issues.length, 0),
        // Sent back for rework: what the jobber has to fix, in one line ("10 missing, 5 loose stitching").
        fix:
          j.qcs[0]?.result === "REWORK" && j.status !== "COMPLETED"
            ? j.qcs[0].issues.map((i) => [i.qty, (i.note || QC_ISSUE_LABEL[i.type]).toLowerCase()].filter(Boolean).join(" ")).join(", ") || null
            : null,
        updatedAt: j.updatedAt,
      }))}
    />
  );
}
