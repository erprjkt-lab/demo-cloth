import Link from "next/link";
import type { Prisma } from "@prisma/client";
import { db } from "@/lib/db";
import { challanScope, requireUser } from "@/lib/auth";
import { Empty, PageHeader, SearchBox } from "@/components/ui";
import { ChallanCard, challanCardInclude } from "@/components/ChallanCard";

export default async function ChallansPage({ searchParams }: { searchParams: Promise<{ q?: string }> }) {
  const user = await requireUser();
  const { q } = await searchParams;

  // "CH-0012", "ch12" or "12" search by number; anything else by jobber or catalogue name.
  const num = q?.match(/^\s*(?:ch-?)?0*(\d+)\s*$/i)?.[1];
  const like = { contains: q, mode: "insensitive" as const };
  const search: Prisma.ChallanWhereInput = !q
    ? {}
    : num
      ? { no: Number(num) }
      : { OR: [{ jobber: { name: like } }, { catalog: { name: like } }] };

  // ponytail: newest 100 only; add paging once there are more challans than that.
  const challans = await db.challan.findMany({
    where: { deletedAt: null, ...challanScope(user), ...search },
    orderBy: { no: "desc" },
    take: 100,
    include: challanCardInclude,
  });

  return (
    <>
      <PageHeader
        title={user.role === "JOBBER" ? "My challans" : "Challans"}
        action={user.role !== "JOBBER" && <Link href="/challans/new" className="btn-primary">+ New</Link>}
      />
      <SearchBox q={q} placeholder={user.role === "JOBBER" ? "Challan no" : "Challan no, jobber or catalogue"} />
      {challans.length === 0 && <Empty>No challans found</Empty>}
      <ul className="space-y-2">
        {challans.map((c) => (
          <li key={c.id}>
            <ChallanCard c={c} />
          </li>
        ))}
      </ul>
    </>
  );
}
