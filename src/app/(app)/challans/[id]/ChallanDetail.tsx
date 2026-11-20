"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { DeleteOutlined, SwapOutlined } from "@ant-design/icons";
import { Button, Card, Descriptions, Image, Popconfirm, Table, Tag } from "antd";
import { DataTable, Ledger, PageHeader, useRun } from "@/components/ui";
import { thumb } from "@/lib/format";
import { deleteChallan } from "../actions";

type Ref = { id: string; no: string };

export function ChallanDetail({
  challan: c,
  lines,
  transfers,
  canTransfer,
  canDelete,
}: {
  challan: {
    id: string;
    no: string;
    date: string;
    jobber: string;
    catalog: string;
    job: string | null;
    fabricDetail: string | null;
    remarks: string | null;
    createdBy: string;
    photoUrl: string | null;
    parent: Ref | null;
    children: Ref[];
    total: string;
  };
  lines: { id: string; design: string; part: string; lumps: { seq: number; meters: string }[]; total: string }[];
  transfers: { id: string; at: string; from: string; to: string; type: string; note: string | null; by: string }[];
  canTransfer: boolean;
  canDelete: boolean;
}) {
  const run = useRun();
  const router = useRouter();
  const refLinks = (refs: Ref[]) =>
    refs.map((r, i) => (
      <span key={r.id}>
        {i > 0 && ", "}
        <Link href={`/challans/${r.id}`}>{r.no}</Link>
      </span>
    ));

  return (
    <>
      <PageHeader
        title={c.no}
        subtitle={`${c.jobber} · ${c.catalog}`}
        breadcrumbs={[{ label: "Challans", href: "/challans" }, { label: c.no }]}
        actions={
          <>
            {canTransfer && (
              <Link href={`/challans/${c.id}/transfer`}>
                <Button icon={<SwapOutlined />}>Transfer</Button>
              </Link>
            )}
            {canDelete && (
              <Popconfirm
                title={`Delete ${c.no}?`}
                okButtonProps={{ danger: true }}
                onConfirm={async () => (await run(deleteChallan(c.id), "Challan deleted")) && router.push("/challans")}
              >
                <Button danger icon={<DeleteOutlined />}>
                  Delete
                </Button>
              </Popconfirm>
            )}
          </>
        }
      />

      <Card style={{ marginBottom: 12 }}>
        <Descriptions
          size="small"
          column={{ xs: 1, sm: 2, lg: 3 }}
          items={[
            { label: "Date", children: c.date },
            { label: "Jobber", children: c.jobber },
            { label: "Catalogue", children: c.catalog },
            { label: "Job Work", children: c.job ?? "—" },
            { label: "Fabric", children: c.fabricDetail ?? "—" },
            { label: "Entered by", children: c.createdBy },
            { label: "Total", children: <b><Ledger>{c.total} m</Ledger></b> },
            ...(c.remarks ? [{ label: "Remarks", children: c.remarks }] : []),
            ...(c.parent ? [{ label: "Split from", children: refLinks([c.parent]) }] : []),
            ...(c.children.length ? [{ label: "Lumps moved to", children: refLinks(c.children) }] : []),
          ]}
        />
      </Card>

      <DataTable
        cardTitle="Lines"
        cardExtra={<b><Ledger>{c.total} m</Ledger></b>}
        pagination={false}
        data={lines}
        totalLabel="lines"
        columns={[
            { title: "Design", dataIndex: "design", render: (d, l) => `${d} ${l.part}` },
            {
              title: "Lumps (m)",
              dataIndex: "lumps",
              render: (lumps: { seq: number; meters: string }[]) => (
                <div style={{ display: "flex", flexWrap: "wrap", gap: 4, maxWidth: 560 }}>
                  {lumps.map((x) => (
                    <Tag key={x.seq} style={{ marginInlineEnd: 0 }}>
                      <span style={{ color: "#94A3B8", fontSize: 10 }}>{x.seq}</span> <Ledger>{x.meters}</Ledger>
                    </Tag>
                  ))}
                </div>
              ),
            },
            { title: "Count", key: "count", align: "right", render: (_, l) => l.lumps.length },
            { title: "Meters", dataIndex: "total", align: "right", render: (m) => <b><Ledger>{m}</Ledger></b> },
          ]}
          summary={() => (
            <Table.Summary.Row>
              <Table.Summary.Cell index={0} colSpan={2}>
                <b>Total</b>
              </Table.Summary.Cell>
              <Table.Summary.Cell index={1} align="right">
                {lines.reduce((a, l) => a + l.lumps.length, 0)}
              </Table.Summary.Cell>
              <Table.Summary.Cell index={2} align="right">
                <b><Ledger>{c.total}</Ledger></b>
              </Table.Summary.Cell>
            </Table.Summary.Row>
          )}
        />

      {c.photoUrl && (
        <Card title="Design photo" style={{ marginBottom: 12 }}>
          <Image src={thumb(c.photoUrl, 400)} preview={{ src: c.photoUrl }} width={200} alt="Design" />
        </Card>
      )}

      {transfers.length > 0 && (
          <DataTable
            cardTitle="Transfer history"
            pagination={false}
            data={transfers}
            totalLabel="transfers"
            columns={[
              { title: "When", dataIndex: "at" },
              { title: "From", dataIndex: "from" },
              { title: "To", dataIndex: "to" },
              { title: "Type", dataIndex: "type", render: (t) => <Tag>{t}</Tag> },
              { title: "Note", dataIndex: "note", render: (n) => n ?? "—" },
              { title: "By", dataIndex: "by" },
            ]}
          />
      )}
    </>
  );
}
