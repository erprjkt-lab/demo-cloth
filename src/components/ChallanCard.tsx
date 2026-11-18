import Link from "next/link";
import type { Prisma } from "@prisma/client";
import { challanNo, fmtDate } from "@/lib/format";
import { sumMeters } from "@/lib/validation";

export const challanCardInclude = {
  jobber: { select: { name: true } },
  catalog: { select: { name: true, volume: true } },
  lines: { select: { designId: true, partType: true, lumps: { select: { meters: true } } } },
} satisfies Prisma.ChallanInclude;

type Row = Prisma.ChallanGetPayload<{ include: typeof challanCardInclude }>;

export const challanTotal = (c: Pick<Row, "lines">) =>
  sumMeters(c.lines.flatMap((l) => l.lumps.map((x) => x.meters.toString())));

export function ChallanCard({ c }: { c: Row }) {
  return (
    <Link href={`/challans/${c.id}`} className="card flex items-center justify-between gap-3">
      <div className="min-w-0">
        <p className="font-semibold">
          {challanNo(c.no)} <span className="text-sm font-normal text-slate-500">· {fmtDate(c.date)}</span>
        </p>
        <p className="truncate text-sm text-slate-600">
          {c.jobber.name} · {c.catalog.name}
          {c.catalog.volume && ` ${c.catalog.volume}`}
        </p>
      </div>
      <span className="shrink-0 font-semibold tabular-nums">{challanTotal(c)} m</span>
    </Link>
  );
}
