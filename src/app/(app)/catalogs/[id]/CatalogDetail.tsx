"use client";

import { useState } from "react";
import { EditOutlined } from "@ant-design/icons";
import { Button, Card, Col, Descriptions, Image, Row, Table, Tabs, Tag } from "antd";
import { DataTable, Ledger, PageHeader } from "@/components/ui";
import { ChallanTable } from "@/components/ChallanTable";
import { thumb } from "@/lib/format";
import type { ChallanRow } from "@/lib/rows";
import type { MasterOption } from "@/lib/masters";
import { SIZE_LABEL, SIZES } from "@/lib/validation";
import { CatalogDrawer, type CatalogInput } from "../CatalogDrawer";

/** Meters per part, keyed by part id. */
type Holding = { key: string; design: string; jobber: string; total: string } & Record<string, string | null>;

export function CatalogDetail({
  catalog: c,
  canModify,
  types,
  parts,
  holdings,
  jobbers,
  challans,
}: {
  catalog: CatalogInput & { designCount: number; totalPieces: number };
  canModify: boolean;
  types: MasterOption[];
  parts: { id: string; name: string }[];
  holdings: Holding[];
  jobbers: { jobber: string; meters: string }[];
  challans: ChallanRow[];
}) {
  const [editing, setEditing] = useState<CatalogInput | undefined>();
  const title = `${c.name} ${c.volume ?? ""}`.trim();

  return (
    <>
      <PageHeader
        title={title}
        breadcrumbs={[{ label: "Catalogues", href: "/catalogs" }, { label: title }]}
        actions={
          canModify && (
            <Button icon={<EditOutlined />} onClick={() => setEditing(c)}>
              Edit
            </Button>
          )
        }
      />

      <Row gutter={12} style={{ marginBottom: 12 }}>
        <Col xs={24} lg={c.photo ? 16 : 24}>
          <Card style={{ height: "100%" }}>
            <Descriptions
              size="small"
              column={{ xs: 1, sm: 2 }}
              items={[
                { label: "Type", children: c.typeName },
                { label: "Code", children: c.code ?? "—" },
                { label: "Fabric", children: c.fabric ?? "—" },
                {
                  label: "Pieces",
                  children: (
                    <Ledger>
                      {c.designCount} × {c.piecesPerDesign.toLocaleString("en-IN")} = {c.totalPieces.toLocaleString("en-IN")}
                    </Ledger>
                  ),
                },
                {
                  label: "Designs",
                  span: "filled",
                  children: (
                    <span style={{ display: "flex", flexWrap: "wrap", gap: 4 }}>
                      {c.designs.map((d) => (
                        <Tag key={d.id}>{d.colourName}</Tag>
                      ))}
                    </span>
                  ),
                },
              ]}
            />
            <Table
              style={{ marginTop: 12 }}
              size="small"
              bordered
              pagination={false}
              scroll={{ x: "max-content" }}
              rowKey={() => "ratio"}
              dataSource={[c.sizes]}
              columns={SIZES.map((s) => ({ title: SIZE_LABEL[s], dataIndex: s, align: "center" as const, render: (v) => v ?? 0 }))}
            />
          </Card>
        </Col>
        {c.photo && (
          <Col xs={24} lg={8}>
            <Card style={{ height: "100%", textAlign: "center" }}>
              <Image src={thumb(c.photo.url, 600)} preview={{ src: c.photo.url }} alt={title} style={{ maxHeight: 260, objectFit: "contain" }} />
            </Card>
          </Col>
        )}
      </Row>

      <Tabs
          items={[
            {
              key: "holdings",
              label: "By design & part",
              children: (
                <DataTable<Holding>
                  rowKey="key"
                  pagination={false}
                  data={holdings}
                  totalLabel="rows"
                  search={(h) => `${h.design} ${h.jobber}`}
                  searchPlaceholder="Search design or jobber"
                  locale={{ emptyText: "No fabric given out for this catalogue yet" }}
                  columns={[
                    { title: "Design · Jobber", dataIndex: "design", render: (d, h) => `${d} · ${h.jobber}` },
                    ...parts.map((p) => ({
                      title: `${p.name} (m)`,
                      dataIndex: p.id,
                      align: "right" as const,
                      render: (m: string | null) => (m ? <Ledger>{m}</Ledger> : "—"),
                    })),
                    { title: "Total (m)", dataIndex: "total", align: "right", render: (m) => <b><Ledger>{m}</Ledger></b> },
                  ]}
                />
              ),
            },
            {
              key: "jobbers",
              label: `Jobbers holding it (${jobbers.length})`,
              children: (
                <DataTable
                  rowKey="jobber"
                  pagination={false}
                  totalLabel="jobbers"
                  data={jobbers}
                  columns={[
                    { title: "Jobber", dataIndex: "jobber" },
                    { title: "Meters", dataIndex: "meters", align: "right", render: (m) => <Ledger>{m}</Ledger> },
                  ]}
                />
              ),
            },
            { key: "challans", label: `Challans (${challans.length})`, children: <ChallanTable rows={challans} hide={["catalog"]} /> },
          ]}
        />

      <CatalogDrawer catalog={editing} types={types} onClose={() => setEditing(undefined)} />
    </>
  );
}
