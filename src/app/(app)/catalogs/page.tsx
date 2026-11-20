import { db } from "@/lib/db";
import { requirePerm } from "@/lib/auth";
import { can } from "@/lib/permissions";
import { CatalogsClient } from "./CatalogsClient";

export default async function CatalogsPage() {
  const me = await requirePerm("catalogs");
  const catalogs = await db.catalog.findMany({
    where: { deletedAt: null },
    orderBy: { updatedAt: "desc" },
    include: { sizes: true, designs: { orderBy: { colourName: "asc" }, select: { id: true, colourName: true } } },
  });

  return (
    <CatalogsClient
      canWrite={can(me.perms, "catalogs", "write")}
      canModify={can(me.perms, "catalogs", "modify")}
      canDelete={can(me.perms, "catalogs", "delete")}
      rows={catalogs.map((c) => ({
        id: c.id,
        name: c.name,
        volume: c.volume,
        code: c.code,
        fabric: c.fabric,
        type: c.type,
        piecesPerDesign: c.piecesPerDesign,
        designCount: c.designCount,
        totalPieces: c.totalPieces,
        designs: c.designs,
        sizes: Object.fromEntries(c.sizes.map((s) => [s.size, s.qty])),
        photo: c.photoUrl ? { url: c.photoUrl, publicId: c.photoPublicId ?? "" } : null,
        updatedAt: c.updatedAt,
      }))}
    />
  );
}
