import Link from "next/link";
import { notFound } from "next/navigation";
import { TransferRow, transferInclude } from "@/components/TransferRow";
import { db } from "@/lib/db";
import { challanScope, requireUser } from "@/lib/auth";
import { challanNo, fmtDate, thumb } from "@/lib/format";
import { PART_LABEL, PARTS } from "@/lib/validation";
import { PageHeader } from "@/components/ui";
import { challanTotal } from "@/components/ChallanCard";
import { deleteChallan } from "../actions";

export default async function ChallanPage({ params }: { params: Promise<{ id: string }> }) {
  const user = await requireUser();
  const { id } = await params;
  // Ownership is part of the query: another jobber's challan is simply not found.
  const c = await db.challan.findFirst({
    where: { id, deletedAt: null, ...challanScope(user) },
    include: {
      jobber: { select: { name: true } },
      catalog: { select: { name: true, volume: true } },
      createdBy: { select: { name: true } },
      lines: { include: { design: true, lumps: { orderBy: { seq: "asc" } } } },
      parent: { select: { id: true, no: true } },
      children: { where: { deletedAt: null }, select: { id: true, no: true } },
      transfers: { orderBy: { createdAt: "desc" }, include: transferInclude },
    },
  });
  if (!c) notFound();

  const lines = [...c.lines].sort(
    (a, b) =>
      a.design.colourName.localeCompare(b.design.colourName) || PARTS.indexOf(a.partType) - PARTS.indexOf(b.partType),
  );

  return (
    <>
      <PageHeader
        title={challanNo(c.no)}
        back="/challans"
        action={
          user.role !== "JOBBER" && (
            <Link href={`/challans/${id}/transfer`} className="btn-light">
              Transfer
            </Link>
          )
        }
      />

      <div className="card mb-4 space-y-1 text-sm">
        <p className="text-base font-semibold">{c.jobber.name}</p>
        <p>
          {c.catalog.name} {c.catalog.volume} · {fmtDate(c.date)}
        </p>
        {c.fabricDetail && <p><span className="text-slate-500">Fabric:</span> {c.fabricDetail}</p>}
        {c.remarks && <p><span className="text-slate-500">Remarks:</span> {c.remarks}</p>}
        <p className="text-slate-500">Entered by {c.createdBy.name}</p>
        {c.parent && (
          <p>
            Split from{" "}
            <Link href={`/challans/${c.parent.id}`} className="text-brand">{challanNo(c.parent.no)}</Link>
          </p>
        )}
        {c.children.length > 0 && (
          <p>
            Lumps moved to{" "}
            {c.children.map((ch, i) => (
              <span key={ch.id}>
                {i > 0 && ", "}
                <Link href={`/challans/${ch.id}`} className="text-brand">{challanNo(ch.no)}</Link>
              </span>
            ))}
          </p>
        )}
      </div>

      {lines.map((l) => {
        const total = challanTotal({ lines: [l] });
        return (
          <div key={l.id} className="card mb-3">
            <div className="mb-2 flex items-baseline justify-between">
              <p className="font-semibold">
                {l.design.colourName} {PART_LABEL[l.partType]}
              </p>
              <p className="text-sm">
                {l.lumps.length} lumps · <b className="tabular-nums">{total} m</b>
              </p>
            </div>
            <div className="grid grid-cols-4 gap-1.5 text-sm sm:grid-cols-6">
              {l.lumps.map((x) => (
                <div key={x.id} className="rounded-md bg-slate-50 px-2 py-1 text-right tabular-nums">
                  <span className="float-left text-[10px] text-slate-400">{x.seq}</span>
                  {x.meters.toString()}
                </div>
              ))}
            </div>
          </div>
        );
      })}

      <div className="card mb-4 flex items-center justify-between bg-navy text-white ring-0">
        <span>Total</span>
        <span className="text-xl font-bold tabular-nums">{challanTotal(c)} m</span>
      </div>

      {c.designPhotoUrl && (
        <a href={c.designPhotoUrl} target="_blank" rel="noreferrer">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={thumb(c.designPhotoUrl, 800)} alt="Design" className="mb-4 w-full rounded-xl" />
        </a>
      )}

      {c.transfers.length > 0 && (
        <>
          <h2 className="mb-2 font-semibold">Transfer history</h2>
          <ul className="card divide-y divide-slate-100 p-0">
            {c.transfers.map((t) => (
              <TransferRow key={t.id} t={t} />
            ))}
          </ul>
        </>
      )}

      {user.role === "ADMIN" && (
        <form action={deleteChallan.bind(null, id)} className="mt-8">
          <button className="btn-danger w-full">Delete challan</button>
        </form>
      )}
    </>
  );
}
