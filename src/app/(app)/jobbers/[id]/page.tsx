import { notFound } from "next/navigation";
import { db } from "@/lib/db";
import { requirePerm } from "@/lib/auth";
import { can } from "@/lib/permissions";
import { challanRowInclude, toChallanRow } from "@/lib/rows";
import { sumMeters } from "@/lib/validation";
import { JobberDetail } from "./JobberDetail";

export default async function JobberPage({ params }: { params: Promise<{ id: string }> }) {
  const me = await requirePerm("jobbers");
  const { id } = await params;
  const jobber = await db.jobber.findFirst({
    where: { id, deletedAt: null },
    include: {
      challans: { where: { deletedAt: null }, orderBy: { no: "desc" }, include: challanRowInclude },
      jobs: {
        where: { deletedAt: null },
        orderBy: { no: "desc" },
        include: {
          catalog: { select: { name: true, volume: true } },
          qcs: { orderBy: { createdAt: "desc" }, take: 1, select: { receivedPieces: true, rejectedPieces: true, missingPieces: true } },
        },
      },
    },
  });
  if (!jobber) notFound();

  const challans = jobber.challans.map(toChallanRow);
  // Meters and challan count per catalogue, from the challans already loaded.
  const history = new Map<string, { id: string; catalog: string; challans: number; meters: string[] }>();
  for (const c of challans) {
    const h = history.get(c.catalogId) ?? { id: c.catalogId, catalog: c.catalog, challans: 0, meters: [] };
    h.challans++;
    h.meters.push(c.meters);
    history.set(c.catalogId, h);
  }

  const { id: jobberId, name, ownerName, gstNo, mobile1, mobile2, address, jobs } = jobber;
  return (
    <JobberDetail
      jobber={{ id: jobberId, name, ownerName, gstNo, mobile1, mobile2, address }}
      canModify={can(me.perms, "jobbers", "modify")}
      challans={challans}
      catalogs={[...history.values()].map((h) => ({ ...h, meters: sumMeters(h.meters) }))}
      jobs={jobs.map((j) => ({
        id: j.id,
        no: j.no,
        title: j.title,
        catalog: j.catalog ? `${j.catalog.name} ${j.catalog.volume ?? ""}`.trim() : null,
        pieces: j.pieces,
        dueDate: j.dueDate?.toISOString().slice(0, 10) ?? null,
        status: j.status,
        received: j.qcs[0]?.receivedPieces ?? null,
        rejected: j.qcs[0]?.rejectedPieces ?? null,
        notReceived: j.qcs[0]?.missingPieces ?? null,
      }))}
    />
  );
}
