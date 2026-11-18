import Link from "next/link";
import { notFound } from "next/navigation";
import { db } from "@/lib/db";
import { OFFICE, requireUser } from "@/lib/auth";
import { thumb } from "@/lib/format";
import { CATALOG_TYPE_LABEL, PART_LABEL, PARTS, SIZE_LABEL, SIZES, sumMeters } from "@/lib/validation";

type Part = (typeof PARTS)[number];
import { Empty, PageHeader } from "@/components/ui";
import { ChallanCard, challanCardInclude } from "@/components/ChallanCard";
import { deleteCatalog } from "../actions";

export default async function CatalogPage({ params }: { params: Promise<{ id: string }> }) {
  const user = await requireUser(...OFFICE);
  const { id } = await params;
  const c = await db.catalog.findFirst({
    where: { id, deletedAt: null },
    include: {
      sizes: true,
      designs: { orderBy: { colourName: "asc" } },
      challans: { where: { deletedAt: null }, orderBy: { no: "desc" }, include: challanCardInclude },
    },
  });
  if (!c) notFound();

  // Who holds what: design → jobber → part → lump meters.
  const holdings = new Map<string, Map<string, Partial<Record<Part, string[]>>>>();
  const byJobber = new Map<string, string[]>();
  for (const ch of c.challans) {
    for (const l of ch.lines) {
      const meters = l.lumps.map((x) => x.meters.toString());
      const jobbers = holdings.get(l.designId) ?? new Map();
      const parts = jobbers.get(ch.jobber.name) ?? {};
      (parts[l.partType] ??= []).push(...meters);
      jobbers.set(ch.jobber.name, parts);
      holdings.set(l.designId, jobbers);
      byJobber.set(ch.jobber.name, [...(byJobber.get(ch.jobber.name) ?? []), ...meters]);
    }
  }

  return (
    <>
      <PageHeader
        title={`${c.name} ${c.volume ?? ""}`}
        back="/catalogs"
        action={<Link href={`/catalogs/${id}/edit`} className="btn-light">Edit</Link>}
      />
      {c.photoUrl && (
        <a href={c.photoUrl} target="_blank" rel="noreferrer">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={thumb(c.photoUrl, 800)} alt={c.name} className="mb-4 max-h-80 w-full rounded-xl object-cover" />
        </a>
      )}

      <div className="card mb-4 space-y-1 text-sm">
        <p>
          <span className="text-slate-500">Type:</span> {CATALOG_TYPE_LABEL[c.type]}
          {c.code && <> · <span className="text-slate-500">Code:</span> {c.code}</>}
        </p>
        {c.fabric && <p><span className="text-slate-500">Fabric:</span> {c.fabric}</p>}
        <p className="text-base font-semibold">
          {c.designCount} designs × {c.piecesPerDesign.toLocaleString("en-IN")} = {c.totalPieces.toLocaleString("en-IN")} pcs
        </p>
        <div className="flex flex-wrap gap-1 pt-1">
          {c.designs.map((d) => (
            <span key={d.id} className="rounded-full bg-slate-100 px-2 py-0.5">{d.colourName}</span>
          ))}
        </div>
      </div>

      <div className="card mb-4">
        <p className="label">Size ratio</p>
        <div className="grid grid-cols-4 gap-2 text-center text-sm">
          {SIZES.map((s) => (
            <div key={s} className="rounded-lg bg-slate-50 py-1">
              <div className="text-xs text-slate-500">{SIZE_LABEL[s]}</div>
              <div className="font-semibold">{c.sizes.find((x) => x.size === s)?.qty ?? 0}</div>
            </div>
          ))}
        </div>
      </div>

      {byJobber.size > 0 && (
        <>
          <h2 className="mb-2 font-semibold">Jobbers holding this catalogue</h2>
          <div className="card mb-4 divide-y divide-slate-100 p-0 text-sm">
            {[...byJobber].map(([name, meters]) => (
              <div key={name} className="flex justify-between px-4 py-2.5">
                <span>{name}</span>
                <b className="tabular-nums">{sumMeters(meters)} m</b>
              </div>
            ))}
          </div>

          <h2 className="mb-2 font-semibold">By design and part</h2>
          {c.designs
            .filter((d) => holdings.has(d.id))
            .map((d) => {
              const rows = [...holdings.get(d.id)!];
              const parts = PARTS.filter((p) => rows.some(([, r]) => r[p]));
              return (
                <div key={d.id} className="card mb-3 overflow-x-auto p-0">
                  <table className="w-full text-sm">
                    <thead className="bg-slate-50 text-left">
                      <tr>
                        <th className="px-4 py-2">{d.colourName}</th>
                        {parts.map((p) => (
                          <th key={p} className="px-3 py-2 text-right">{PART_LABEL[p]}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {rows.map(([name, r]) => (
                        <tr key={name} className="border-t border-slate-100">
                          <td className="px-4 py-2">{name}</td>
                          {parts.map((p) => (
                            <td key={p} className="px-3 py-2 text-right tabular-nums">
                              {r[p] ? `${sumMeters(r[p])} m` : "—"}
                            </td>
                          ))}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              );
            })}
        </>
      )}

      <h2 className="mb-2 mt-4 font-semibold">Challans ({c.challans.length})</h2>
      {c.challans.length === 0 && <Empty>No challans for this catalogue</Empty>}
      <ul className="space-y-2">
        {c.challans.map((ch) => (
          <li key={ch.id}>
            <ChallanCard c={ch} />
          </li>
        ))}
      </ul>

      {user.role === "ADMIN" && (
        <form action={deleteCatalog.bind(null, id)} className="mt-8">
          <button className="btn-danger w-full">Delete catalogue</button>
        </form>
      )}
    </>
  );
}
