import { notFound } from "next/navigation";
import { db } from "@/lib/db";
import { requirePerm } from "@/lib/auth";
import { challanNo } from "@/lib/format";
import { PART_LABEL } from "@/lib/validation";
import { TransferForm } from "./TransferForm";

export default async function TransferPage({ params }: { params: Promise<{ id: string }> }) {
  const me = await requirePerm("transfers", "write");
  if (me.role === "JOBBER") notFound();
  const { id } = await params;
  const c = await db.challan.findFirst({
    where: { id, deletedAt: null },
    include: {
      jobber: { select: { name: true } },
      lines: { include: { design: true, lumps: { orderBy: { seq: "asc" } } } },
    },
  });
  if (!c) notFound();
  const jobbers = await db.jobber.findMany({
    where: { deletedAt: null, id: { not: c.jobberId } },
    orderBy: { name: "asc" },
    select: { id: true, name: true },
  });

  return (
    <TransferForm
      challan={{ id, no: challanNo(c.no), jobber: c.jobber.name }}
      jobbers={jobbers}
      lines={c.lines.map((l) => ({
        id: l.id,
        label: `${l.design.colourName} ${PART_LABEL[l.partType]}`,
        lumps: l.lumps.map((x) => ({ id: x.id, seq: x.seq, meters: x.meters.toString() })),
      }))}
    />
  );
}
