import Link from "next/link";
import type { Prisma } from "@prisma/client";
import { db } from "@/lib/db";
import { requireUser } from "@/lib/auth";
import { challanNo, fmtDateTime } from "@/lib/format";
import { Empty, PageHeader } from "@/components/ui";
import { markDone } from "./actions";
import { PushToggle } from "./PushToggle";

const VIEWS = { open: "Open", reminders: "Reminders", done: "Done" } as const;
type View = keyof typeof VIEWS;

export default async function TasksPage({ searchParams }: { searchParams: Promise<{ view?: string }> }) {
  const me = await requireUser();
  const sp = await searchParams;
  const view: View = sp.view && sp.view in VIEWS ? (sp.view as View) : "open";
  const office = me.role !== "JOBBER";
  const now = new Date();

  // ponytail: office users see every task; add a "mine" filter if the list gets long.
  const where: Prisma.TaskWhereInput = {
    ...(office ? {} : { assignedToUserId: me.id }),
    ...(view === "done" ? { status: "DONE" } : { status: "OPEN" }),
    ...(view === "reminders" && { remindAt: { lte: now } }),
  };
  const tasks = await db.task.findMany({
    where,
    orderBy: view === "done" ? { completedAt: "desc" } : [{ dueAt: { sort: "asc", nulls: "last" } }, { createdAt: "desc" }],
    take: 100,
    include: {
      assignedTo: { select: { name: true } },
      createdBy: { select: { name: true } },
      challan: { select: { id: true, no: true } },
    },
  });

  return (
    <>
      <PageHeader
        title={office ? "Tasks" : "My tasks"}
        action={office && <Link href="/tasks/new" className="btn-primary">+ New</Link>}
      />
      <PushToggle />
      <div className="mb-3 grid grid-cols-3 gap-2">
        {(Object.keys(VIEWS) as View[]).map((v) => (
          <Link key={v} href={`/tasks?view=${v}`} className={`${v === view ? "btn-primary" : "btn-light"} text-sm`}>
            {VIEWS[v]}
          </Link>
        ))}
      </div>

      {tasks.length === 0 && <Empty>Nothing here</Empty>}
      <ul className="space-y-2">
        {tasks.map((t) => {
          const overdue = t.status === "OPEN" && t.dueAt && t.dueAt < now;
          return (
            <li key={t.id} className="card">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className={`font-semibold ${t.status === "DONE" ? "text-slate-500 line-through" : ""}`}>{t.title}</p>
                  {t.description && <p className="whitespace-pre-line text-sm text-slate-700">{t.description}</p>}
                  <p className="mt-1 text-xs text-slate-500">
                    {office && <>For {t.assignedTo.name} · </>}
                    by {t.createdBy.name}
                    {t.challan && (
                      <>
                        {" · "}
                        <Link href={`/challans/${t.challan.id}`} className="text-brand">{challanNo(t.challan.no)}</Link>
                      </>
                    )}
                  </p>
                  {t.dueAt && (
                    <p className={`text-xs ${overdue ? "font-semibold text-red-700" : "text-slate-500"}`}>
                      Due {fmtDateTime(t.dueAt)}
                    </p>
                  )}
                  {t.remindAt && t.status === "OPEN" && (
                    <p className="text-xs text-slate-500">🔔 {fmtDateTime(t.remindAt)}</p>
                  )}
                  {t.completedAt && <p className="text-xs text-slate-500">Done {fmtDateTime(t.completedAt)}</p>}
                </div>
                {t.status === "OPEN" && (
                  <form action={markDone.bind(null, t.id)}>
                    <button className="btn-light shrink-0">✓ Done</button>
                  </form>
                )}
              </div>
            </li>
          );
        })}
      </ul>
    </>
  );
}
