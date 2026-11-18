import { requireUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { AppShell } from "./AppShell";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const user = await requireUser();
  const myOpenTasks = await db.task.count({ where: { assignedToUserId: user.id, status: "OPEN" } });
  return (
    <AppShell user={{ name: user.name, role: user.role }} taskBadge={myOpenTasks}>
      {children}
    </AppShell>
  );
}
