"use client";

import { useState } from "react";
import Link from "next/link";
import { DeleteOutlined, EditOutlined, EyeOutlined, PictureOutlined, PlusOutlined } from "@ant-design/icons";
import { Avatar, Button, Tag } from "antd";
import type { TableColumnsType } from "antd";
import { DataTable, Ledger, PageHeader, useRun } from "@/components/ui";
import { fmtDate, thumb } from "@/lib/format";
import type { MasterOption } from "@/lib/masters";
import { deleteCatalog } from "./actions";
import { CatalogDrawer, type CatalogInput } from "./CatalogDrawer";

type Row = CatalogInput & { designCount: number; totalPieces: number; updatedAt: Date };

export function CatalogsClient({
  rows,
  canWrite,
  canModify,
  canDelete,
  types,
}: {
  rows: Row[];
  types: MasterOption[];
  canWrite: boolean;
  canModify: boolean;
  canDelete: boolean;
}) {
  const run = useRun();
  const [editing, setEditing] = useState<CatalogInput | null | undefined>(undefined);

  const columns: TableColumnsType<Row> = [
    {
      title: "Catalogue",
      dataIndex: "name",
      render: (_, r) => (
        <Link href={`/catalogs/${r.id}`} style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <Avatar shape="square" size={36} src={r.photo ? thumb(r.photo.url, 80) : undefined} icon={<PictureOutlined />} />
          <span>
            {r.name} {r.volume}
          </span>
        </Link>
      ),
    },
    { title: "Code", dataIndex: "code", responsive: ["lg"], render: (v) => v ?? "—" },
    { title: "Type", dataIndex: "typeName", render: (t: string) => <Tag>{t}</Tag> },
    { title: "Designs", dataIndex: "designCount", align: "right" },
    { title: "Pcs / design", dataIndex: "piecesPerDesign", align: "right", responsive: ["md"], render: (n) => <Ledger>{n.toLocaleString("en-IN")}</Ledger> },
    { title: "Total pcs", dataIndex: "totalPieces", align: "right", render: (n) => <Ledger>{n.toLocaleString("en-IN")}</Ledger> },
    { title: "Fabric", dataIndex: "fabric", responsive: ["xl"], render: (v) => v ?? "—" },
    { title: "Updated", dataIndex: "updatedAt", responsive: ["lg"], render: (d) => fmtDate(new Date(d)) },
  ];

  return (
    <>
      <PageHeader
        title="Catalogues"
        subtitle="Designs, size ratios and pieces — newest first"
        breadcrumbs={[{ label: "Home", href: "/" }, { label: "Catalogues" }]}
        actions={
          canWrite && (
            <Button type="primary" icon={<PlusOutlined />} onClick={() => setEditing(null)}>
              New Catalogue
            </Button>
          )
        }
      />
      <DataTable<Row>
        columns={columns}
        data={rows}
        totalLabel="catalogues"
        search={(r) => `${r.name} ${r.volume ?? ""} ${r.code ?? ""} ${r.fabric ?? ""}`}
        searchPlaceholder="Search name, volume, code"
        actions={(r) => [
          { key: "view", label: "View", icon: <EyeOutlined />, href: `/catalogs/${r.id}` },
          { key: "edit", label: "Edit", icon: <EditOutlined />, hidden: !canModify, onClick: () => setEditing(r) },
          {
            key: "delete",
            label: "Delete",
            icon: <DeleteOutlined />,
            danger: true,
            hidden: !canDelete,
            confirm: `Delete ${r.name}?`,
            onClick: () => run(deleteCatalog(r.id), "Catalogue deleted"),
          },
        ]}
      />
      <CatalogDrawer catalog={editing} types={types} onClose={() => setEditing(undefined)} />
    </>
  );
}
