"use client";

// Design-system building blocks shared by every page, so phone, tablet and desktop stay in sync:
// PageHeader, DataTable (table on tablet/desktop, list rows on phone), TabFilter, StatusDot, Due, useRun.
import { Fragment, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  EllipsisOutlined,
  LeftOutlined,
  SearchOutlined,
} from "@ant-design/icons";
import {
  App,
  Button,
  Card,
  Dropdown,
  Empty,
  Grid,
  Input,
  Popconfirm,
  Segmented,
  Select,
  Table,
  Tabs,
} from "antd";
import type { TableColumnsType, TableProps } from "antd";
import type { ColumnType } from "antd/es/table";
import { dueLabel, fmtDate } from "@/lib/format";
import { JOB_STATUS, type JobStatus } from "@/lib/jobs";
import { FONT_DISPLAY } from "@/lib/theme";

/**
 * Screen sizes: phone < 768 px · tablet 768–1199 px · desktop ≥ 1200 px. Unknown on the server and
 * the first client render, so everything starts as desktop there and both renders match.
 */
export function useScreen() {
  const s = Grid.useBreakpoint();
  const phone = s.md === false;
  const desktop = s.xl !== false;
  return { phone, tablet: !phone && !desktop, desktop };
}

/** Right-side drawer width: full screen on phones, the given width elsewhere. */
export const useDrawerSize = (width: number) =>
  useScreen().phone ? "100%" : width;

/** Page title, subtitle and the page's main action on the right. Sub-pages get a link back to their list. */
export function PageHeader({
  title,
  subtitle,
  breadcrumbs,
  actions,
}: {
  title: string;
  subtitle?: React.ReactNode;
  /** Only the parent page is used, as a "‹ Back" link; top-level pages show none. */
  breadcrumbs?: { label: string; href?: string }[];
  actions?: React.ReactNode;
}) {
  const { phone, tablet } = useScreen();
  const back = breadcrumbs
    ?.slice(0, -1)
    .reverse()
    .find((b) => b.href && b.href !== "/");
  return (
    <div style={{ marginBottom: phone ? 16 : 20 }}>
      {back && (
        <Link
          href={back.href!}
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: 4,
            minHeight: 32,
            fontSize: 14,
            color: "#64748B",
          }}
        >
          <LeftOutlined style={{ fontSize: 11 }} /> {back.label}
        </Link>
      )}
      <div
        style={{
          display: "flex",
          flexWrap: "wrap",
          alignItems: "flex-end",
          justifyContent: "space-between",
          gap: 12,
        }}
      >
        <div style={{ flex: "1 1 200px", minWidth: 0 }}>
          <h1
            style={{
              margin: 0,
              fontFamily: FONT_DISPLAY,
              fontWeight: 700,
              lineHeight: 1.2,
              fontSize: phone ? 24 : tablet ? 26 : 28,
            }}
          >
            {title}
          </h1>
          {subtitle && (
            <div
              style={{
                marginTop: 4,
                fontSize: phone ? 14 : 15,
                color: "#64748B",
              }}
            >
              {subtitle}
            </div>
          )}
        </div>
        {actions && (
          <div style={{ display: "flex", flexWrap: "wrap", gap: 10 }}>
            {actions}
          </div>
        )}
      </div>
    </div>
  );
}

export type RowAction = {
  key: string;
  label: string;
  icon?: React.ReactNode;
  onClick?: () => void;
  href?: string;
  danger?: boolean;
  hidden?: boolean;
  /** Ask before running onClick (deletes, deactivations). */
  confirm?: string;
};

/** One action shows as a small text button; two or more tuck behind "⋯" (rows open on tap). */
export function RowActions({ actions }: { actions: RowAction[] }) {
  const router = useRouter();
  const { modal } = App.useApp();
  const visible = actions.filter((a) => !a.hidden);
  if (!visible.length) return null;
  const run = (a: RowAction) =>
    a.confirm
      ? modal.confirm({
          title: a.confirm,
          okText: "Yes",
          okButtonProps: { danger: a.danger },
          onOk: a.onClick,
        })
      : a.href
        ? router.push(a.href)
        : a.onClick?.();
  const stop = (e: React.SyntheticEvent) => e.stopPropagation();

  if (visible.length === 1) {
    const a = visible[0];
    const btn = (
      <Button
        type="text"
        danger={a.danger}
        style={a.danger ? undefined : { color: "#0369A1" }}
        onClick={a.confirm ? undefined : () => run(a)}
      >
        {a.label}
      </Button>
    );
    return (
      <span onClick={stop}>
        {a.confirm ? (
          <Popconfirm
            title={a.confirm}
            okText="Yes"
            okButtonProps={{ danger: a.danger }}
            onConfirm={a.onClick}
          >
            {btn}
          </Popconfirm>
        ) : (
          btn
        )}
      </span>
    );
  }
  return (
    <span onClick={stop}>
      <Dropdown
        trigger={["click"]}
        menu={{
          items: visible.map((a) => ({
            key: a.key,
            label: a.label,
            icon: a.icon,
            danger: a.danger,
          })),
          onClick: ({ key, domEvent }) => {
            domEvent.stopPropagation();
            run(visible.find((a) => a.key === key)!);
          },
        }}
      >
        <Button
          type="text"
          icon={<EllipsisOutlined style={{ fontSize: 18 }} />}
          aria-label="More actions"
        />
      </Dropdown>
    </span>
  );
}

/** Underline tabs used as the list filter (All · Drafts · …), with counts. */
export function TabFilter<K extends string>({
  value,
  onChange,
  items,
}: {
  value: K;
  onChange: (k: K) => void;
  items: { key: K; label: string; count?: number }[];
}) {
  return (
    <Tabs
      className="dt-tabs"
      activeKey={value}
      onChange={(k) => onChange(k as K)}
      items={items.map((i) => ({
        key: i.key,
        label: (
          <span>
            {i.label}
            {i.count !== undefined && (
              <span
                style={{ marginLeft: 6, color: "#94A3B8", fontWeight: 500 }}
              >
                {i.count}
              </span>
            )}
          </span>
        ),
      }))}
    />
  );
}

/**
 * The one list component. Tablet and desktop: a table in a white panel (columns marked
 * responsive: ["xl"] drop on tablets). Phone: the same panel with list rows — the page's
 * `mobileRow`, or the first column as the title and the rest as one muted line. Rows open on tap
 * (`onOpen`); other actions sit behind "⋯".
 */
export function DataTable<T extends object>({
  columns,
  data,
  rowKey = "id",
  totalLabel = "records",
  search,
  searchPlaceholder = "Search",
  toolbar,
  actions,
  onOpen,
  mobileRow,
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
  /** Usually a TabFilter; sits left of the search. */
  toolbar?: React.ReactNode;
  actions?: (row: T) => RowAction[];
  /** Tapping a row opens the record. Without it, a row's "view" action is what a tap does. */
  onOpen?: (row: T) => void;
  /** Phone layout of one row. */
  mobileRow?: (row: T) => React.ReactNode;
  /** Heading and right-hand extra for the surrounding panel (detail pages). */
  cardTitle?: React.ReactNode;
  cardExtra?: React.ReactNode;
} & Omit<TableProps<T>, "columns" | "dataSource" | "rowKey" | "title">) {
  const router = useRouter();
  const [q, setQ] = useState("");
  const [searching, setSearching] = useState(false);
  const [shown, setShown] = useState(20); // phone: show 20 at a time
  const { phone, desktop } = useScreen();
  const rows = useMemo(() => {
    const needle = q.trim().toLowerCase();
    return needle && search
      ? data.filter((r) => search(r).toLowerCase().includes(needle))
      : data;
  }, [data, q, search]);
  // Opening is the row tap, so "view" never shows as a separate action.
  const rowActions = (r: T) =>
    actions ? actions(r).filter((a) => a.key !== "view") : [];
  const openOf = (r: T): (() => void) | undefined => {
    if (onOpen) return () => onOpen(r);
    const v = actions?.(r).find((a) => a.key === "view" && !a.hidden);
    return v && (v.href ? () => router.push(v.href!) : v.onClick);
  };
  const hasActions =
    !!actions && data.some((r) => rowActions(r).some((a) => !a.hidden));

  const searchBox = (
    <Input
      allowClear
      autoFocus={!desktop}
      prefix={<SearchOutlined style={{ color: "#94A3B8" }} />}
      placeholder={searchPlaceholder}
      onChange={(e) => setQ(e.target.value)}
      style={{ width: desktop ? 260 : "100%" }}
    />
  );
  // Desktop: tabs and a search box on one line. Tablet/phone: a search icon that opens the box below.
  const toolbarBar = (search || toolbar) && (
    <div style={{ borderBottom: "1px solid #EEF2F6" }}>
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 12,
          padding: toolbar ? "0 8px 0 16px" : "12px 16px",
        }}
      >
        <div style={{ flex: 1, minWidth: 0 }}>
          {toolbar ?? (desktop || !search ? null : searchBox)}
        </div>
        {search &&
          toolbar &&
          (desktop ? (
            searchBox
          ) : (
            <Button
              type="text"
              icon={<SearchOutlined />}
              aria-label="Search"
              onClick={() => setSearching((s) => !s)}
            />
          ))}
        {search && !toolbar && desktop && searchBox}
      </div>
      {search && toolbar && !desktop && searching && (
        <div style={{ padding: "0 16px 12px" }}>{searchBox}</div>
      )}
    </div>
  );
  const panel = (children: React.ReactNode) => (
    <Card
      title={cardTitle}
      extra={cardExtra}
      styles={{ body: { padding: 0 } }}
      style={{ marginBottom: cardTitle ? 16 : 0 }}
    >
      {toolbarBar}
      {children}
    </Card>
  );

  if (phone) {
    const plain = columns.filter(
      (c): c is ColumnType<T> =>
        !("children" in c) &&
        !c.hidden &&
        !(c.responsive && c.responsive.every((b) => b === "xl" || b === "xxl")),
    );
    const cell = (c: ColumnType<T>, r: T, i: number) => {
      const value = c.dataIndex
        ? (r as Record<string, unknown>)[c.dataIndex as string]
        : undefined;
      return c.render
        ? (c.render(value, r, i) as React.ReactNode)
        : ((value ?? "—") as React.ReactNode);
    };
    const generic = (r: T, i: number) => (
      <div style={{ display: "flex", flexDirection: "column", gap: 3 }}>
        <div style={{ fontSize: 15, fontWeight: 500 }}>
          {cell(plain[0], r, i)}
        </div>
        <div style={{ fontSize: 13, color: "#64748B" }}>
          {plain.slice(1).map((c, ci) => (
            <Fragment key={String(c.key ?? c.dataIndex ?? ci)}>
              {ci > 0 && " · "}
              {c.title ? <span>{c.title as React.ReactNode} </span> : null}
              <span style={{ color: "#334155" }}>{cell(c, r, i)}</span>
            </Fragment>
          ))}
        </div>
      </div>
    );
    const keyOf = (r: T, i: number) =>
      typeof rowKey === "function"
        ? rowKey(r, i)
        : String((r as Record<string, unknown>)[rowKey as string] ?? i);
    return panel(
      <>
        {rows.length === 0 ? (
          <Empty style={{ padding: 32 }} />
        ) : (
          rows.slice(0, shown).map((r, i) => {
            const open = openOf(r);
            return (
              <div
                key={keyOf(r, i)}
                role={open ? "button" : undefined}
                tabIndex={open ? 0 : undefined}
                onClick={open}
                onKeyDown={
                  open ? (e) => e.key === "Enter" && open() : undefined
                }
                style={{
                  display: "flex",
                  gap: 8,
                  padding: "14px 8px 14px 16px",
                  borderTop: i ? "1px solid #F1F5F9" : undefined,
                  cursor: open ? "pointer" : undefined,
                }}
              >
                <div style={{ flex: 1, minWidth: 0 }}>
                  {mobileRow ? mobileRow(r) : generic(r, i)}
                </div>
                {hasActions && <RowActions actions={rowActions(r)} />}
              </div>
            );
          })
        )}
        {rows.length > shown && (
          <div style={{ padding: "8px 16px 14px" }}>
            <Button block onClick={() => setShown((n) => n + 20)}>
              Show more ({rows.length - shown})
            </Button>
          </div>
        )}
      </>,
    );
  }

  const cols: TableColumnsType<T> = hasActions
    ? [
        ...columns,
        {
          key: "actions",
          title: "",
          align: "right",
          width: 56,
          render: (_, r) => <RowActions actions={rowActions(r)} />,
        },
      ]
    : columns;
  return panel(
    <Table<T>
      columns={cols}
      dataSource={rows}
      rowKey={rowKey}
      size="middle"
      scroll={{ x: "max-content" }}
      onRow={(r) => {
        const open = openOf(r);
        return open ? { onClick: open, style: { cursor: "pointer" } } : {};
      }}
      pagination={
        rest.pagination === false
          ? false
          : {
              pageSize: 20,
              showSizeChanger: false,
              hideOnSinglePage: true,
              showTotal: (t) => `${t} ${totalLabel}`,
            }
      }
      {...rest}
    />,
  );
}

/** Status as a small coloured dot plus text (never a filled tag). */
export const StatusDot = ({
  color,
  label,
  size = 8,
}: {
  color: string;
  label: React.ReactNode;
  size?: number;
}) => (
  <span
    style={{
      display: "inline-flex",
      alignItems: "center",
      gap: 8,
      color: "#334155",
      whiteSpace: "nowrap",
    }}
  >
    <span
      style={{
        width: size,
        height: size,
        borderRadius: "50%",
        background: color,
        flexShrink: 0,
      }}
    />
    {label}
  </span>
);

export const JobStatusDot = ({
  status,
  size,
}: {
  status: JobStatus;
  size?: number;
}) => (
  <StatusDot
    color={JOB_STATUS[status].color}
    label={JOB_STATUS[status].label}
    size={size}
  />
);

const DUE_TONE = {
  overdue: "#B91C1C",
  soon: "#B45309",
  later: "#64748B",
} as const;

/** "Overdue 2 days" red · "Today"/"Tomorrow"/"In 3 days" amber · later grey · done: the plain date. */
export function Due({
  at,
  done,
}: {
  at: Date | string | null;
  done?: boolean;
}) {
  if (!at) return <span style={{ color: "#94A3B8" }}>—</span>;
  const d = new Date(at);
  if (done)
    return (
      <span style={{ color: "#64748B", whiteSpace: "nowrap" }}>
        {fmtDate(d)}
      </span>
    );
  const l = dueLabel(d);
  return (
    <span
      style={{
        color: DUE_TONE[l.tone],
        fontWeight: l.tone === "later" ? 400 : 500,
        whiteSpace: "nowrap",
      }}
    >
      {l.text}
    </span>
  );
}

/**
 * Picks one item of a master list (Masters page): buttons for a few, a dropdown for more.
 * Hidden items only show when a record already uses one.
 */
export function MasterPicker({
  options,
  value,
  onChange,
  disabled,
}: {
  options: { id: string; name: string; isActive: boolean }[];
  value?: string;
  onChange?: (id: string) => void;
  disabled?: boolean;
}) {
  const shown = options.filter((o) => o.isActive || o.id === value).map((o) => ({ value: o.id, label: o.name }));
  return shown.length <= 4 ? (
    <Segmented block disabled={disabled} value={value} onChange={(v) => onChange?.(v as string)} options={shown} />
  ) : (
    <Select disabled={disabled} value={value} onChange={onChange} options={shown} style={{ width: "100%" }} />
  );
}

export const Ledger = ({ children }: { children: React.ReactNode }) => (
  <span className="ledger">{children}</span>
);

/** Runs a Server Action that returns {error?}: toasts the result and refreshes the page data. */
export function useRun() {
  const { message } = App.useApp();
  const router = useRouter();
  return async (
    p: Promise<{ error?: string } | void | undefined>,
    ok: string,
  ) => {
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
      if ((e as { digest?: string })?.digest?.startsWith("NEXT_REDIRECT"))
        throw e;
      message.error(
        "Something went wrong. Check your connection and try again.",
      );
      return false;
    }
  };
}
