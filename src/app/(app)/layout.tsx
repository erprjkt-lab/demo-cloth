import { requireUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { can } from "@/lib/permissions";
import { AppShell } from "./AppShell";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const user = await requireUser();
  // Jobbers: jobs waiting on them. Office: jobs sent back to confirm, plus drafts to approve if they can.
  const officeWaiting = can(user.perms, "jobs", "approve") ? ["SENT_BACK", "DRAFT"] : ["SENT_BACK"];
  const [jobs, tasks] = await Promise.all([
    user.role === "JOBBER"
      ? db.jobWork.count({
          where: { deletedAt: null, jobberId: user.jobberId ?? "-", status: { in: ["ASSIGNED", "MATERIAL_RECEIVED", "IN_PROGRESS", "FINISHED"] } },
        })
      : db.jobWork.count({ where: { deletedAt: null, status: { in: officeWaiting as ("SENT_BACK" | "DRAFT")[] } } }),
    db.task.count({ where: { assignedToUserId: user.id, status: "OPEN" } }),
  ]);
  return (
    <AppShell user={{ name: user.name, role: user.role }} perms={user.perms} badges={{ jobs, tasks }}>
      {children}
    </AppShell>
  );
}
