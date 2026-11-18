import Link from "next/link";
import { db } from "@/lib/db";
import { OFFICE, requireUser } from "@/lib/auth";
import { Empty, PageHeader, SearchBox } from "@/components/ui";

export default async function JobbersPage({ searchParams }: { searchParams: Promise<{ q?: string }> }) {
  await requireUser(...OFFICE);
  const { q } = await searchParams;
  const jobbers = await db.jobber.findMany({
    where: { deletedAt: null, ...(q && { name: { contains: q, mode: "insensitive" } }) },
    orderBy: { name: "asc" },
    include: { _count: { select: { challans: { where: { deletedAt: null } } } } },
  });

  return (
    <>
      <PageHeader title="Jobbers" action={<Link href="/jobbers/new" className="btn-primary">+ New</Link>} />
      <SearchBox q={q} placeholder="Search jobber" />
      {jobbers.length === 0 && <Empty>No jobbers yet</Empty>}
      <ul className="space-y-2">
        {jobbers.map((j) => (
          <li key={j.id}>
            <Link href={`/jobbers/${j.id}`} className="card flex items-center justify-between">
              <div>
                <p className="font-semibold">{j.name}</p>
                <p className="text-sm text-slate-600">
                  {[j.ownerName, j.mobile1].filter(Boolean).join(" · ")}
                </p>
              </div>
              <span className="text-sm text-slate-500">{j._count.challans} challans</span>
            </Link>
          </li>
        ))}
      </ul>
    </>
  );
}
