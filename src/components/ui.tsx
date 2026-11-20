"use client";

// CoreFlow building blocks: PageHeader, DataTable (Card + antd Table + row actions), JobStatusTag, useRun.
import { Fragment, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { EllipsisOutlined } from "@ant-design/icons";
import { App, Breadcrumb, Button, Card, Dropdown, Empty, Grid, Input, Popconfirm, Table, Tag, Tooltip, Typography } from "antd";
import type { TableColumnsType, TableProps } from "antd";
import type { ColumnType } from "antd/es/table";
import { JOB_STATUS, type JobStatus } from "@/lib/jobs";

export function PageHeader({
  title,
  subtitle,
  breadcrumbs,
  actions,
}: {
  title: string;
  subtitle?: React.ReactNode;
  breadcrumbs?: { label: string; href?: string }[];
  actions?: React.ReactNode;
}) {
  return (
    <div style={{ marginBottom: 12 }}>
      {breadcrumbs && (
        <Breadcrumb
          style={{ marginBottom: 4, fontSize: 13 }}
          items={breadcrumbs.map((b) => ({ title: b.href ? <Link href={b.href}>{b.label}</Link> : b.label }))}
        />
      )}
      <div style={{ display: "flex", flexWrap: "wrap", alignItems: "center", justifyContent: "space-between", gap: 10 }}>
        <div style={{ flex: "1 1 180px", minWidth: 160 }}>
          <Typography.Title level={3} style={{ margin: 0, fontSize: 20 }}>
            {title}
          </Typography.Title>
          {subtitle && (
            <Typography.Text type="secondary" style={{ display: "block", marginTop: 2, fontSize: 13 }}>
              {subtitle}
            </Typography.Text>
          )}
        </div>
        {actions && <div style={{ display: "flex", flexWrap: "wrap", alignItems: "center", gap: 8 }}>{actions}</div>}
      </div>
    </div>
  );
}

export type RowAction = {
  key: string;
  label: string;
  icon: React.ReactNode;
  onClick?: () => void;
  href?: string;
  danger?: boolean;
  hidden?: boolean;
  /** Ask before running onClick (deletes, deactivations). */
  confirm?: string;
};

/**
 * Screen classes used across the app. Unknown on the server and the first client render, so
 * everything starts as desktop there and both renders match.
 * phone < 768px · cards < 992px (phones and portrait tablets) · tablet 768–1199px.
 */
export function useScreen() {
  const s = Grid.useBreakpoint();
  return { phone: s.md === false, cards: s.lg === false, tablet: s.md === true && s.xl === false };
}

/** Right-side drawer width: full screen on phones, the given width elsewhere. */
export const useDrawerSize = (width: number) => (useScreen().phone ? "100%" : width);

/**
 * Desktop: small icon buttons with tooltips, on one line. Cards (touch): the first two as
 * labelled buttons, easy to tap, and the rest in a "⋯" menu, as in CoreFlow's mobile cards.
 */
function RowActions({ actions, labelled = false }: { actions: RowAction[]; labelled?: boolean }) {
  const router = useRouter();
  const { modal } = App.useApp();
  const visible = actions.filter((a) => !a.hidden);
  const run = (a: RowAction) =>
    a.confirm
      ? modal.confirm({ title: a.confirm, okText: "Yes", okButtonProps: { danger: a.danger }, onOk: a.onClick })
      : a.href
        ? router.push(a.href)
        : a.onClick?.();
  const shown = labelled ? visible.slice(0, visible.length > 3 ? 2 : 3) : visible;
  const more = labelled ? visible.slice(shown.length) : [];
  return (
    <div
      style={{ display: "flex", flexWrap: labelled ? "wrap" : "nowrap", justifyContent: labelled ? "flex-start" : "flex-end", gap: labelled ? 8 : 2 }}
      onClick={(e) => e.stopPropagation()}
    >
      {more.length > 0 && (
        <Dropdown
          trigger={["click"]}
          menu={{
            items: more.map((a) => ({ key: a.key, label: a.label, icon: a.icon, danger: a.danger })),
            onClick: ({ key }) => run(more.find((a) => a.key === key)!),
          }}
        >
          <Button icon={<EllipsisOutlined />} aria-label="More actions" style={{ order: 1 }} />
        </Dropdown>
      )}
      {shown.map((a) => {
          const btn = (
            <Button
              type={labelled ? "default" : "text"}
              size={labelled ? "middle" : "small"}
              danger={a.danger}
              icon={a.icon}
              aria-label={a.label}
              style={labelled || a.danger ? undefined : { color: "#0289C3" }}
              onClick={a.confirm ? undefined : a.href ? () => router.push(a.href!) : a.onClick}
            >
              {labelled && a.label}
            </Button>
          );
          const withConfirm = a.confirm ? (
            <Popconfirm key={a.key} title={a.confirm} okText="Yes" okButtonProps={{ danger: a.danger }} onConfirm={a.onClick}>
              {btn}
            </Popconfirm>
          ) : (
            <span key={a.key}>{btn}</span>
          );
          return labelled ? withConfirm : <Tooltip key={a.key} title={a.label}>{withConfirm}</Tooltip>;
        })}
    </div>
  );
}

/** antd Table inside a Card, with a search box, paging and an actions column, as in CoreFlow. */
export function DataTable<T extends object>({
  columns,
  data,
  rowKey = "id",
  totalLabel = "records",
  search,
  searchPlaceholder = "Search",
  toolbar,
  actions,
  cardTitle,
  cardExtra,
  ...rest
}: {
  columns: TableColumnsType<T>;
  data: T[];
  rowKey?: TableProps<T>["rowKey"];
  totalLabel?: string;
  /** Text a row is matched against by the search box; leave out to hide the box. */
  search?: (row: T) => string;
  searchPlaceholder?: string;
  toolbar?: React.ReactNode;
  actions?: (row: T) => RowAction[];
  /** Heading and right-hand extra for the surrounding Card (detail pages). */
  cardTitle?: React.ReactNode;
  cardExtra?: React.ReactNode;
} & Omit<TableProps<T>, "columns" | "dataSource" | "rowKey" | "title">) {
  const [q, setQ] = useState("");
  const [shown, setShown] = useState(20); // cards: show 20 at a time
  const rows = useMemo(() => {
    const needle = q.trim().toLowerCase();
    return needle && search ? data.filter((r) => search(r).toLowerCase().includes(needle)) : data;
  }, [data, q, search]);

  const { phone, cards } = useScreen();
  const cols: TableColumnsType<T> = actions
    ? [...columns, { key: "actions", title: "", align: "right", fixed: "right", width: 1, render: (_, r) => <RowActions actions={actions(r)} /> }]
    : columns;

  const toolbarBar = (search || toolbar) && (
    <div style={{ display: "flex", flexWrap: "wrap", gap: 8, padding: 12, borderBottom: "1px solid #EEF2F6" }}>
      {search && (
        <Input.Search
          allowClear
          placeholder={searchPlaceholder}
          onChange={(e) => setQ(e.target.value)}
          style={{ maxWidth: phone ? undefined : 320, flex: "1 1 200px" }}
        />
      )}
      {toolbar}
    </div>
  );

  // Phones and portrait tablets get cards (as in CoreFlow's DataTable), nothing to scroll sideways:
  // first column as the heading with the Status column beside it, the rest as label/value pairs,
  // labelled action buttons at the bottom. Two cards per row on tablets. Columns marked as only
  // worth showing on wide screens (lg and up) are left out to keep cards short.
  if (cards) {
    const plain = columns.filter(
      (c): c is ColumnType<T> =>
        !("children" in c) && !c.hidden && !(c.responsive && c.responsive.every((b) => b === "lg" || b === "xl" || b === "xxl")),
    );
    const isStatus = (c: ColumnType<T>) => c.dataIndex === "status";
    const statusCol = plain.find(isStatus);
    const cell = (c: ColumnType<T>, r: T, i: number) => {
      const value = c.dataIndex ? (r as Record<string, unknown>)[c.dataIndex as string] : undefined;
      return c.render ? (c.render(value, r, i) as React.ReactNode) : ((value ?? "—") as React.ReactNode);
    };
    const keyOf = (r: T, i: number) => (typeof rowKey === "function" ? rowKey(r, i) : String((r as Record<string, unknown>)[rowKey as string] ?? i));
    const pageRows = rows.slice(0, shown);
    return (
      <Card title={cardTitle} extra={cardExtra} size={cardTitle ? "small" : undefined} styles={{ body: { padding: 0 } }} style={{ marginBottom: cardTitle ? 12 : 0 }}>
        {toolbarBar}
        {rows.length === 0 ? (
          <Empty style={{ padding: 32 }} />
        ) : (
          <div
            style={{
              display: "grid",
              gridTemplateColumns: phone ? "1fr" : "repeat(2, minmax(0, 1fr))",
              gap: phone ? 0 : 12,
              padding: phone ? 0 : 12,
            }}
          >
            {pageRows.map((r, i) => (
              <div
                key={keyOf(r, i)}
                style={
                  phone
                    ? { padding: "12px 14px", borderBottom: "1px solid #EEF2F6" }
                    : { padding: "12px 14px", border: "1px solid #E2E8F0", borderRadius: 10 }
                }
              >
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 8, marginBottom: 8 }}>
                  <div style={{ fontWeight: 600, fontSize: 15, minWidth: 0 }}>{cell(plain[0], r, i)}</div>
                  {statusCol && <div style={{ flexShrink: 0 }}>{cell(statusCol, r, i)}</div>}
                </div>
                <div style={{ display: "grid", gridTemplateColumns: "auto 1fr", gap: "6px 12px", fontSize: 14 }}>
                  {plain
                    .slice(1)
                    .filter((c) => !isStatus(c))
                    .map((c, ci) => (
                      <Fragment key={String(c.key ?? c.dataIndex ?? ci)}>
                        <span style={{ color: "#64748B" }}>{c.title as React.ReactNode}</span>
                        <span style={{ minWidth: 0, overflowWrap: "anywhere" }}>{cell(c, r, i)}</span>
                      </Fragment>
                    ))}
                </div>
                {actions && actions(r).some((a) => !a.hidden) && (
                  <div style={{ marginTop: 10 }}>
                    <RowActions actions={actions(r)} labelled />
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "10px 14px", fontSize: 13, color: "#94A3B8" }}>
          <span>
            {Math.min(shown, rows.length)} of {rows.length} {totalLabel}
          </span>
          {shown < rows.length && <Button onClick={() => setShown((n) => n + 20)}>Show more</Button>}
        </div>
      </Card>
    );
  }

  return (
    <Card title={cardTitle} extra={cardExtra} size={cardTitle ? "small" : undefined} styles={{ body: { padding: 0 } }} style={{ marginBottom: cardTitle ? 12 : 0 }}>
      {toolbarBar}
      <Table<T>
        columns={cols}
        dataSource={rows}
        rowKey={rowKey}
        size="middle"
        scroll={{ x: "max-content" }}
        pagination={rest.pagination === false ? false : {
          pageSize: 20,
          showSizeChanger: true,
          hideOnSinglePage: rows.length <= 20,
          showTotal: (t) => `${t} ${totalLabel}`,
        }}
        {...rest}
      />
    </Card>
  );
}

export const JobStatusTag = ({ status }: { status: JobStatus }) => (
  <Tag color={JOB_STATUS[status].color} style={{ marginInlineEnd: 0 }}>
    {JOB_STATUS[status].label}
  </Tag>
);

export const Ledger = ({ children }: { children: React.ReactNode }) => <span className="ledger">{children}</span>;

/** Runs a Server Action that returns {error?}: toasts the result and refreshes the page data. */
export function useRun() {
  const { message } = App.useApp();
  const router = useRouter();
  return async (p: Promise<{ error?: string } | void | undefined>, ok: string) => {
    try {
      const r = await p;
      if (r && "error" in r && r.error) {
        message.error(r.error);
        return false;
      }
      message.success(ok);
      router.refresh();
      return true;
    } catch (e) {
      // redirect() from a Server Action surfaces here as a navigation, not an error.
      if ((e as { digest?: string })?.digest?.startsWith("NEXT_REDIRECT")) throw e;
      message.error("Something went wrong. Check your connection and try again.");
      return false;
    }
  };
}
