import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { OFFICE, requireUser } from "@/lib/auth";
import { Empty, PageHeader, SearchBox } from "@/components/ui";
import { TransferRow, transferInclude } from "@/components/TransferRow";

export default async function TransfersPage({ searchParams }: { searchParams: Promise<{ q?: string }> }) {
  await requireUser(...OFFICE);
  const { q } = await searchParams;
  const num = q?.match(/^\s*(?:ch-?)?0*(\d+)\s*$/i)?.[1];
  if (num) {
    const c = await db.challan.findFirst({ where: { no: Number(num), deletedAt: null }, select: { id: true } });
    if (c) redirect(`/challans/${c.id}/transfer`);
  }

  const transfers = await db.transfer.findMany({ orderBy: { createdAt: "desc" }, take: 100, include: transferInclude });

  return (
    <>
      <PageHeader title="Job transfer" back="/" />
      <p className="mb-2 text-sm text-slate-600">Enter the challan number to transfer:</p>
      <SearchBox q={q} placeholder="e.g. CH-0012" />
      {q && <p className="error mb-3">No challan {q}</p>}

      <h2 className="mb-2 mt-4 font-semibold">History</h2>
      {transfers.length === 0 ? (
        <Empty>No transfers yet</Empty>
      ) : (
        <ul className="card divide-y divide-slate-100 p-0">
          {transfers.map((t) => (
            <TransferRow key={t.id} t={t} />
          ))}
        </ul>
      )}
    </>
  );
}
