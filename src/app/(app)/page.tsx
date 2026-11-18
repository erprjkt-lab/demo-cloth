import Link from "next/link";
import { redirect } from "next/navigation";
import { requireUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { PageHeader } from "@/components/ui";

export default async function Dashboard() {
  const user = await requireUser();
  if (user.role === "JOBBER") redirect("/challans");

  const [challans, jobbers, catalogs, openTasks, dueReminders] = await Promise.all([
    db.challan.count({ where: { deletedAt: null } }),
    db.jobber.count({ where: { deletedAt: null } }),
    db.catalog.count({ where: { deletedAt: null } }),
    db.task.count({ where: { status: "OPEN" } }),
    db.task.count({ where: { status: "OPEN", remindAt: { lte: new Date() } } }),
  ]);

  const kpis = [
    { href: "/challans", label: "Challans", value: challans },
    { href: "/jobbers", label: "Jobbers", value: jobbers },
    { href: "/catalogs", label: "Catalogues", value: catalogs },
    { href: "/tasks", label: "Open tasks", value: openTasks },
    { href: "/tasks?view=reminders", label: "Due reminders", value: dueReminders, alert: dueReminders > 0 },
  ];
  const actions = [
    { href: "/catalogs/new", label: "New catalogue" },
    { href: "/jobbers/new", label: "New jobber" },
    { href: "/tasks/new", label: "New task" },
    { href: "/transfers", label: "Job transfer" },
  ];

  return (
    <>
      <PageHeader
        title="Dashboard"
        subtitle={`Welcome back, ${user.name}`}
        action={<Link href="/challans/new" className="btn-primary">+ New challan</Link>}
      />

      <div className="mb-4 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
        {kpis.map((k) => (
          <Link key={k.href} href={k.href} className="card transition hover:border-brand/40 hover:shadow-md">
            <p className="text-[13px] text-slate-500">{k.label}</p>
            <p className={`font-display text-2xl font-bold ${k.alert ? "text-red-600" : "text-slate-900"}`}>{k.value}</p>
          </Link>
        ))}
      </div>

      <div className="card">
        <p className="mb-2 font-display font-semibold">Quick actions</p>
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
          {actions.map((a) => (
            <Link key={a.href} href={a.href} className="btn-light">
              {a.label}
            </Link>
          ))}
        </div>
      </div>
    </>
  );
}
