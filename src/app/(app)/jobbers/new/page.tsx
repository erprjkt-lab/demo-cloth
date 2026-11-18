import { OFFICE, requireUser } from "@/lib/auth";
import { PageHeader } from "@/components/ui";
import { JobberForm } from "../JobberForm";

export default async function NewJobberPage() {
  await requireUser(...OFFICE);
  return (
    <>
      <PageHeader title="New jobber" back="/jobbers" />
      <JobberForm />
    </>
  );
}
