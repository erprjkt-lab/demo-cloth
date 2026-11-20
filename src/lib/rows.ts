import "server-only";
import type { Prisma } from "@prisma/client";
import { challanNo } from "./format";
import { jobNo } from "./jobs";
import { sumMeters } from "./validation";

// Challans as plain rows for the client tables (Prisma Decimal can't cross to the browser).
export const challanRowInclude = {
  jobber: { select: { name: true } },
  catalog: { select: { name: true, volume: true } },
  jobWork: { select: { id: true, no: true } },
  createdBy: { select: { name: true } },
  lines: { select: { designId: true, partId: true, lumps: { select: { meters: true } } } },
} satisfies Prisma.ChallanInclude;

type ChallanWithRows = Prisma.ChallanGetPayload<{ include: typeof challanRowInclude }>;

export function toChallanRow(c: ChallanWithRows) {
  const meters = c.lines.flatMap((l) => l.lumps.map((x) => x.meters.toString()));
  return {
    id: c.id,
    no: challanNo(c.no),
    date: c.date,
    jobberId: c.jobberId,
    jobber: c.jobber.name,
    catalogId: c.catalogId,
    catalog: `${c.catalog.name} ${c.catalog.volume ?? ""}`.trim(),
    job: c.jobWork ? jobNo(c.jobWork.no) : null,
    lines: c.lines.length,
    lumps: meters.length,
    meters: sumMeters(meters),
    createdBy: c.createdBy.name,
  };
}

export type ChallanRow = ReturnType<typeof toChallanRow>;
