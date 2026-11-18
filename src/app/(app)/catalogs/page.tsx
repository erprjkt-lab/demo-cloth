import Link from "next/link";
import { db } from "@/lib/db";
import { OFFICE, requireUser } from "@/lib/auth";
import { thumb } from "@/lib/format";
import { CATALOG_TYPE_LABEL } from "@/lib/validation";
import { Empty, PageHeader, SearchBox } from "@/components/ui";

export default async function CatalogsPage({ searchParams }: { searchParams: Promise<{ q?: string }> }) {
  await requireUser(...OFFICE);
  const { q } = await searchParams;
  const like = { contains: q, mode: "insensitive" as const };
  const catalogs = await db.catalog.findMany({
    where: { deletedAt: null, ...(q && { OR: [{ name: like }, { volume: like }, { code: like }] }) },
    orderBy: { updatedAt: "desc" },
  });

  return (
    <>
      <PageHeader title="Catalogues" action={<Link href="/catalogs/new" className="btn-primary">+ New</Link>} />
      <SearchBox q={q} placeholder="Search name, volume or code" />
      {catalogs.length === 0 && <Empty>No catalogues yet</Empty>}
      <ul className="space-y-2">
        {catalogs.map((c) => (
          <li key={c.id}>
            <Link href={`/catalogs/${c.id}`} className="card flex items-center gap-3">
              {c.photoUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={thumb(c.photoUrl)} alt="" loading="lazy" className="h-16 w-16 rounded-lg object-cover" />
              ) : (
                <div className="h-16 w-16 rounded-lg bg-slate-200" />
              )}
              <div className="min-w-0">
                <p className="truncate font-semibold">
                  {c.name} {c.volume}
                </p>
                <p className="text-sm text-slate-600">
                  {CATALOG_TYPE_LABEL[c.type]} · {c.designCount} designs · {c.totalPieces.toLocaleString("en-IN")} pcs
                </p>
              </div>
            </Link>
          </li>
        ))}
      </ul>
    </>
  );
}
