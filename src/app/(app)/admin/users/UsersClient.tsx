"use client";

import { useEffect, useState } from "react";
import { CheckCircleOutlined, EditOutlined, KeyOutlined, PlusOutlined, StopOutlined } from "@ant-design/icons";
import { Button, Drawer, Form, Input, Modal, Select, Space, Tag } from "antd";
import type { TableColumnsType } from "antd";
import { DataTable, PageHeader, useRun, useDrawerSize } from "@/components/ui";
import { createUser, resetPassword, setActive, updateUser } from "./actions";

type Role = "ADMIN" | "STAFF" | "JOBBER";
type Row = { id: string; username: string; name: string; role: Role; jobberId: string | null; jobber: string | null; isActive: boolean; locked: boolean };

const ROLE_OPTIONS = [
  { value: "STAFF", label: "Staff (office)" },
  { value: "JOBBER", label: "Jobber (own jobs only)" },
  { value: "ADMIN", label: "Admin (full access)" },
];
const ROLE_COLOR: Record<Role, string> = { ADMIN: "gold", STAFF: "blue", JOBBER: "purple" };

export function UsersClient({
  rows,
  meId,
  canWrite,
  canModify,
  jobbers,
}: {
  rows: Row[];
  meId: string;
  canWrite: boolean;
  canModify: boolean;
  jobbers: { value: string; label: string }[];
}) {
  const run = useRun();
  const [editing, setEditing] = useState<Row | null | undefined>(undefined);
  const [resetting, setResetting] = useState<Row | null>(null);
  const [password, setPassword] = useState("");
  const [saving, setSaving] = useState(false);
  const [form] = Form.useForm();
  const role = Form.useWatch("role", form);

  useEffect(() => {
    if (editing === undefined) return;
    form.resetFields();
    form.setFieldsValue(editing ?? { role: "STAFF" });
  }, [editing, form]);

  async function submit() {
    const v = await form.validateFields();
    setSaving(true);
    const ok = await run(editing ? updateUser(editing.id, v) : createUser(v), editing ? "User updated" : "User created");
    setSaving(false);
    if (ok) setEditing(undefined);
  }

  const columns: TableColumnsType<Row> = [
    { title: "Name", dataIndex: "name" },
    { title: "User ID", dataIndex: "username", render: (u) => <span className="ledger">{u}</span> },
    { title: "Role", dataIndex: "role", render: (r: Role) => <Tag color={ROLE_COLOR[r]}>{r}</Tag> },
    { title: "Jobber", dataIndex: "jobber", render: (j) => j ?? "—" },
    {
      title: "Status",
      dataIndex: "isActive",
      render: (a, r) => (
        <Space size={4}>
          <Tag color={a ? "green" : "default"}>{a ? "Active" : "Inactive"}</Tag>
          {r.locked && <Tag color="red">Locked</Tag>}
        </Space>
      ),
    },
  ];

  return (
    <>
      <PageHeader
        title="Users"
        subtitle="Logins for office staff and jobbers"
        breadcrumbs={[{ label: "Administration" }, { label: "Users" }]}
        actions={
          canWrite && (
            <Button type="primary" icon={<PlusOutlined />} onClick={() => setEditing(null)}>
              New User
            </Button>
          )
        }
      />
      <DataTable<Row>
        columns={columns}
        data={rows}
        totalLabel="users"
        search={(r) => `${r.name} ${r.username} ${r.role} ${r.jobber ?? ""}`}
        searchPlaceholder="Search name or user ID"
        actions={(r) => [
          { key: "edit", label: "Edit", icon: <EditOutlined />, hidden: !canModify, onClick: () => setEditing(r) },
          { key: "pw", label: "Reset password", icon: <KeyOutlined />, hidden: !canModify, onClick: () => setResetting(r) },
          {
            key: "active",
            label: r.isActive ? "Deactivate" : "Activate",
            icon: r.isActive ? <StopOutlined /> : <CheckCircleOutlined />,
            danger: r.isActive,
            hidden: !canModify || r.id === meId,
            confirm: r.isActive ? `Deactivate ${r.name}? They will be signed out.` : `Activate ${r.name}?`,
            onClick: () => run(setActive(r.id, !r.isActive), r.isActive ? "User deactivated" : "User activated"),
          },
        ]}
      />

      <Drawer
        title={editing ? `Edit ${editing.name}` : "New User"}
        open={editing !== undefined}
        onClose={() => setEditing(undefined)}
        size={useDrawerSize(480)}
        footer={
          <Space style={{ width: "100%", justifyContent: "flex-end" }}>
            <Button onClick={() => setEditing(undefined)}>Cancel</Button>
            <Button type="primary" loading={saving} onClick={submit}>
              Submit
            </Button>
          </Space>
        }
      >
        <Form form={form} layout="vertical" requiredMark="optional">
          {!editing && (
            <Form.Item
              name="username"
              label="User ID"
              normalize={(v: string) => v?.toLowerCase()}
              rules={[{ required: true, pattern: /^[a-z0-9._-]{3,30}$/, message: "3–30 letters, digits, . _ -" }]}
            >
              <Input autoCapitalize="none" />
            </Form.Item>
          )}
          <Form.Item name="name" label="Name" rules={[{ required: true, message: "Enter a name" }]}>
            <Input />
          </Form.Item>
          <Form.Item name="role" label="Role" rules={[{ required: true }]}>
            <Select options={ROLE_OPTIONS} disabled={editing?.id === meId} />
          </Form.Item>
          {role === "JOBBER" && (
            <Form.Item name="jobberId" label="Jobber" rules={[{ required: true, message: "Pick the jobber for this login" }]}>
              <Select showSearch optionFilterProp="label" options={jobbers} />
            </Form.Item>
          )}
          {!editing && (
            <Form.Item name="password" label="Password" rules={[{ required: true, min: 8, message: "At least 8 characters" }]}>
              <Input.Password autoComplete="new-password" />
            </Form.Item>
          )}
        </Form>
      </Drawer>

      <Modal
        title={`Reset password · ${resetting?.name ?? ""}`}
        open={!!resetting}
        okText="Set password"
        okButtonProps={{ disabled: password.length < 8 }}
        onCancel={() => setResetting(null)}
        onOk={async () => {
          if (await run(resetPassword(resetting!.id, password), "Password reset")) {
            setResetting(null);
            setPassword("");
          }
        }}
      >
        <Input.Password placeholder="New password (8+ characters)" value={password} onChange={(e) => setPassword(e.target.value)} />
      </Modal>
    </>
  );
}
