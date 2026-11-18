import { db } from "@/lib/db";
import { requireUser } from "@/lib/auth";
import { ActionForm } from "@/components/ActionForm";
import { Field, PageHeader } from "@/components/ui";
import { createUser, resetPassword, setActive } from "./actions";

export default async function UsersPage() {
  const me = await requireUser("ADMIN");
  const [users, jobbers] = await Promise.all([
    db.user.findMany({ orderBy: { createdAt: "asc" }, include: { jobber: { select: { name: true } } } }),
    db.jobber.findMany({ where: { deletedAt: null }, orderBy: { name: "asc" }, select: { id: true, name: true } }),
  ]);

  return (
    <>
      <PageHeader title="Users" back="/" />

      <details className="card mb-4">
        <summary className="cursor-pointer font-semibold">+ New user</summary>
        <div className="mt-4">
          <ActionForm action={createUser} submit="Create user">
            <Field label="User ID" name="username" autoCapitalize="none" required />
            <Field label="Name" name="name" required />
            <label className="block">
              <span className="label">Role</span>
              <select name="role" className="input" defaultValue="STAFF">
                <option value="STAFF">Staff (office)</option>
                <option value="JOBBER">Jobber (own challans only)</option>
                <option value="ADMIN">Admin</option>
              </select>
            </label>
            <label className="block">
              <span className="label">Jobber (only for Jobber role)</span>
              <select name="jobberId" className="input" defaultValue="">
                <option value="">—</option>
                {jobbers.map((j) => (
                  <option key={j.id} value={j.id}>
                    {j.name}
                  </option>
                ))}
              </select>
            </label>
            <Field label="Password" name="password" type="text" minLength={8} autoComplete="new-password" required />
          </ActionForm>
        </div>
      </details>

      <ul className="space-y-3">
        {users.map((u) => (
          <li key={u.id} className={`card ${u.isActive ? "" : "opacity-60"}`}>
            <div className="flex items-start justify-between gap-2">
              <div>
                <p className="font-semibold">
                  {u.name} <span className="text-sm font-normal text-slate-500">@{u.username}</span>
                </p>
                <p className="text-sm text-slate-600">
                  {u.role}
                  {u.jobber && ` · ${u.jobber.name}`}
                  {!u.isActive && " · deactivated"}
                </p>
              </div>
              {u.id !== me.id && (
                <form action={setActive.bind(null, u.id, !u.isActive)}>
                  <button className={u.isActive ? "btn-danger" : "btn-light"}>
                    {u.isActive ? "Deactivate" : "Activate"}
                  </button>
                </form>
              )}
            </div>
            <details className="mt-2">
              <summary className="cursor-pointer text-sm text-brand">Reset password</summary>
              <ActionForm action={resetPassword.bind(null, u.id)} submit="Set password" className="mt-2 space-y-2">
                <Field label="New password" name="password" type="text" minLength={8} autoComplete="new-password" required />
              </ActionForm>
            </details>
          </li>
        ))}
      </ul>
    </>
  );
}
