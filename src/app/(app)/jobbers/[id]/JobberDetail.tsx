"use client";

import { useState } from "react";
import Link from "next/link";
import { EditOutlined } from "@ant-design/icons";
import { Button, Card, Descriptions, Tabs } from "antd";
import { DataTable, JobStatusDot, Ledger, PageHeader } from "@/components/ui";
import { ChallanTable } from "@/components/ChallanTable";
import { fmtDate } from "@/lib/format";
import { jobNo, type JobStatus } from "@/lib/jobs";
import type { ChallanRow } from "@/lib/rows";
import { JobberDrawer, type Jobber } from "../JobberDrawer";

type Job = {
  id: string;
  no: number;
  title: string;
  catalog: string | null;
  pieces: number | null;
  dueDate: string | null;
  status: JobStatus;
  received: number | null;
  rejected: number | null;
  notReceived: number | null;
};
const count = (v: number | null, color?: string) =>
  v === null ? "—" : <Ledger><span style={{ color: v > 0 ? color : undefined }}>{v.toLocaleString("en-IN")}</span></Ledger>;
type CatalogHistory = { id: string; catalog: string; challans: number; meters: string };

export function JobberDetail({
  jobber,
  canModify,
  jobs,
  challans,
  catalogs,
}: {
  jobber: Jobber;
  canModify: boolean;
  jobs: Job[];
  challans: ChallanRow[];
  catalogs: CatalogHistory[];
}) {
  const [editing, setEditing] = useState<Jobber | undefined>();

  return (
    <>
      <PageHeader
        title={jobber.name}
        subtitle={jobber.ownerName ?? undefined}
        breadcrumbs={[{ label: "Jobbers", href: "/jobbers" }, { label: jobber.name }]}
        actions={
          canModify && (
            <Button icon={<EditOutlined />} onClick={() => setEditing(jobber)}>
              Edit
            </Button>
          )
        }
      />

      <Card style={{ marginBottom: 12 }}>
        <Descriptions
          size="small"
          column={{ xs: 1, sm: 2, lg: 3 }}
          items={[
            { label: "Owner", children: jobber.ownerName ?? "—" },
            { label: "GST no", children: jobber.gstNo ?? "—" },
            {
              label: "Mobile",
              children: [jobber.mobile1, jobber.mobile2].filter(Boolean).map((m, i) => (
                <span key={m}>
                  {i > 0 && ", "}
                  <a href={`tel:${m}`}>{m}</a>
                </span>
              )),
            },
            { label: "Address", children: jobber.address ?? "—" },
          ]}
        />
      </Card>

      <Tabs
          items={[
            {
              key: "jobs",
              label: `Job Work (${jobs.length})`,
              children: (
                <DataTable<Job>
                  data={jobs}
                  totalLabel="jobs"
                  search={(j) => `${jobNo(j.no)} ${j.title}`}
                  searchPlaceholder="Search job"
                  columns={[
                    { title: "Job No", dataIndex: "no", render: (no) => <Link href="/jobs"><Ledger>{jobNo(no)}</Ledger></Link> },
                    { title: "Title", dataIndex: "title" },
                    { title: "Catalogue", dataIndex: "catalog", render: (v) => v ?? "—" },
                    { title: "Pieces sent", dataIndex: "pieces", align: "right", render: (v) => count(v) },
                    { title: "Received", dataIndex: "received", align: "right", render: (v) => count(v) },
                    { title: "Rejected", dataIndex: "rejected", align: "right", render: (v) => count(v, "#DC2626") },
                    { title: "Not received", dataIndex: "notReceived", align: "right", render: (v) => count(v, "#D97706") },
                    { title: "Due", dataIndex: "dueDate", render: (d) => (d ? fmtDate(new Date(d)) : "—") },
                    { title: "Status", dataIndex: "status", render: (s) => <JobStatusDot status={s} /> },
                  ]}
                />
              ),
            },
            {
              key: "challans",
              label: `Challans (${challans.length})`,
              children: <ChallanTable rows={challans} hide={["jobber"]} />,
            },
            {
              key: "catalogs",
              label: "Catalogue history",
              children: (
                <DataTable<CatalogHistory>
                  pagination={false}
                  data={catalogs}
                  totalLabel="catalogues"
                  columns={[
                    { title: "Catalogue", dataIndex: "catalog", render: (c, r) => <Link href={`/catalogs/${r.id}`}>{c}</Link> },
                    { title: "Challans", dataIndex: "challans", align: "right" },
                    { title: "Meters", dataIndex: "meters", align: "right", render: (m) => <Ledger>{m}</Ledger> },
                  ]}
                />
              ),
            },
          ]}
        />

      <JobberDrawer jobber={editing} onClose={() => setEditing(undefined)} />
    </>
  );
}
