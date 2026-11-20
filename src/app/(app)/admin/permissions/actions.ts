"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { requirePerm } from "@/lib/auth";
import { ACTIONS, MODULES } from "@/lib/permissions";

type Result = { error?: string };

const permsSchema = z.record(z.string(), z.array(z.enum(ACTIONS)));

/** Saves one row per menu, so the user's access no longer follows the role defaults. */
export async function savePermissions(userId: string, input: unknown): Promise<Result> {
  await requirePerm("permissions", "modify");
  const parsed = permsSchema.safeParse(input);
  if (!parsed.success) return { error: "Invalid permissions" };
  const user = await db.user.findUnique({ where: { id: userId }, select: { role: true } });
  if (!user) return { error: "User not found" };
  if (user.role === "ADMIN") return { error: "Admins always have full access" };

  await db.$transaction(
    MODULES.map((m) => {
      const granted = (parsed.data[m.key] ?? []).filter((a) => (m.actions as readonly string[]).includes(a));
      const flags = Object.fromEntries(ACTIONS.map((a) => [a, granted.includes(a)])) as Record<(typeof ACTIONS)[number], boolean>;
      return db.userPermission.upsert({
        where: { userId_module: { userId, module: m.key } },
        create: { userId, module: m.key, ...flags },
        update: flags,
      });
    }),
  );
  revalidatePath("/admin/permissions");
  return {};
}

/** Back to the role's defaults. */
export async function resetPermissions(userId: string): Promise<Result> {
  await requirePerm("permissions", "modify");
  await db.userPermission.deleteMany({ where: { userId } });
  revalidatePath("/admin/permissions");
  return {};
}
