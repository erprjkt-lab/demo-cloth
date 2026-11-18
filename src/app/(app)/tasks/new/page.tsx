import { db } from "@/lib/db";
import { OFFICE, requireUser } from "@/lib/auth";
import { ActionForm } from "@/components/ActionForm";
import { Field, PageHeader } from "@/components/ui";
import { createTask } from "../actions";

export default async function NewTaskPage() {
  await requireUser(...OFFICE);
  const users = await db.user.findMany({
    where: { isActive: true },
    orderBy: [{ role: "asc" }, { name: "asc" }],
    select: { id: true, name: true, role: true, jobber: { select: { name: true } } },
  });

  return (
    <>
      <PageHeader title="New task" back="/tasks" />
      <div className="card">
        <ActionForm action={createTask} submit="Assign task">
          <Field label="What needs to be done" name="title" placeholder="e.g. Make a sample of 2 pants" required />
          <label className="block">
            <span className="label">Details</span>
            <textarea name="description" className="input" rows={3} />
          </label>
          <label className="block">
            <span className="label">Assign to<span className="text-red-600"> *</span></span>
            <select name="assignedToUserId" className="input" required defaultValue="">
              <option value="">Select person</option>
              {users.map((u) => (
                <option key={u.id} value={u.id}>
                  {u.name}
                  {u.jobber ? ` (jobber: ${u.jobber.name})` : u.role === "JOBBER" ? " (jobber)" : ""}
                </option>
              ))}
            </select>
          </label>
          <Field label="Challan no (optional)" name="challanNo" placeholder="CH-0012" autoCapitalize="characters" />
          <div className="grid grid-cols-2 gap-3">
            <Field label="Due" name="dueAt" type="datetime-local" />
            <Field label="Remind at" name="remindAt" type="datetime-local" />
          </div>
        </ActionForm>
      </div>
    </>
  );
}
