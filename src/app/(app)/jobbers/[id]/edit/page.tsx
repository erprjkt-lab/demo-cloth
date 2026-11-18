import { notFound } from "next/navigation";
import { db } from "@/lib/db";
import { OFFICE, requireUser } from "@/lib/auth";
import { PageHeader } from "@/components/ui";
import { JobberForm } from "../../JobberForm";

export default async function EditJobberPage({ params }: { params: Promise<{ id: string }> }) {
  await requireUser(...OFFICE);
  const { id } = await params;
  const jobber = await db.jobber.findFirst({ where: { id, deletedAt: null } });
  if (!jobber) notFound();
  return (
    <>
      <PageHeader title={`Edit ${jobber.name}`} back={`/jobbers/${id}`} />
      <JobberForm jobber={jobber} />
    </>
  );
}
