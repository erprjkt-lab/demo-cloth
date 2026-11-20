import "server-only";
import type { MasterKind } from "@prisma/client";
import { db } from "./db";

export type MasterOption = { id: string; name: string; isActive: boolean };

/** A master list (parts, catalogue types) in display order, hidden items included for old records. */
export const getMasters = (kind: MasterKind): Promise<MasterOption[]> =>
  db.masterItem.findMany({ where: { kind }, orderBy: [{ sort: "asc" }, { name: "asc" }], select: { id: true, name: true, isActive: true } });

/** True when every id is an active item of this list, so a Server Action can't be fed a hidden or foreign id. */
export async function activeMasters(kind: MasterKind, ids: string[]) {
  const unique = [...new Set(ids)];
  return (await db.masterItem.count({ where: { kind, isActive: true, id: { in: unique } } })) === unique.length;
}
