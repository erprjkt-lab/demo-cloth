import { OFFICE, requireUser } from "@/lib/auth";
import { PageHeader } from "@/components/ui";
import { CatalogForm } from "../CatalogForm";

export default async function NewCatalogPage() {
  await requireUser(...OFFICE);
  return (
    <>
      <PageHeader title="New catalogue" back="/catalogs" />
      <CatalogForm />
    </>
  );
}
