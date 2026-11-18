"use server";

import bcrypt from "bcryptjs";
import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { requireUser } from "@/lib/auth";
import { firstError, passwordSchema, userSchema } from "@/lib/validation";
import type { FormState } from "@/components/ActionForm";

export async function createUser(_: FormState, fd: FormData): Promise<FormState> {
  await requireUser("ADMIN");
  const parsed = userSchema.safeParse(Object.fromEntries(fd));
  if (!parsed.success) return { error: firstError(parsed.error) };
  const { password, jobberId, ...data } = parsed.data;

  if (await db.user.findUnique({ where: { username: data.username } })) return { error: "That user ID is taken" };
  await db.user.create({
    data: { ...data, jobberId: data.role === "JOBBER" ? jobberId : null, passwordHash: await bcrypt.hash(password, 10) },
  });
  revalidatePath("/admin/users");
  return { ok: `User ${data.username} created` };
}

export async function resetPassword(userId: string, _: FormState, fd: FormData): Promise<FormState> {
  await requireUser("ADMIN");
  const parsed = passwordSchema.safeParse(fd.get("password"));
  if (!parsed.success) return { error: firstError(parsed.error) };
  await db.user.update({
    where: { id: userId },
    data: { passwordHash: await bcrypt.hash(parsed.data, 10), failedLogins: 0, lockedUntil: null },
  });
  return { ok: "Password reset" };
}

export async function setActive(userId: string, isActive: boolean) {
  const me = await requireUser("ADMIN");
  if (userId === me.id) return; // never lock yourself out
  await db.user.update({ where: { id: userId }, data: { isActive } });
  revalidatePath("/admin/users");
}
