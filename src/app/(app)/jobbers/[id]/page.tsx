import Link from "next/link";
import { notFound } from "next/navigation";
import { db } from "@/lib/db";
import { OFFICE, requireUser } from "@/lib/auth";
import { Empty, PageHeader } from "@/components/ui";
import { ChallanCard, challanCardInclude, challanTotal } from "@/components/ChallanCard";
import { sumMeters } from "@/lib/validation";
import { deleteJobber } from "../actions";

export default async function JobberPage({ params }: { params: Promise<{ id: string }> }) {
  const user = await requireUser(...OFFICE);
  const { id } = await params;
  const jobber = await db.jobber.findFirst({
    where: { id, deletedAt: null },
    include: {
      challans: { where: { deletedAt: null }, orderBy: { no: "desc" }, include: challanCardInclude },
    },
  });
  if (!jobber) notFound();

  // Meters and challan count per catalogue, from the challans already loaded.
  const byCatalog = new Map<string, { id: string; name: string; count: number; totals: string[] }>();
  for (const c of jobber.challans) {
    const h = byCatalog.get(c.catalogId) ?? {
      id: c.catalogId,
      name: `${c.catalog.name} ${c.catalog.volume ?? ""}`,
      count: 0,
      totals: [],
    };
    h.count++;
    h.totals.push(challanTotal(c));
    byCatalog.set(c.catalogId, h);
  }
  const history = [...byCatalog.values()];

  return (
    <>
      <PageHeader
        title={jobber.name}
        back="/jobbers"
        action={<Link href={`/jobbers/${id}/edit`} className="btn-light">Edit</Link>}
      />
      <dl className="card mb-4 grid grid-cols-[auto_1fr] gap-x-4 gap-y-1 text-sm">
        {(
          [
            ["Owner", jobber.ownerName],
            ["GST no", jobber.gstNo],
            ["Mobile", [jobber.mobile1, jobber.mobile2].filter(Boolean).join(", ")],
            ["Address", jobber.address],
          ] as const
        ).map(([k, v]) => (
          <div key={k} className="contents">
            <dt className="text-slate-500">{k}</dt>
            <dd>
              {k === "Mobile" ? (
                <a href={`tel:${jobber.mobile1}`} className="text-brand">{v}</a>
              ) : (
                v || "—"
              )}
            </dd>
          </div>
        ))}
      </dl>

      {history.length > 0 && (
        <>
          <h2 className="mb-2 font-semibold">Catalogue history</h2>
          <div className="card mb-4 divide-y divide-slate-100 p-0">
            {history.map((h) => (
              <Link key={h.id} href={`/catalogs/${h.id}`} className="flex justify-between px-4 py-2.5 text-sm">
                <span>{h.name}</span>
                <span className="tabular-nums">
                  {h.count} challans · <b>{sumMeters(h.totals)} m</b>
                </span>
              </Link>
            ))}
          </div>
        </>
      )}

      <h2 className="mb-2 font-semibold">Challans ({jobber.challans.length})</h2>
      {jobber.challans.length === 0 && <Empty>No challans for this jobber</Empty>}
      <ul className="space-y-2">
        {jobber.challans.map((c) => (
          <li key={c.id}>
            <ChallanCard c={c} />
          </li>
        ))}
      </ul>

      {user.role === "ADMIN" && (
        <form action={deleteJobber.bind(null, id)} className="mt-8">
          <button className="btn-danger w-full">Delete jobber</button>
        </form>
      )}
    </>
  );
}
