"use client";

import Link from "next/link";
import { PlusOutlined } from "@ant-design/icons";
import { Button } from "antd";
import { PageHeader } from "@/components/ui";
import { ChallanTable } from "@/components/ChallanTable";
import type { ChallanRow } from "@/lib/rows";

export function ChallansClient({
  rows,
  jobber,
  canCreate,
  canTransfer,
  canDelete,
}: {
  rows: ChallanRow[];
  jobber: boolean;
  canCreate: boolean;
  canTransfer: boolean;
  canDelete: boolean;
}) {
  return (
    <>
      <PageHeader
        title={jobber ? "My Challans" : "Challans"}
        subtitle="Fabric given to jobbers, with lump-wise meters"
        breadcrumbs={[{ label: "Home", href: "/" }, { label: "Challans" }]}
        actions={
          canCreate && (
            <Link href="/challans/new">
              <Button type="primary" icon={<PlusOutlined />}>
                New Challan
              </Button>
            </Link>
          )
        }
      />
      <ChallanTable rows={rows} hide={jobber ? ["jobber"] : []} canTransfer={canTransfer} canDelete={canDelete} />
    </>
  );
}
