"use client";

import { useState } from "react";
import Link from "next/link";
import { CheckOutlined, PlusOutlined } from "@ant-design/icons";
import { Button, Col, DatePicker, Drawer, Form, Input, Row, Segmented, Select, Space, Tag, Typography } from "antd";
import type { TableColumnsType } from "antd";
import { DataTable, Ledger, PageHeader, useRun, useDrawerSize } from "@/components/ui";
import { fmtDateTime } from "@/lib/format";
import { createTask, markDone } from "./actions";
import { PushToggle } from "./PushToggle";

type Option = { value: string; label: string };
type Row = {
  id: string;
  title: string;
  description: string | null;
  assignedTo: string;
  createdBy: string;
  challan: { id: string; no: string } | null;
  dueAt: Date | null;
  remindAt: Date | null;
  status: "OPEN" | "DONE";
  completedAt: Date | null;
};

export function TasksClient({
  rows,
  office,
  canWrite,
  canModify,
  users,
  challans,
}: {
  rows: Row[];
  office: boolean;
  canWrite: boolean;
  canModify: boolean;
  users: Option[];
  challans: Option[];
}) {
  const run = useRun();
  const [view, setView] = useState<"open" | "reminders" | "done">("open");
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form] = Form.useForm();
  const now = new Date();

  const data = rows.filter((r) =>
    view === "done" ? r.status === "DONE" : r.status === "OPEN" && (view === "open" || (r.remindAt && new Date(r.remindAt) <= now)),
  );

  async function submit() {
    const v = await form.validateFields();
    setSaving(true);
    const ok = await run(
      createTask({ ...v, dueAt: v.dueAt?.toISOString() ?? null, remindAt: v.remindAt?.toISOString() ?? null }),
      "Task assigned",
    );
    setSaving(false);
    if (ok) {
      setOpen(false);
      form.resetFields();
    }
  }

  const columns: TableColumnsType<Row> = [
    {
      title: "Task",
      dataIndex: "title",
      render: (t, r) => (
        <div style={{ maxWidth: 420 }}>
          <Typography.Text delete={r.status === "DONE"} strong>
            {t}
          </Typography.Text>
          {r.description && <div style={{ fontSize: 12, color: "#64748B", whiteSpace: "pre-line" }}>{r.description}</div>}
        </div>
      ),
    },
    ...(office ? [{ title: "Assigned to", dataIndex: "assignedTo" } as const] : []),
    { title: "By", dataIndex: "createdBy", responsive: ["lg"] },
    {
      title: "Challan",
      dataIndex: "challan",
      responsive: ["md"],
      render: (c: Row["challan"]) => (c ? <Link href={`/challans/${c.id}`}><Ledger>{c.no}</Ledger></Link> : "—"),
    },
    {
      title: "Due",
      dataIndex: "dueAt",
      render: (d: Date | null, r) =>
        d ? <span style={{ color: r.status === "OPEN" && new Date(d) < now ? "#DC2626" : undefined }}>{fmtDateTime(new Date(d))}</span> : "—",
    },
    { title: "Reminder", dataIndex: "remindAt", responsive: ["md"], render: (d) => (d ? fmtDateTime(new Date(d)) : "—") },
    {
      title: "Status",
      dataIndex: "status",
      render: (s, r) =>
        s === "DONE" ? (
          <Tag color="green">Done {r.completedAt && fmtDateTime(new Date(r.completedAt))}</Tag>
        ) : (
          <Tag color="processing">Open</Tag>
        ),
    },
  ];

  return (
    <>
      <PageHeader
        title={office ? "Tasks" : "My Tasks"}
        subtitle="To-dos with reminders. A task given to a jobber shows on their phone."
        breadcrumbs={[{ label: "Home", href: "/" }, { label: "Tasks" }]}
        actions={
          canWrite && (
            <Button type="primary" icon={<PlusOutlined />} onClick={() => setOpen(true)}>
              New Task
            </Button>
          )
        }
      />
      <PushToggle />
      <DataTable<Row>
        columns={columns}
        data={data}
        totalLabel="tasks"
        search={(r) => `${r.title} ${r.description ?? ""} ${r.assignedTo} ${r.challan?.no ?? ""}`}
        searchPlaceholder="Search tasks"
        toolbar={
          <Segmented
            value={view}
            onChange={(v) => setView(v as typeof view)}
            options={[
              { value: "open", label: "Open" },
              { value: "reminders", label: "Reminders due" },
              { value: "done", label: "Done" },
            ]}
          />
        }
        actions={(r) => [
          {
            key: "done",
            label: "Mark done",
            icon: <CheckOutlined />,
            hidden: r.status === "DONE" || !canModify,
            confirm: "Mark this task done?",
            onClick: () => run(markDone(r.id), "Task done"),
          },
        ]}
      />

      <Drawer
        title="New Task"
        open={open}
        onClose={() => setOpen(false)}
        size={useDrawerSize(520)}
        footer={
          <Space style={{ width: "100%", justifyContent: "flex-end" }}>
            <Button onClick={() => setOpen(false)}>Cancel</Button>
            <Button type="primary" loading={saving} onClick={submit}>
              Assign Task
            </Button>
          </Space>
        }
      >
        <Form form={form} layout="vertical" requiredMark="optional">
          <Form.Item name="title" label="What needs to be done" rules={[{ required: true, message: "Enter the task" }]}>
            <Input placeholder="e.g. Make a sample of 2 pants" />
          </Form.Item>
          <Form.Item name="description" label="Details">
            <Input.TextArea rows={3} />
          </Form.Item>
          <Form.Item name="assignedToUserId" label="Assign to" rules={[{ required: true, message: "Pick a person" }]}>
            <Select showSearch optionFilterProp="label" placeholder="Select person" options={users} />
          </Form.Item>
          <Form.Item name="challanId" label="Challan">
            <Select allowClear showSearch optionFilterProp="label" placeholder="Optional" options={challans} />
          </Form.Item>
          <Row gutter={12}>
            <Col xs={24} sm={12}>
              <Form.Item name="dueAt" label="Due">
                <DatePicker showTime={{ format: "HH:mm" }} format="DD MMM YYYY HH:mm" style={{ width: "100%" }} inputReadOnly />
              </Form.Item>
            </Col>
            <Col xs={24} sm={12}>
              <Form.Item name="remindAt" label="Remind at">
                <DatePicker showTime={{ format: "HH:mm" }} format="DD MMM YYYY HH:mm" style={{ width: "100%" }} inputReadOnly />
              </Form.Item>
            </Col>
          </Row>
        </Form>
      </Drawer>
    </>
  );
}
