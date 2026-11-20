"use server";

import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { requirePerm } from "@/lib/auth";
import { firstError, jobberSchema } from "@/lib/validation";

// Jobbers can be created, edited and viewed; there is deliberately no delete.
export async function saveJobber(id: string | null, input: unknown): Promise<{ error?: string }> {
  const me = await requirePerm("jobbers", id ? "modify" : "write");
  if (me.role === "JOBBER") return { error: "Not allowed" };
  const parsed = jobberSchema.safeParse(input);
  if (!parsed.success) return { error: firstError(parsed.error) };

  if (id) await db.jobber.update({ where: { id, deletedAt: null }, data: parsed.data });
  else await db.jobber.create({ data: parsed.data });
  revalidatePath("/jobbers");
  return {};
}
