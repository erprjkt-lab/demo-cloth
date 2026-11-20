"use client";

import { useState } from "react";
import { SaveOutlined, UndoOutlined } from "@ant-design/icons";
import { Button, Card, Checkbox, Col, Empty, Popconfirm, Row, Select, Table, Tag, Typography } from "antd";
import type { TableColumnsType } from "antd";
import { PageHeader, useRun } from "@/components/ui";
import { ACTIONS, MODULES, type Action, type ModuleKey, type PermMap } from "@/lib/permissions";
import { resetPermissions, savePermissions } from "./actions";

type User = { id: string; label: string; custom: boolean; perms: PermMap };
type ModuleRow = (typeof MODULES)[number];

const LABEL: Record<Action, string> = { read: "Read", write: "Write", modify: "Modify", delete: "Delete", approve: "Approve" };
const NotApplicable = () => <Typography.Text style={{ color: "rgba(0,0,0,0.18)" }}>—</Typography.Text>;

/** CoreFlow's Permissions page: pick a user, tick Read / Write / Modify / Delete per menu. */
export function PermissionsClient({ users, canGrant }: { users: User[]; canGrant: boolean }) {
  const run = useRun();
  const [userId, setUserId] = useState<string>();
  const [edits, setEdits] = useState<PermMap | null>(null);
  const [saving, setSaving] = useState(false);
  const user = users.find((u) => u.id === userId);
  const perms = edits ?? user?.perms ?? {};

  const has = (m: ModuleKey, a: Action) => perms[m]?.includes(a) ?? false;
  const set = (m: ModuleRow, actions: Action[]) => setEdits({ ...perms, [m.key]: actions });
  const toggle = (m: ModuleRow, a: Action, on: boolean) => {
    const cur = perms[m.key] ?? [];
    // Anything beyond Read needs Read; clearing Read clears the rest.
    if (a === "read" && !on) return set(m, []);
    set(m, on ? [...new Set([...cur, a, "read" as const])] : cur.filter((x) => x !== a));
  };

  const granted = MODULES.reduce((n, m) => n + (perms[m.key]?.length ?? 0), 0);
  const total = MODULES.reduce((n, m) => n + m.actions.length, 0);

  const columns: TableColumnsType<ModuleRow> = [
    { title: "Menu", dataIndex: "label" },
    {
      title: "All",
      key: "all",
      width: 72,
      align: "center",
      render: (_, m) => {
        const n = perms[m.key]?.length ?? 0;
        return (
          <Checkbox
            checked={n === m.actions.length}
            indeterminate={n > 0 && n < m.actions.length}
            disabled={!canGrant}
            onChange={(e) => set(m, e.target.checked ? [...m.actions] : [])}
          />
        );
      },
    },
    ...ACTIONS.map((a) => ({
      title: LABEL[a],
      key: a,
      width: 96,
      align: "center" as const,
      render: (_: unknown, m: ModuleRow) =>
        (m.actions as readonly Action[]).includes(a) ? (
          <Checkbox checked={has(m.key, a)} disabled={!canGrant} onChange={(e) => toggle(m, a, e.target.checked)} />
        ) : (
          <NotApplicable />
        ),
    })),
  ];

  return (
    <div style={{ maxWidth: 1080, margin: "0 auto" }}>
      <PageHeader
        title="Permissions"
        subtitle="Grant per-menu access for one user. Admins always have full access. Jobbers only ever see their own jobs, challans and tasks."
        breadcrumbs={[{ label: "Administration" }, { label: "Permissions" }]}
        actions={
          canGrant &&
          user && (
            <>
              {user.custom && (
                <Popconfirm title="Go back to this role's default access?" onConfirm={() => run(resetPermissions(user.id), "Reset to role defaults").then((ok) => ok && setEdits(null))}>
                  <Button icon={<UndoOutlined />}>Reset to role defaults</Button>
                </Popconfirm>
              )}
              <Button
                type="primary"
                icon={<SaveOutlined />}
                loading={saving}
                disabled={!edits}
                onClick={async () => {
                  setSaving(true);
                  if (await run(savePermissions(user.id, edits), "Permissions saved")) setEdits(null);
                  setSaving(false);
                }}
              >
                Save changes
              </Button>
            </>
          )
        }
      />

      <Card style={{ marginBottom: 12 }}>
        <Row gutter={[12, 12]} align="middle">
          <Col>
            <Typography.Text type="secondary">User</Typography.Text>
          </Col>
          <Col xs={24} sm={16} md={10}>
            <Select
              showSearch
              optionFilterProp="label"
              placeholder="Select a user..."
              style={{ width: "100%" }}
              value={userId}
              onChange={(v) => {
                setUserId(v);
                setEdits(null);
              }}
              options={users.map((u) => ({ value: u.id, label: u.label }))}
            />
          </Col>
          {user && (
            <Col flex="auto" style={{ textAlign: "right" }}>
              <Tag color={user.custom || edits ? "orange" : "default"}>{user.custom || edits ? "Custom access" : "Role defaults"}</Tag>
              <Typography.Text type="secondary">
                {granted} of {total} permissions granted
              </Typography.Text>
            </Col>
          )}
        </Row>
      </Card>

      <Card styles={{ body: { padding: 0 } }}>
        {user ? (
          <Table<ModuleRow> rowKey="key" size="small" pagination={false} columns={columns} dataSource={[...MODULES]} scroll={{ x: "max-content" }} />
        ) : (
          <Empty description="Select a user to see their menu permissions." style={{ padding: "64px 0" }} />
        )}
      </Card>
    </div>
  );
}
