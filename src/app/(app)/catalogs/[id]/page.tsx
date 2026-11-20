import { notFound } from "next/navigation";
import { db } from "@/lib/db";
import { requirePerm } from "@/lib/auth";
import { can } from "@/lib/permissions";
import { challanRowInclude, toChallanRow } from "@/lib/rows";
import { PARTS, sumMeters } from "@/lib/validation";
import { CatalogDetail } from "./CatalogDetail";

type Part = (typeof PARTS)[number];

export default async function CatalogPage({ params }: { params: Promise<{ id: string }> }) {
  const me = await requirePerm("catalogs");
  const { id } = await params;
  const c = await db.catalog.findFirst({
    where: { id, deletedAt: null },
    include: {
      sizes: true,
      designs: { orderBy: { colourName: "asc" }, select: { id: true, colourName: true } },
      challans: { where: { deletedAt: null }, orderBy: { no: "desc" }, include: challanRowInclude },
    },
  });
  if (!c) notFound();

  // Who holds what: one row per design × jobber, meters per part.
  const holdings = new Map<string, { key: string; design: string; jobber: string } & Record<Part, string[]>>();
  const byJobber = new Map<string, string[]>();
  for (const ch of c.challans) {
    for (const l of ch.lines) {
      const design = c.designs.find((d) => d.id === l.designId)?.colourName ?? "?";
      const key = `${l.designId}:${ch.jobberId}`;
      const row = holdings.get(key) ?? { key, design, jobber: ch.jobber.name, TOP: [], PANT: [], DUPATTA: [] };
      const meters = l.lumps.map((x) => x.meters.toString());
      row[l.partType].push(...meters);
      holdings.set(key, row);
      byJobber.set(ch.jobber.name, [...(byJobber.get(ch.jobber.name) ?? []), ...meters]);
    }
  }
  const parts = PARTS.filter((p) => [...holdings.values()].some((h) => h[p].length));

  return (
    <CatalogDetail
      canModify={can(me.perms, "catalogs", "modify")}
      catalog={{
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
      }}
      parts={parts}
      holdings={[...holdings.values()]
        .sort((a, b) => a.design.localeCompare(b.design) || a.jobber.localeCompare(b.jobber))
        .map((h) => ({
          key: h.key,
          design: h.design,
          jobber: h.jobber,
          ...Object.fromEntries(parts.map((p) => [p, h[p].length ? sumMeters(h[p]) : null])),
          total: sumMeters(PARTS.flatMap((p) => h[p])),
        }))}
      jobbers={[...byJobber].map(([jobber, m]) => ({ jobber, meters: sumMeters(m) }))}
      challans={c.challans.map(toChallanRow)}
    />
  );
}
