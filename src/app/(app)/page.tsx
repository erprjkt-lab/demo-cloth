import { redirect } from "next/navigation";
import { requireUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { TZ } from "@/lib/format";
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
        dueDate: true,
        jobber: { select: { name: true } },
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
      },
    }),
  ]);

  const count = (...st: string[]) => byStatus.filter((b) => st.includes(b.status)).reduce((n, b) => n + b._count, 0);
  const hour = Number(now.toLocaleString("en-GB", { hour: "2-digit", hourCycle: "h23", timeZone: TZ }));
  const part = hour < 12 ? "morning" : hour < 17 ? "afternoon" : "evening";

  return (
    <Dashboard
      greeting={`Good ${part}, ${me.name.split(" ")[0]}`}
      today={now.toLocaleDateString("en-GB", { weekday: "long", day: "numeric", month: "long", timeZone: TZ })}
      counts={{
        running: count(...RUNNING),
        drafts: count("DRAFT"),
        toReceive: count("SENT_BACK"),
        openIssues,
        dueReminders,
      }}
      running={running.map((j) => ({ id: j.id, no: j.no, title: j.title, status: j.status, dueDate: j.dueDate, jobber: j.jobber.name }))}
      upcoming={upcoming.map((t) => ({ id: t.id, title: t.title, dueAt: t.dueAt!, assignedTo: t.assignedTo.name }))}
    />
  );
}
