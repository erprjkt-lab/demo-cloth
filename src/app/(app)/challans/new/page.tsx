import { db } from "@/lib/db";
import { requirePerm } from "@/lib/auth";
import { jobNo } from "@/lib/jobs";
import { getMasters } from "@/lib/masters";
import { ChallanForm } from "../ChallanForm";

export default async function NewChallanPage({ searchParams }: { searchParams: Promise<{ job?: string }> }) {
  const me = await requirePerm("challans", "write");
  if (me.role === "JOBBER") (await import("next/navigation")).notFound();
  const { job } = await searchParams;

  const [jobbers, catalogs, jobs, parts] = await Promise.all([
    db.jobber.findMany({ where: { deletedAt: null }, orderBy: { name: "asc" }, select: { id: true, name: true } }),
    db.catalog.findMany({
      where: { deletedAt: null },
      orderBy: { updatedAt: "desc" },
      select: {
        id: true,
        name: true,
        volume: true,
        fabric: true,
        designs: { orderBy: { colourName: "asc" }, select: { id: true, colourName: true } },
      },
    }),
    db.jobWork.findMany({
      where: { deletedAt: null, status: { not: "COMPLETED" } },
      orderBy: { no: "desc" },
      select: { id: true, no: true, title: true, jobberId: true, catalogId: true },
    }),
    getMasters("PART"),
  ]);

  return (
    <ChallanForm
      jobbers={jobbers}
      catalogs={catalogs}
      parts={parts}
      jobs={jobs.map((j) => ({ id: j.id, label: `${jobNo(j.no)} · ${j.title}`, jobberId: j.jobberId, catalogId: j.catalogId }))}
      initialJobId={job}
    />
  );
}
