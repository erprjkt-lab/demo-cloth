import { redirect } from "next/navigation";
import { requireUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { challanNo } from "@/lib/format";
import { JOB_STEPS } from "@/lib/jobs";
import { can } from "@/lib/permissions";
import { Dashboard } from "./Dashboard";

const RUNNING = ["ASSIGNED", "MATERIAL_RECEIVED", "IN_PROGRESS", "FINISHED", "SENT_BACK"] as const;

export default async function DashboardPage() {
  const me = await requireUser();
  // No dashboard access (jobbers): land on the first menu they do have.
  if (!can(me.perms, "dashboard")) redirect(can(me.perms, "jobs") ? "/jobs" : can(me.perms, "challans") ? "/challans" : "/tasks");

  const now = new Date();
  const weekAhead = new Date(now.getTime() + 7 * 86_400_000);
  const [byStatus, dueReminders, openIssues, running, upcoming] = await Promise.all([
    db.jobWork.groupBy({ by: ["status"], where: { deletedAt: null }, _count: true }),
    db.task.count({ where: { status: "OPEN", remindAt: { lte: now } } }),
    db.qcIssue.count({ where: { resolvedAt: null, qc: { jobWork: { deletedAt: null } } } }),
    // Jobs out with jobbers, most urgent first (no due date last).
    db.jobWork.findMany({
      where: { deletedAt: null, status: { in: [...RUNNING] } },
      orderBy: [{ dueDate: { sort: "asc", nulls: "last" } }, { updatedAt: "desc" }],
      take: 50,
      select: {
        id: true,
        no: true,
        title: true,
        status: true,
        pieces: true,
        dueDate: true,
        updatedAt: true,
        jobber: { select: { name: true } },
        catalog: { select: { name: true, volume: true } },
      },
    }),
    // Open tasks due within a week, overdue ones included.
    db.task.findMany({
      where: { status: "OPEN", dueAt: { lte: weekAhead } },
      orderBy: { dueAt: "asc" },
      take: 15,
      select: {
        id: true,
        title: true,
        dueAt: true,
        assignedTo: { select: { name: true } },
        challan: { select: { id: true, no: true } },
      },
    }),
  ]);

  return (
    <Dashboard
      name={me.name}
      kpis={{ dueReminders, openIssues }}
      jobsByStatus={JOB_STEPS.map((s) => ({ status: s, count: byStatus.find((b) => b.status === s)?._count ?? 0 }))}
      running={running.map((j) => ({
        id: j.id,
        no: j.no,
        title: j.title,
        status: j.status,
        pieces: j.pieces,
        dueDate: j.dueDate,
        updatedAt: j.updatedAt,
        jobber: j.jobber.name,
        catalog: j.catalog ? `${j.catalog.name} ${j.catalog.volume ?? ""}`.trim() : null,
      }))}
      upcoming={upcoming.map((t) => ({
        id: t.id,
        title: t.title,
        dueAt: t.dueAt!,
        assignedTo: t.assignedTo.name,
        challan: t.challan && { id: t.challan.id, no: challanNo(t.challan.no) },
      }))}
    />
  );
}
