"use client";

import { useState } from "react";
import Link from "next/link";
import { EditOutlined, EyeOutlined, PlusOutlined } from "@ant-design/icons";
import { Button } from "antd";
import type { TableColumnsType } from "antd";
import { DataTable, PageHeader } from "@/components/ui";
import { JobberDrawer, type Jobber } from "./JobberDrawer";

type Row = Jobber & { challans: number; openJobs: number };

export function JobbersClient({ rows, canWrite, canModify }: { rows: Row[]; canWrite: boolean; canModify: boolean }) {
  const [editing, setEditing] = useState<Jobber | null | undefined>(undefined);

  const columns: TableColumnsType<Row> = [
    { title: "Jobber", dataIndex: "name", render: (n, r) => <Link href={`/jobbers/${r.id}`}>{n}</Link> },
    { title: "Owner", dataIndex: "ownerName", render: (v) => v ?? "—" },
    { title: "Mobile", dataIndex: "mobile1", render: (m) => <a href={`tel:${m}`}>{m}</a> },
    { title: "GST no", dataIndex: "gstNo", responsive: ["lg"], render: (v) => v ?? "—" },
    { title: "Open jobs", dataIndex: "openJobs", align: "right" },
    { title: "Challans", dataIndex: "challans", align: "right", responsive: ["md"] },
  ];

  return (
    <>
      <PageHeader
        title="Jobbers"
        subtitle="Stitching jobbers who take work"
        breadcrumbs={[{ label: "Home", href: "/" }, { label: "Jobbers" }]}
        actions={
          canWrite && (
            <Button type="primary" icon={<PlusOutlined />} onClick={() => setEditing(null)}>
              New Jobber
            </Button>
          )
        }
      />
      <DataTable<Row>
        columns={columns}
        data={rows}
        totalLabel="jobbers"
        search={(r) => `${r.name} ${r.ownerName ?? ""} ${r.mobile1} ${r.gstNo ?? ""}`}
        searchPlaceholder="Search name, owner, mobile"
        actions={(r) => [
          { key: "view", label: "View details", icon: <EyeOutlined />, href: `/jobbers/${r.id}` },
          { key: "edit", label: "Edit", icon: <EditOutlined />, hidden: !canModify, onClick: () => setEditing(r) },
        ]}
      />
      <JobberDrawer jobber={editing} onClose={() => setEditing(undefined)} />
    </>
  );
}
