import { db } from "@/lib/db";
import { requirePerm } from "@/lib/auth";
import { challanNo } from "@/lib/format";
import { can } from "@/lib/permissions";
import { TasksClient } from "./TasksClient";

export default async function TasksPage() {
  const me = await requirePerm("tasks");
  const office = me.role !== "JOBBER";
  const canWrite = office && can(me.perms, "tasks", "write");

  // ponytail: office users see every task; add a "mine" filter if the list gets long.
  const mine = office ? {} : { assignedToUserId: me.id };
  const [open, done, users, challans] = await Promise.all([
    db.task.findMany({ where: { ...mine, status: "OPEN" }, orderBy: [{ dueAt: { sort: "asc", nulls: "last" } }, { createdAt: "desc" }], include: taskInclude }),
    db.task.findMany({ where: { ...mine, status: "DONE" }, orderBy: { completedAt: "desc" }, take: 200, include: taskInclude }),
    canWrite
      ? db.user.findMany({
          where: { isActive: true },
          orderBy: [{ role: "asc" }, { name: "asc" }],
          select: { id: true, name: true, role: true, jobber: { select: { name: true } } },
        })
      : [],
    canWrite
      ? db.challan.findMany({ where: { deletedAt: null }, orderBy: { no: "desc" }, take: 500, select: { id: true, no: true, jobber: { select: { name: true } } } })
      : [],
  ]);

  return (
    <TasksClient
      office={office}
      canWrite={canWrite}
      canModify={can(me.perms, "tasks", "modify")}
      users={users.map((u) => ({
        value: u.id,
        label: `${u.name}${u.jobber ? ` (jobber: ${u.jobber.name})` : u.role === "JOBBER" ? " (jobber)" : ""}`,
      }))}
      challans={challans.map((c) => ({ value: c.id, label: `${challanNo(c.no)} · ${c.jobber.name}` }))}
      rows={[...open, ...done].map((t) => ({
        id: t.id,
        title: t.title,
        description: t.description,
        assignedTo: t.assignedTo.name,
        createdBy: t.createdBy.name,
        challan: t.challan && { id: t.challan.id, no: challanNo(t.challan.no) },
        dueAt: t.dueAt,
        remindAt: t.remindAt,
        status: t.status,
        completedAt: t.completedAt,
      }))}
    />
  );
}

const taskInclude = {
  assignedTo: { select: { name: true } },
  createdBy: { select: { name: true } },
  challan: { select: { id: true, no: true } },
} as const;
