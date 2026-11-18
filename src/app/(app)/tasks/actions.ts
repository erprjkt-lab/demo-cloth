"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { OFFICE, requireUser } from "@/lib/auth";
import { fromLocalInput } from "@/lib/format";
import { pushToUser } from "@/lib/push";
import { firstError, taskSchema } from "@/lib/validation";
import type { FormState } from "@/components/ActionForm";

export async function createTask(_: FormState, fd: FormData): Promise<FormState> {
  const me = await requireUser(...OFFICE);
  const parsed = taskSchema.safeParse(Object.fromEntries(fd));
  if (!parsed.success) return { error: firstError(parsed.error) };
  const { challanNo, dueAt, remindAt, ...t } = parsed.data;

  const assignee = await db.user.findFirst({ where: { id: t.assignedToUserId, isActive: true } });
  if (!assignee) return { error: "That user is not active" };

  let challanId: string | null = null;
  if (challanNo) {
    const no = Number(challanNo.replace(/\D/g, ""));
    const challan = await db.challan.findFirst({ where: { no, deletedAt: null }, select: { id: true } });
    if (!challan) return { error: `No challan ${challanNo}` };
    challanId = challan.id;
  }

  await db.task.create({
    data: {
      ...t,
      challanId,
      createdById: me.id,
      dueAt: dueAt ? fromLocalInput(dueAt) : null,
      remindAt: remindAt ? fromLocalInput(remindAt) : null,
    },
  });
  if (assignee.id !== me.id) await pushToUser(assignee.id, { title: `New task from ${me.name}`, body: t.title, url: "/tasks" });
  redirect("/tasks");
}

/** The assignee or any office user can close a task. */
export async function markDone(taskId: string) {
  const me = await requireUser();
  const where = me.role === "JOBBER" ? { id: taskId, assignedToUserId: me.id } : { id: taskId };
  await db.task.updateMany({ where: { ...where, status: "OPEN" }, data: { status: "DONE", completedAt: new Date() } });
  revalidatePath("/tasks");
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
