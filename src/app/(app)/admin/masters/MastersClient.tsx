"use client";

import { useState } from "react";
import type { MasterKind } from "@prisma/client";
import { Button, Form, Input, InputNumber, Modal } from "antd";
import { DataTable, Ledger, PageHeader, StatusDot, useRun, useScreen } from "@/components/ui";
import { saveMaster, setMasterActive } from "./actions";

type Item = { id: string; kind: MasterKind; name: string; sort: number; isActive: boolean; used: number };

const LISTS: { kind: MasterKind; title: string; hint: string; usedOn: [string, string] }[] = [
  { kind: "PART", title: "Parts", hint: "Picked on every challan line (Top, Pant, Dupatta…)", usedOn: ["challan line", "challan lines"] },
  { kind: "CATALOG_TYPE", title: "Catalogue types", hint: "Picked on every catalogue (Single, 2 pcs…)", usedOn: ["catalogue", "catalogues"] },
];

export function MastersClient({ items, canWrite, canModify }: { items: Item[]; canWrite: boolean; canModify: boolean }) {
  const run = useRun();
  const { desktop } = useScreen();
  const [form] = Form.useForm();
  // undefined = closed; { kind } = new item in that list; { kind, item } = editing.
  const [editing, setEditing] = useState<{ kind: MasterKind; item?: Item }>();
  const [saving, setSaving] = useState(false);

  function open(kind: MasterKind, item?: Item) {
    form.resetFields();
    const list = items.filter((i) => i.kind === kind);
    // New items go to the end of the list.
    form.setFieldsValue(item ?? { name: "", sort: list.length ? Math.max(...list.map((i) => i.sort)) + 1 : 0 });
    setEditing({ kind, item });
  }

  async function submit() {
    const v = await form.validateFields();
    setSaving(true);
    const ok = await run(saveMaster(editing!.item?.id ?? null, editing!.kind, v), editing!.item ? "Saved" : "Added");
    setSaving(false);
    if (ok) setEditing(undefined);
  }

  return (
    <>
      <PageHeader title="Masters" subtitle="The lists the app picks from. Rename, reorder or hide items; old records keep theirs." />

      <div style={{ display: "grid", gridTemplateColumns: desktop ? "1fr 1fr" : "1fr", gap: 24, alignItems: "start" }}>
        {LISTS.map((l) => (
          <DataTable<Item>
            key={l.kind}
            cardTitle={
              <div style={{ whiteSpace: "normal", padding: "12px 0" }}>
                {l.title}
                <div style={{ fontSize: 13, fontWeight: 400, color: "#64748B" }}>{l.hint}</div>
              </div>
            }
            cardExtra={
              canWrite && (
                <Button type="primary" onClick={() => open(l.kind)}>
                  Add
                </Button>
              )
            }
            data={items.filter((i) => i.kind === l.kind)}
            totalLabel="items"
            pagination={false}
            columns={[
              { title: "Name", dataIndex: "name", render: (n: string) => <span style={{ fontWeight: 500 }}>{n}</span> },
              { title: "Order", dataIndex: "sort", align: "right", render: (s: number) => <Ledger>{s}</Ledger> },
              {
                title: "Status",
                dataIndex: "isActive",
                render: (a: boolean) => <StatusDot color={a ? "#16A34A" : "#94A3B8"} label={a ? "In use" : "Hidden"} />,
              },
              { title: "Used on", dataIndex: "used", render: (n: number) => <span style={{ color: "#64748B" }}>{n ? `${n} ${l.usedOn[n === 1 ? 0 : 1]}` : "—"}</span> },
            ]}
            actions={(i) => [
              { key: "edit", label: "Rename / reorder", hidden: !canModify, onClick: () => open(l.kind, i) },
              {
                key: "toggle",
                label: i.isActive ? "Hide" : "Show again",
                hidden: !canModify,
                confirm: i.isActive ? `Hide "${i.name}"? It leaves the pickers; existing records keep it.` : undefined,
                onClick: () => run(setMasterActive(i.id, !i.isActive), i.isActive ? `"${i.name}" hidden` : `"${i.name}" is back`),
              },
            ]}
          />
        ))}
      </div>

      <Modal
        title={editing?.item ? `Edit "${editing.item.name}"` : `Add to ${LISTS.find((l) => l.kind === editing?.kind)?.title ?? ""}`}
        open={!!editing}
        onCancel={() => setEditing(undefined)}
        onOk={submit}
        okText="Save"
        confirmLoading={saving}
        destroyOnHidden
      >
        <Form form={form} layout="vertical" requiredMark={false} onFinish={submit}>
          <Form.Item name="name" label="Name" rules={[{ required: true, message: "Enter a name" }]}>
            <Input autoFocus maxLength={40} placeholder={editing?.kind === "PART" ? "e.g. Kurti" : "e.g. 4 pcs"} />
          </Form.Item>
          <Form.Item name="sort" label="Order" extra="Lower numbers come first in the pickers." style={{ marginBottom: 0 }}>
            <InputNumber min={0} max={999} style={{ width: 120 }} inputMode="numeric" />
          </Form.Item>
        </Form>
      </Modal>
    </>
  );
}
