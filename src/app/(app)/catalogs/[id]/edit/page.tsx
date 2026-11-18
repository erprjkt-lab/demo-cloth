import { notFound } from "next/navigation";
import { db } from "@/lib/db";
import { OFFICE, requireUser } from "@/lib/auth";
import { SIZES } from "@/lib/validation";
import { PageHeader } from "@/components/ui";
import { CatalogForm, type CatalogInput } from "../../CatalogForm";

export default async function EditCatalogPage({ params }: { params: Promise<{ id: string }> }) {
  await requireUser(...OFFICE);
  const { id } = await params;
  const c = await db.catalog.findFirst({
    where: { id, deletedAt: null },
    include: { sizes: true, designs: { orderBy: { colourName: "asc" } } },
  });
  if (!c) notFound();

  const initial: CatalogInput = {
    id: c.id,
    name: c.name,
    volume: c.volume ?? "",
    code: c.code ?? "",
    fabric: c.fabric ?? "",
    type: c.type,
    piecesPerDesign: String(c.piecesPerDesign),
    designs: c.designs.map((d) => ({ id: d.id, colourName: d.colourName })),
    sizes: Object.fromEntries(
      SIZES.map((s) => [s, String(c.sizes.find((x) => x.size === s)?.qty ?? "")]),
    ) as CatalogInput["sizes"],
    photo: c.photoUrl ? { url: c.photoUrl, publicId: c.photoPublicId ?? "" } : null,
  };

  return (
    <>
      <PageHeader title={`Edit ${c.name}`} back={`/catalogs/${id}`} />
      <CatalogForm initial={initial} />
    </>
  );
}
