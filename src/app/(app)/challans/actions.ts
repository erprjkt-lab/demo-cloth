"use server";

import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { OFFICE, requireUser } from "@/lib/auth";
import { challanNo, today } from "@/lib/format";
import { challanSchema, firstError, sumMeters, transferSchema } from "@/lib/validation";
import type { FormState } from "@/components/ActionForm";

export async function createChallan(input: unknown): Promise<FormState> {
  const user = await requireUser(...OFFICE);
  const parsed = challanSchema.safeParse(input);
  if (!parsed.success) return { error: firstError(parsed.error) };
  const { date, lines, ...c } = parsed.data;

  const [jobber, catalog] = await Promise.all([
    db.jobber.findFirst({ where: { id: c.jobberId, deletedAt: null } }),
    db.catalog.findFirst({ where: { id: c.catalogId, deletedAt: null }, include: { designs: { select: { id: true } } } }),
  ]);
  if (!jobber) return { error: "Jobber not found" };
  if (!catalog) return { error: "Catalogue not found" };
  const designIds = new Set(catalog.designs.map((d) => d.id));
  if (!lines.every((l) => designIds.has(l.designId))) return { error: "A design does not belong to this catalogue" };

  // One nested create = one transaction. No totals are stored; they are always summed from lumps.
  const challan = await db.challan.create({
    data: {
      ...c,
      date: new Date(`${date}T00:00:00Z`),
      createdById: user.id,
      lines: {
        create: lines.map((l) => ({
          designId: l.designId,
          partType: l.partType,
          lumps: { create: l.lumps.map((meters, i) => ({ seq: i + 1, meters })) },
        })),
      },
    },
  });
  redirect(`/challans/${challan.id}`);
}

/**
 * FULL moves the whole challan to the new jobber. PARTIAL moves the selected lumps into a new
 * child challan (parentChallanId) for the new jobber; the original keeps the rest. Both log a Transfer.
 */
export async function transferChallan(id: string, input: unknown): Promise<FormState> {
  const user = await requireUser(...OFFICE);
  const parsed = transferSchema.safeParse(input);
  if (!parsed.success) return { error: firstError(parsed.error) };
  const { toJobberId, lumpIds, note } = parsed.data;
  let { type } = parsed.data;

  const challan = await db.challan.findFirst({
    where: { id, deletedAt: null },
    include: { lines: { include: { lumps: { select: { id: true, meters: true } } } } },
  });
  if (!challan) return { error: "Challan not found" };
  if (challan.jobberId === toJobberId) return { error: "Pick a different jobber" };
  if (!(await db.jobber.findFirst({ where: { id: toJobberId, deletedAt: null } }))) return { error: "Jobber not found" };

  const picked = new Set(lumpIds);
  const allLumps = challan.lines.flatMap((l) => l.lumps);
  if (type === "PARTIAL") {
    if (!picked.size) return { error: "Select the lumps to move" };
    if (![...picked].every((lid) => allLumps.some((x) => x.id === lid))) return { error: "A lump is not on this challan" };
    if (picked.size === allLumps.length) type = "FULL";
  }
  const log = { challanId: id, fromJobberId: challan.jobberId, toJobberId, createdById: user.id };

  if (type === "FULL") {
    await db.$transaction([
      db.challan.update({ where: { id }, data: { jobberId: toJobberId } }),
      db.transfer.create({ data: { ...log, type, note } }),
    ]);
    redirect(`/challans/${id}`);
  }

  const moving = challan.lines
    .map((line) => ({ line, lumps: line.lumps.filter((x) => picked.has(x.id)) }))
    .filter((m) => m.lumps.length);
  const meters = sumMeters(moving.flatMap((m) => m.lumps.map((x) => x.meters.toString())));

  let childId: string;
  try {
    childId = await db.$transaction(async (tx) => {
      const child = await tx.challan.create({
        data: {
          date: new Date(`${today()}T00:00:00Z`),
          createdById: user.id,
          jobberId: toJobberId,
          catalogId: challan.catalogId,
          fabricDetail: challan.fabricDetail,
          remarks: challan.remarks,
          designPhotoUrl: challan.designPhotoUrl,
          designPhotoId: challan.designPhotoId,
          parentChallanId: id,
        },
      });
      for (const { line, lumps } of moving) {
        const newLine = await tx.challanLine.create({
          data: { challanId: child.id, designId: line.designId, partType: line.partType },
        });
        // lineId in the filter guards against a concurrent transfer of the same lumps.
        const moved = await tx.lump.updateMany({
          where: { id: { in: lumps.map((x) => x.id) }, lineId: line.id },
          data: { lineId: newLine.id },
        });
        if (moved.count !== lumps.length) throw new Error("stale");
        if (lumps.length === line.lumps.length) await tx.challanLine.delete({ where: { id: line.id } });
      }
      const summary = `${picked.size} lumps (${meters} m) moved to ${challanNo(child.no)}`;
      await tx.transfer.create({ data: { ...log, type: "PARTIAL", note: [summary, note].filter(Boolean).join(" · ") } });
      return child.id;
    });
  } catch {
    return { error: "This challan changed while you were transferring. Reload and try again." };
  }
  redirect(`/challans/${childId}`);
}

export async function deleteChallan(id: string) {
  await requireUser("ADMIN");
  await db.challan.update({ where: { id }, data: { deletedAt: new Date() } });
  redirect("/challans");
}
