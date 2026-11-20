import { notFound } from "next/navigation";
import { db } from "@/lib/db";
import { requirePerm } from "@/lib/auth";
import { can } from "@/lib/permissions";
import { challanRowInclude, toChallanRow } from "@/lib/rows";
import { getMasters } from "@/lib/masters";
import { sumMeters } from "@/lib/validation";
import { CatalogDetail } from "./CatalogDetail";

export default async function CatalogPage({ params }: { params: Promise<{ id: string }> }) {
  const me = await requirePerm("catalogs");
  const { id } = await params;
  const [c, types, allParts] = await Promise.all([
    db.catalog.findFirst({
      where: { id, deletedAt: null },
      include: {
        type: { select: { name: true } },
        sizes: true,
        designs: { orderBy: { colourName: "asc" }, select: { id: true, colourName: true } },
        challans: { where: { deletedAt: null }, orderBy: { no: "desc" }, include: challanRowInclude },
      },
    }),
    getMasters("CATALOG_TYPE"),
    getMasters("PART"),
  ]);
  if (!c) notFound();

  // Who holds what: one row per design × jobber, meters per part (keyed by part id).
  const holdings = new Map<string, { key: string; design: string; jobber: string; meters: Record<string, string[]> }>();
  const byJobber = new Map<string, string[]>();
  for (const ch of c.challans) {
    for (const l of ch.lines) {
      const design = c.designs.find((d) => d.id === l.designId)?.colourName ?? "?";
      const key = `${l.designId}:${ch.jobberId}`;
      const row = holdings.get(key) ?? { key, design, jobber: ch.jobber.name, meters: {} };
      const meters = l.lumps.map((x) => x.meters.toString());
      (row.meters[l.partId] ??= []).push(...meters);
      holdings.set(key, row);
      byJobber.set(ch.jobber.name, [...(byJobber.get(ch.jobber.name) ?? []), ...meters]);
    }
  }
  // Columns: only parts with fabric out, in Masters order.
  const parts = allParts.filter((p) => [...holdings.values()].some((h) => h.meters[p.id]));

  return (
    <CatalogDetail
      canModify={can(me.perms, "catalogs", "modify")}
      catalog={{
        id: c.id,
        name: c.name,
        volume: c.volume,
        code: c.code,
        fabric: c.fabric,
        typeId: c.typeId,
        typeName: c.type.name,
        piecesPerDesign: c.piecesPerDesign,
        designCount: c.designCount,
        totalPieces: c.totalPieces,
        designs: c.designs,
        sizes: Object.fromEntries(c.sizes.map((s) => [s.size, s.qty])),
        photo: c.photoUrl ? { url: c.photoUrl, publicId: c.photoPublicId ?? "" } : null,
      }}
      types={types}
      parts={parts.map((p) => ({ id: p.id, name: p.name }))}
      holdings={[...holdings.values()]
        .sort((a, b) => a.design.localeCompare(b.design) || a.jobber.localeCompare(b.jobber))
        .map((h) => ({
          key: h.key,
          design: h.design,
          jobber: h.jobber,
          ...Object.fromEntries(parts.map((p) => [p.id, h.meters[p.id] ? sumMeters(h.meters[p.id]) : null])),
          total: sumMeters(Object.values(h.meters).flat()),
        }))}
      jobbers={[...byJobber].map(([jobber, m]) => ({ jobber, meters: sumMeters(m) }))}
      challans={c.challans.map(toChallanRow)}
    />
  );
}
