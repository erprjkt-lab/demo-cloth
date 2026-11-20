import { notFound } from "next/navigation";
import { db } from "@/lib/db";
import { jobberScope, requirePerm } from "@/lib/auth";
import { challanNo, fmtDate, fmtDateTime } from "@/lib/format";
import { jobNo } from "@/lib/jobs";
import { can } from "@/lib/permissions";
import { sumMeters } from "@/lib/validation";
import { ChallanDetail } from "./ChallanDetail";

export default async function ChallanPage({ params }: { params: Promise<{ id: string }> }) {
  const me = await requirePerm("challans");
  const { id } = await params;
  // Ownership is part of the query: another jobber's challan is simply not found.
  const c = await db.challan.findFirst({
    where: { id, deletedAt: null, ...jobberScope(me) },
    include: {
      jobber: { select: { name: true } },
      catalog: { select: { name: true, volume: true } },
      createdBy: { select: { name: true } },
      jobWork: { select: { no: true, title: true } },
      lines: { include: { design: true, part: { select: { name: true, sort: true } }, lumps: { orderBy: { seq: "asc" } } } },
      parent: { select: { id: true, no: true } },
      children: { where: { deletedAt: null }, select: { id: true, no: true } },
      transfers: {
        orderBy: { createdAt: "desc" },
        include: { fromJobber: { select: { name: true } }, toJobber: { select: { name: true } }, createdBy: { select: { name: true } } },
      },
    },
  });
  if (!c) notFound();

  const lines = [...c.lines]
    .sort((a, b) => a.design.colourName.localeCompare(b.design.colourName) || a.part.sort - b.part.sort)
    .map((l) => {
      const meters = l.lumps.map((x) => x.meters.toString());
      return {
        id: l.id,
        design: l.design.colourName,
        part: l.part.name,
        lumps: l.lumps.map((x) => ({ seq: x.seq, meters: x.meters.toString() })),
        total: sumMeters(meters),
      };
    });
  const office = me.role !== "JOBBER";

  return (
    <ChallanDetail
      challan={{
        id: c.id,
        no: challanNo(c.no),
        date: fmtDate(c.date),
        jobber: c.jobber.name,
        catalog: `${c.catalog.name} ${c.catalog.volume ?? ""}`.trim(),
        job: c.jobWork ? `${jobNo(c.jobWork.no)} · ${c.jobWork.title}` : null,
        fabricDetail: c.fabricDetail,
        remarks: c.remarks,
        createdBy: c.createdBy.name,
        photoUrl: c.designPhotoUrl,
        parent: c.parent && { id: c.parent.id, no: challanNo(c.parent.no) },
        children: c.children.map((ch) => ({ id: ch.id, no: challanNo(ch.no) })),
        total: sumMeters(lines.flatMap((l) => l.lumps.map((x) => x.meters))),
      }}
      lines={lines}
      transfers={c.transfers.map((t) => ({
        id: t.id,
        at: fmtDateTime(t.createdAt),
        from: t.fromJobber.name,
        to: t.toJobber.name,
        type: t.type === "FULL" ? "Full" : "Custom",
        note: t.note,
        by: t.createdBy.name,
      }))}
      canTransfer={office && can(me.perms, "transfers", "write")}
      canDelete={can(me.perms, "challans", "delete")}
    />
  );
}
