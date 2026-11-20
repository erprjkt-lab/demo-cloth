"use server";

import type { MasterKind } from "@prisma/client";
import { revalidatePath } from "next/cache";
import { requirePerm } from "@/lib/auth";
import { db } from "@/lib/db";
import { firstError, masterSchema } from "@/lib/validation";

type Result = { error?: string };
const KINDS: MasterKind[] = ["PART", "CATALOG_TYPE"];

/** Add (id = null) or rename / reorder an item. Names are unique per list, ignoring case. */
export async function saveMaster(id: string | null, kind: MasterKind, input: unknown): Promise<Result> {
  await requirePerm("masters", id ? "modify" : "write");
  if (!KINDS.includes(kind)) return { error: "Unknown list" };
  const parsed = masterSchema.safeParse(input);
  if (!parsed.success) return { error: firstError(parsed.error) };
  const { name, sort } = parsed.data;

  const clash = await db.masterItem.findFirst({ where: { kind, name: { equals: name, mode: "insensitive" }, id: { not: id ?? "" } } });
  if (clash) return { error: `"${clash.name}" is already in this list` };

  if (id) await db.masterItem.update({ where: { id, kind }, data: { name, sort } });
  else await db.masterItem.create({ data: { kind, name, sort } });
  revalidatePath("/admin/masters");
  return {};
}

/** Hide (or show again) an item. Hidden items leave the pickers; records that use them keep them. */
export async function setMasterActive(id: string, isActive: boolean): Promise<Result> {
  await requirePerm("masters", "modify");
  const item = await db.masterItem.findUnique({ where: { id } });
  if (!item) return { error: "Not found" };
  if (!isActive && (await db.masterItem.count({ where: { kind: item.kind, isActive: true, id: { not: id } } })) === 0) {
    return { error: "Keep at least one item in this list" };
  }
  await db.masterItem.update({ where: { id }, data: { isActive } });
  revalidatePath("/admin/masters");
  return {};
}
