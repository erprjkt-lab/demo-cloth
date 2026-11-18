import Link from "next/link";
import type { Prisma } from "@prisma/client";
import { challanNo, fmtDateTime } from "@/lib/format";

export const transferInclude = {
  challan: { select: { id: true, no: true } },
  fromJobber: { select: { name: true } },
  toJobber: { select: { name: true } },
  createdBy: { select: { name: true } },
} satisfies Prisma.TransferInclude;

type Row = Prisma.TransferGetPayload<{ include: typeof transferInclude }>;

export function TransferRow({ t }: { t: Row }) {
  return (
    <li className="px-4 py-2.5 text-sm">
      <div className="flex justify-between gap-2">
        <span>
          <Link href={`/challans/${t.challan.id}`} className="font-semibold text-brand">
            {challanNo(t.challan.no)}
          </Link>{" "}
          {t.fromJobber.name} → {t.toJobber.name}
        </span>
        <span className="shrink-0 text-xs text-slate-500">{t.type === "FULL" ? "Full" : "Custom"}</span>
      </div>
      {t.note && <p className="text-slate-600">{t.note}</p>}
      <p className="text-xs text-slate-500">
        {fmtDateTime(t.createdAt)} · {t.createdBy.name}
      </p>
    </li>
  );
}
