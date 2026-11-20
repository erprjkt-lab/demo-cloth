"use client";

import Link from "next/link";
import { DeleteOutlined, EyeOutlined, SwapOutlined } from "@ant-design/icons";
import type { TableColumnsType } from "antd";
import { DataTable, Ledger, useRun } from "@/components/ui";
import { fmtDate } from "@/lib/format";
import type { ChallanRow } from "@/lib/rows";
import { deleteChallan } from "@/app/(app)/challans/actions";

/** The one challan table: Challans page, Jobber details and Catalogue details all use it. */
export function ChallanTable({
  rows,
  hide = [],
  canTransfer = false,
  canDelete = false,
  toolbar,
}: {
  rows: ChallanRow[];
  hide?: ("jobber" | "catalog")[];
  canTransfer?: boolean;
  canDelete?: boolean;
  toolbar?: React.ReactNode;
}) {
  const run = useRun();
  const columns: TableColumnsType<ChallanRow> = [
    { title: "Challan No", dataIndex: "no", width: 110, render: (no, r) => <Link href={`/challans/${r.id}`}><Ledger>{no}</Ledger></Link> },
    { title: "Date", dataIndex: "date", render: (d) => fmtDate(new Date(d)) },
    ...(hide.includes("jobber") ? [] : [{ title: "Jobber", dataIndex: "jobber" }]),
    ...(hide.includes("catalog") ? [] : [{ title: "Catalogue", dataIndex: "catalog", responsive: ["md" as const] }]),
    { title: "Job", dataIndex: "job", responsive: ["lg"], render: (j) => (j ? <Ledger>{j}</Ledger> : "—") },
    { title: "Lines", dataIndex: "lines", align: "right", responsive: ["lg"] },
    { title: "Lumps", dataIndex: "lumps", align: "right", responsive: ["md"] },
    { title: "Meters", dataIndex: "meters", align: "right", render: (m) => <Ledger>{m}</Ledger> },
    { title: "Entered by", dataIndex: "createdBy", responsive: ["xl"] },
  ];

  return (
    <DataTable<ChallanRow>
      columns={columns}
      data={rows}
      totalLabel="challans"
      search={(r) => `${r.no} ${r.jobber} ${r.catalog} ${r.job ?? ""}`}
      searchPlaceholder="Search challan no, jobber, catalogue"
      toolbar={toolbar}
      actions={(r) => [
        { key: "view", label: "View", icon: <EyeOutlined />, href: `/challans/${r.id}` },
        { key: "transfer", label: "Transfer", icon: <SwapOutlined />, hidden: !canTransfer, href: `/challans/${r.id}/transfer` },
        {
          key: "delete",
          label: "Delete",
          icon: <DeleteOutlined />,
          danger: true,
          hidden: !canDelete,
          confirm: `Delete ${r.no}?`,
          onClick: () => run(deleteChallan(r.id), "Challan deleted"),
        },
      ]}
    />
  );
}
