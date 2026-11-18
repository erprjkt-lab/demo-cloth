"use server";

import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { OFFICE, requireUser } from "@/lib/auth";
import { firstError, jobberSchema } from "@/lib/validation";
import type { FormState } from "@/components/ActionForm";

export async function saveJobber(id: string | null, _: FormState, fd: FormData): Promise<FormState> {
  await requireUser(...OFFICE);
  const parsed = jobberSchema.safeParse(Object.fromEntries(fd));
  if (!parsed.success) return { error: firstError(parsed.error) };

  const jobber = id
    ? await db.jobber.update({ where: { id, deletedAt: null }, data: parsed.data })
    : await db.jobber.create({ data: parsed.data });
  redirect(`/jobbers/${jobber.id}`);
}

export async function deleteJobber(id: string) {
  await requireUser("ADMIN");
  await db.jobber.update({ where: { id }, data: { deletedAt: new Date() } });
  redirect("/jobbers");
}
