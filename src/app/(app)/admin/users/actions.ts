"use server";

import bcrypt from "bcryptjs";
import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { requirePerm } from "@/lib/auth";
import { firstError, passwordSchema, userSchema, userUpdateSchema } from "@/lib/validation";

type Result = { error?: string };

export async function createUser(input: unknown): Promise<Result> {
  await requirePerm("users", "write");
  const parsed = userSchema.safeParse(input);
  if (!parsed.success) return { error: firstError(parsed.error) };
  const { password, jobberId, ...data } = parsed.data;

  if (await db.user.findUnique({ where: { username: data.username } })) return { error: "That user ID is taken" };
  await db.user.create({
    data: { ...data, jobberId: data.role === "JOBBER" ? jobberId : null, passwordHash: await bcrypt.hash(password, 10) },
  });
  revalidatePath("/admin/users");
  return {};
}

export async function updateUser(id: string, input: unknown): Promise<Result> {
  const me = await requirePerm("users", "modify");
  const parsed = userUpdateSchema.safeParse(input);
  if (!parsed.success) return { error: firstError(parsed.error) };
  if (id === me.id && parsed.data.role !== me.role) return { error: "You can't change your own role" };
  await db.user.update({
    where: { id },
    data: { ...parsed.data, jobberId: parsed.data.role === "JOBBER" ? parsed.data.jobberId : null },
  });
  revalidatePath("/admin/users");
  return {};
}

export async function resetPassword(id: string, password: string): Promise<Result> {
  await requirePerm("users", "modify");
  const parsed = passwordSchema.safeParse(password);
  if (!parsed.success) return { error: firstError(parsed.error) };
  await db.user.update({
    where: { id },
    data: { passwordHash: await bcrypt.hash(parsed.data, 10), failedLogins: 0, lockedUntil: null },
  });
  return {};
}

export async function setActive(id: string, isActive: boolean): Promise<Result> {
  const me = await requirePerm("users", "modify");
  if (id === me.id) return { error: "You can't deactivate yourself" };
  await db.user.update({ where: { id }, data: { isActive } });
  revalidatePath("/admin/users");
  return {};
}
