"use server";

import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { OFFICE, requireUser } from "@/lib/auth";
import { catalogSchema, firstError, SIZES } from "@/lib/validation";
import type { FormState } from "@/components/ActionForm";

export async function saveCatalog(id: string | null, input: unknown): Promise<FormState> {
  await requireUser(...OFFICE);
  const parsed = catalogSchema.safeParse(input);
  if (!parsed.success) return { error: firstError(parsed.error) };

  const { designs, sizes, ...rest } = parsed.data;
  // Totals are always derived here, never taken from the client.
  const data = { ...rest, designCount: designs.length, totalPieces: designs.length * rest.piecesPerDesign };
  const sizeRows = SIZES.map((size) => ({ size, qty: sizes[size] ?? 0 }));

  if (!id) {
    const created = await db.catalog.create({
      data: {
        ...data,
        sizes: { create: sizeRows },
        designs: { create: designs.map((d) => ({ colourName: d.colourName })) },
      },
    });
    redirect(`/catalogs/${created.id}`);
  }

  const keep = designs.flatMap((d) => (d.id ? [d.id] : []));
  const used = await db.design.findFirst({ where: { catalogId: id, id: { notIn: keep }, lines: { some: {} } } });
  if (used) return { error: `Design "${used.colourName}" is used on challans and can't be removed` };

  // ponytail: a replaced photo stays in Cloudinary; add a cleanup job if storage gets tight.
  await db.$transaction([
    db.catalog.update({ where: { id, deletedAt: null }, data }),
    db.design.deleteMany({ where: { catalogId: id, id: { notIn: keep } } }),
    ...designs
      .filter((d) => d.id)
      .map((d) => db.design.update({ where: { id: d.id, catalogId: id }, data: { colourName: d.colourName } })),
    db.design.createMany({ data: designs.filter((d) => !d.id).map((d) => ({ catalogId: id, colourName: d.colourName })) }),
    ...sizeRows.map((s) =>
      db.catalogSize.upsert({
        where: { catalogId_size: { catalogId: id, size: s.size } },
        create: { catalogId: id, ...s },
        update: { qty: s.qty },
      }),
    ),
  ]);
  redirect(`/catalogs/${id}`);
}

export async function deleteCatalog(id: string) {
  await requireUser("ADMIN");
  await db.catalog.update({ where: { id }, data: { deletedAt: new Date() } });
  redirect("/catalogs");
}
