import { db } from "@/lib/db";
import { OFFICE, requireUser } from "@/lib/auth";
import { PageHeader } from "@/components/ui";
import { ChallanForm } from "../ChallanForm";

export default async function NewChallanPage() {
  await requireUser(...OFFICE);
  const [jobbers, catalogs] = await Promise.all([
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
  ]);

  return (
    <>
      <PageHeader title="New challan" back="/challans" />
      <ChallanForm jobbers={jobbers} catalogs={catalogs} />
    </>
  );
}
