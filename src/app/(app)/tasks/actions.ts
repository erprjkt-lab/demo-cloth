"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { requirePerm, requireUser } from "@/lib/auth";
import { pushToUser } from "@/lib/push";
import { firstError, taskSchema } from "@/lib/validation";

type Result = { error?: string };

export async function createTask(input: unknown): Promise<Result> {
  const me = await requirePerm("tasks", "write");
  if (me.role === "JOBBER") return { error: "Not allowed" };
  const parsed = taskSchema.safeParse(input);
  if (!parsed.success) return { error: firstError(parsed.error) };
  const t = parsed.data;

  const assignee = await db.user.findFirst({ where: { id: t.assignedToUserId, isActive: true } });
  if (!assignee) return { error: "That user is not active" };
  if (t.challanId && !(await db.challan.findFirst({ where: { id: t.challanId, deletedAt: null } }))) {
    return { error: "Challan not found" };
  }

  await db.task.create({ data: { ...t, createdById: me.id } });
  if (assignee.id !== me.id) await pushToUser(assignee.id, { title: `New task from ${me.name}`, body: t.title, url: "/tasks" });
  revalidatePath("/tasks");
  return {};
}

/** The assignee, or an office user with modify access, can close a task. */
export async function markDone(taskId: string): Promise<Result> {
  const me = await requirePerm("tasks", "modify");
  const where = me.role === "JOBBER" ? { id: taskId, assignedToUserId: me.id } : { id: taskId };
  await db.task.updateMany({ where: { ...where, status: "OPEN" }, data: { status: "DONE", completedAt: new Date() } });
  revalidatePath("/tasks");
  return {};
}

const subSchema = z.object({
  endpoint: z.string().url().max(1000),
  keys: z.object({ p256dh: z.string().max(200), auth: z.string().max(100) }),
});

export async function savePushSubscription(input: unknown) {
  const me = await requireUser();
  const s = subSchema.parse(input);
  await db.pushSubscription.upsert({
    where: { endpoint: s.endpoint },
    create: { userId: me.id, endpoint: s.endpoint, ...s.keys },
    update: { userId: me.id, ...s.keys },
  });
}
