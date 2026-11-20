"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import dayjs from "dayjs";
import { CloseOutlined, DeleteOutlined, EditOutlined, HistoryOutlined, SwapOutlined } from "@ant-design/icons";
import { Alert, App, Button, DatePicker, Drawer, Dropdown, Form, Input, InputNumber, Modal, Popconfirm, Select, Space, Timeline } from "antd";
import type { TableColumnsType } from "antd";
import { DataTable, Due, JobStatusDot, Ledger, PageHeader, StatusDot, TabFilter, useDrawerSize, useRun, useScreen } from "@/components/ui";
import { fmtDate, fmtDateTime } from "@/lib/format";
import { FONT_DISPLAY } from "@/lib/theme";
import {
  canSetStatus,
  JOB_STATUS,
  JOB_STEPS,
  jobNo,
  NEXT_STEP,
  nextStatus,
  QC_ISSUE_LABEL,
  QC_RESULT,
  TRANSFERABLE,
  type JobStatus,
  type QcResult,
} from "@/lib/jobs";
import type { Action } from "@/lib/permissions";
import { PushToggle } from "../tasks/PushToggle";
import { approveJob, deleteJob, getJobDetail, resolveQcIssue, saveJob, setJobStatus } from "./actions";
import { QcModal } from "./QcModal";

type Role = "ADMIN" | "STAFF" | "JOBBER";
type Option = { id: string; name: string };
export type JobRow = {
  id: string;
  no: number;
  title: string;
  jobberId: string;
  jobber: string;
  catalogId: string | null;
  catalog: string | null;
  pieces: number | null;
  dueDate: string | null;
  notes: string | null;
  status: JobStatus;
  challans: number;
  lastQc: QcResult | null;
  received: number | null;
  rejected: number | null;
  notReceived: number | null;
  openIssues: number;
  /** Rework asked for in the last QC, in one line; null when there's nothing to fix. */
  fix: string | null;
  updatedAt: Date;
};
type Detail = NonNullable<Awaited<ReturnType<typeof getJobDetail>>>;

const n = (v: number) => v.toLocaleString("en-IN");
const WITH_JOBBER: JobStatus[] = ["ASSIGNED", "MATERIAL_RECEIVED", "IN_PROGRESS", "FINISHED"];

type Tab = "all" | "drafts" | "with" | "receive" | "completed" | "issues" | "todo" | "done";
const IN_TAB: Record<Tab, (r: JobRow) => boolean> = {
  all: () => true,
  drafts: (r) => r.status === "DRAFT",
  with: (r) => WITH_JOBBER.includes(r.status),
  receive: (r) => r.status === "SENT_BACK",
  completed: (r) => r.status === "COMPLETED",
  issues: (r) => r.openIssues > 0,
  todo: (r) => r.status !== "COMPLETED",
  done: (r) => r.status === "COMPLETED",
};

/** "990 received · 5 rejected · 10 not received", or "· all accepted"; null before the first QC. */
function qcLine(r: Pick<JobRow, "received" | "rejected" | "notReceived">) {
  if (r.received === null) return null;
  const short = [r.rejected ? `${n(r.rejected)} rejected` : "", r.notReceived ? `${n(r.notReceived)} not received` : ""].filter(Boolean);
  return `${n(r.received)} received · ${short.length ? short.join(" · ") : "all accepted"}`;
}

/** Who has the job now, shown after the status ("Sent back · waiting for you"). */
function whoseTurn(r: JobRow, office: boolean) {
  if (r.status === "COMPLETED") return r.lastQc ? QC_RESULT[r.lastQc].label : null;
  if (r.status === "DRAFT") return "waiting for approval";
  const by = NEXT_STEP[r.status]?.by;
  if (office) return by === "JOBBER" ? `with ${r.jobber}` : "waiting for you";
  return by === "JOBBER" ? "your turn" : "with the office";
}

const muted: React.CSSProperties = { fontSize: 13, color: "#64748B" };
const Num = ({ v, tone }: { v: number | null; tone?: string }) =>
  v === null ? <span style={{ color: "#94A3B8" }}>—</span> : <Ledger><span style={{ color: v > 0 ? tone : undefined, fontWeight: v > 0 && tone ? 600 : undefined }}>{n(v)}</span></Ledger>;

export function JobsClient({
  rows,
  role,
  perms,
  canTransfer,
  initialViewId,
  initialTab,
  openNew,
  jobbers,
  catalogs,
}: {
  rows: JobRow[];
  role: Role;
  perms: Action[];
  canTransfer: boolean;
  initialViewId?: string;
  /** From the dashboard links (?tab=drafts, ?new=1). */
  initialTab?: string;
  openNew?: boolean;
  jobbers: Option[];
  catalogs: Option[];
}) {
  const run = useRun();
  const { desktop } = useScreen();
  const office = role !== "JOBBER";
  const canApprove = office && perms.includes("approve");
  // Everything is listed by default, completed jobs included; the tabs narrow it down.
  const [tab, setTab] = useState<Tab>(initialTab && initialTab in IN_TAB ? (initialTab as Tab) : office ? "all" : "todo");
  const [qcJob, setQcJob] = useState<JobRow | null>(null);
  const [editing, setEditing] = useState<JobRow | null | undefined>(undefined); // undefined = closed, null = new
  const [viewingId, setViewingId] = useState<string | null>(null);
  // Always the latest row, so a refresh after an action updates the open drawer too.
  const viewing = rows.find((r) => r.id === viewingId) ?? null;
  // Opened after hydration (a drawer rendered open on the server wouldn't match the client).
  useEffect(() => {
    if (initialViewId) setViewingId(initialViewId);
  }, [initialViewId]);
  const [form] = Form.useForm();
  useEffect(() => {
    if (openNew && office && perms.includes("write")) openForm(null);
    // Only on arrival.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [openNew]);
  const [saving, setSaving] = useState<"draft" | "approve" | null>(null);

  const tabs: { key: Tab; label: string }[] = office
    ? [
        { key: "all", label: "All" },
        { key: "drafts", label: "Drafts" },
        { key: "with", label: "With jobbers" },
        { key: "receive", label: "To receive" },
        { key: "completed", label: "Completed" },
        ...(rows.some(IN_TAB.issues) ? [{ key: "issues" as const, label: "QC issues" }] : []),
      ]
    : [
        { key: "todo", label: "To do" },
        { key: "done", label: "Done" },
      ];
  const filtered = rows.filter(IN_TAB[tab]);

  /** The jobber's own next step for this row (button in their list), if any. */
  const jobberStep = (r: JobRow) => {
    const to = nextStatus(r.status);
    if (office || !to || !perms.includes("modify") || !canSetStatus(role, r.status, to)) return null;
    return { label: NEXT_STEP[r.status]!.label, go: () => run(setJobStatus(r.id, to), `${jobNo(r.no)}: ${JOB_STATUS[to].label}`) };
  };
  const stepButton = (r: JobRow, block?: boolean) => {
    const step = jobberStep(r);
    return (
      step && (
        <span onClick={(e) => e.stopPropagation()} style={block ? { display: "block" } : undefined}>
          <Popconfirm title={`${step.label} for ${jobNo(r.no)}?`} okText="Yes" onConfirm={step.go}>
            <Button type="primary" block={block} style={block ? { height: 48, fontSize: 15 } : undefined}>
              {step.label}
            </Button>
          </Popconfirm>
        </span>
      )
    );
  };

  function openForm(row: JobRow | null) {
    form.resetFields();
    if (row) form.setFieldsValue({ ...row, dueDate: row.dueDate ? dayjs(row.dueDate) : null });
    setEditing(row);
  }

  /** Saves the job (always as a draft when new); "approve" also assigns it to the jobber right away. */
  async function submit(mode: "draft" | "approve") {
    const v = await form.validateFields();
    setSaving(mode);
    const res = await saveJob(editing?.id ?? null, { ...v, dueDate: v.dueDate ? v.dueDate.format("YYYY-MM-DD") : null });
    const ok =
      res.error || mode === "draft"
        ? await run(Promise.resolve(res), editing ? "Job updated" : "Draft saved. Approve it to assign the jobber.")
        : await run(approveJob(res.id!), "Job approved and assigned to the jobber");
    setSaving(null);
    if (ok) setEditing(undefined);
  }

  const jobCell = (r: JobRow) => (
    <div style={{ minWidth: 160, maxWidth: 320 }}>
      <div style={{ fontWeight: 500, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }} title={r.title}>
        {r.title}
      </div>
      <div style={{ fontSize: 12, color: "#64748B", marginTop: 2 }}>
        <Ledger>{jobNo(r.no)}</Ledger>
        {!office && r.pieces ? ` · ${n(r.pieces)} pcs` : ""}
      </div>
    </div>
  );
  const statusCell = (r: JobRow, withQc: boolean) => (
    <div>
      <JobStatusDot status={r.status} />
      {withQc && qcLine(r) && <div style={{ fontSize: 12, color: "#64748B", marginTop: 3 }}>{qcLine(r)}</div>}
      {r.openIssues > 0 && (
        <div style={{ fontSize: 12, color: "#B91C1C", marginTop: 3 }}>
          {r.openIssues} open QC issue{r.openIssues === 1 ? "" : "s"}
        </div>
      )}
    </div>
  );
  const dueCell = (r: JobRow) => <Due at={r.dueDate} done={r.status === "COMPLETED"} />;

  const columns: TableColumnsType<JobRow> = office
    ? [
        { title: "Job", key: "job", render: (_, r) => jobCell(r) },
        { title: "Jobber", dataIndex: "jobber" },
        // On tablets the QC counts move under the status (their own columns are desktop only).
        { title: "Status", key: "status", render: (_, r) => statusCell(r, !desktop) },
        { title: "Received", dataIndex: "received", align: "right", responsive: ["xl"], render: (v) => <Num v={v} /> },
        { title: "Rejected", dataIndex: "rejected", align: "right", responsive: ["xl"], render: (v) => <Num v={v} tone="#B91C1C" /> },
        { title: "Not received", dataIndex: "notReceived", align: "right", responsive: ["xl"], render: (v) => <Num v={v} tone="#B45309" /> },
        { title: "Due", key: "due", align: "right", render: (_, r) => dueCell(r) },
      ]
    : [
        { title: "Job", key: "job", render: (_, r) => jobCell(r) },
        { title: "Status", key: "status", render: (_, r) => statusCell(r, true) },
        { title: "Due", key: "due", render: (_, r) => dueCell(r) },
        { title: "", key: "step", align: "right", render: (_, r) => stepButton(r) },
      ];

  const mobileRow = (r: JobRow) => (
    <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
      <div style={{ display: "flex", justifyContent: "space-between", gap: 12 }}>
        <div style={{ display: "flex", flexDirection: "column", gap: 3, minWidth: 0 }}>
          <span style={{ fontSize: office ? 15 : 16, fontWeight: 500 }}>{r.title}</span>
          <span style={muted}>
            <Ledger>{jobNo(r.no)}</Ledger> · {office ? r.jobber : r.pieces ? `${n(r.pieces)} pcs` : "—"}
          </span>
          <span style={{ fontSize: 13 }}>
            <JobStatusDot status={r.status} size={7} />
          </span>
          {qcLine(r) && <span style={{ fontSize: 12, color: "#64748B" }}>{qcLine(r)}</span>}
          {office && r.openIssues > 0 && (
            <span style={{ fontSize: 12, color: "#B91C1C" }}>
              {r.openIssues} open QC issue{r.openIssues === 1 ? "" : "s"}
            </span>
          )}
        </div>
        <span style={{ flexShrink: 0, fontSize: 13 }}>{dueCell(r)}</span>
      </div>
      {!office && r.fix && <span style={{ fontSize: 14, color: "#B91C1C" }}>Sent back to fix: {r.fix}</span>}
      {!office && stepButton(r, true)}
    </div>
  );

  return (
    <>
      <PageHeader
        title={office ? "Job Work" : "My Jobs"}
        subtitle={office ? "Work given to jobbers and where each job stands" : "Tap the button when each step is done"}
        actions={
          office &&
          perms.includes("write") && (
            <Button type="primary" onClick={() => openForm(null)}>
              New job
            </Button>
          )
        }
      />

      {!office && <PushToggle />}
      <DataTable<JobRow>
        columns={columns}
        data={filtered}
        totalLabel="jobs"
        search={(r) => `${jobNo(r.no)} ${r.title} ${r.jobber} ${r.catalog ?? ""}`}
        searchPlaceholder="Search jobs"
        toolbar={<TabFilter value={tab} onChange={setTab} items={tabs.map((t) => ({ ...t, count: rows.filter(IN_TAB[t.key]).length }))} />}
        onOpen={(r) => setViewingId(r.id)}
        mobileRow={mobileRow}
      />

      <Drawer
        title={editing ? `Edit ${jobNo(editing.no)}` : "New job"}
        open={editing !== undefined}
        onClose={() => setEditing(undefined)}
        size={useDrawerSize(520)}
        footer={
          <div style={{ display: "flex", gap: 10, justifyContent: "flex-end", flexWrap: "wrap" }}>
            <Button onClick={() => setEditing(undefined)}>Cancel</Button>
            {editing && editing.status !== "DRAFT" ? (
              <Button type="primary" loading={saving === "draft"} onClick={() => submit("draft")}>
                Save
              </Button>
            ) : (
              <>
                <Button type={canApprove ? "default" : "primary"} loading={saving === "draft"} disabled={!!saving} onClick={() => submit("draft")}>
                  Save as draft
                </Button>
                {canApprove && (
                  <Button type="primary" loading={saving === "approve"} disabled={!!saving} onClick={() => submit("approve")}>
                    Save & approve
                  </Button>
                )}
              </>
            )}
          </div>
        }
      >
        {(!editing || editing.status === "DRAFT") && (
          <p style={{ ...muted, fontSize: 14, marginTop: 0, marginBottom: 20 }}>
            {canApprove
              ? "A draft stays with the office. Approve it to assign it: the jobber is notified and can start."
              : "This is saved as a draft. An admin approves it before it reaches the jobber."}
          </p>
        )}
        <Form form={form} layout="vertical" requiredMark="optional">
          <Form.Item name="title" label="Job title" rules={[{ required: true, message: "Enter what has to be done" }]}>
            <Input placeholder="e.g. Sajni Vol 2 · Green tops" />
          </Form.Item>
          <Form.Item
            name="jobberId"
            label="Jobber"
            rules={[{ required: true, message: "Pick a jobber" }]}
            extra={editing && editing.status !== "DRAFT" ? "Already assigned. Use Transfer to move it to another jobber." : undefined}
          >
            <Select
              showSearch
              optionFilterProp="label"
              placeholder="Select jobber"
              disabled={!!editing && editing.status !== "DRAFT"}
              options={jobbers.map((j) => ({ value: j.id, label: j.name }))}
            />
          </Form.Item>
          <Form.Item name="catalogId" label="Catalogue">
            <Select allowClear showSearch optionFilterProp="label" placeholder="Select catalogue" options={catalogs.map((c) => ({ value: c.id, label: c.name }))} />
          </Form.Item>
          <Form.Item name="pieces" label="Pieces">
            <InputNumber min={1} style={{ width: "100%" }} placeholder="e.g. 1000" inputMode="numeric" />
          </Form.Item>
          <Form.Item name="dueDate" label="Due date">
            <DatePicker style={{ width: "100%" }} format="DD MMM YYYY" inputReadOnly />
          </Form.Item>
          <Form.Item name="notes" label="Notes">
            <Input.TextArea rows={3} />
          </Form.Item>
        </Form>
      </Drawer>

      <JobViewDrawer
        job={viewing}
        role={role}
        canModify={perms.includes("modify")}
        canApprove={canApprove}
        canDelete={perms.includes("delete")}
        canTransfer={canTransfer}
        onReceive={() => viewing && setQcJob(viewing)}
        onEdit={() => viewing && openForm(viewing)}
        onClose={() => setViewingId(null)}
      />

      <QcModal job={qcJob} onClose={() => setQcJob(null)} />
    </>
  );
}

function JobViewDrawer({
  job,
  role,
  canModify,
  canApprove,
  canDelete,
  canTransfer,
  onReceive,
  onEdit,
  onClose,
}: {
  job: JobRow | null;
  role: Role;
  canModify: boolean;
  canApprove: boolean;
  canDelete: boolean;
  canTransfer: boolean;
  onReceive: () => void;
  onEdit: () => void;
  onClose: () => void;
}) {
  const run = useRun();
  const router = useRouter();
  const { modal } = App.useApp();
  const { phone } = useScreen();
  const office = role !== "JOBBER";
  const [detail, setDetail] = useState<Detail | null>(null);
  const [historyOpen, setHistoryOpen] = useState(false);
  const [changing, setChanging] = useState(false);
  const [newStatus, setNewStatus] = useState<JobStatus>();
  const [note, setNote] = useState("");

  // Reload whenever a different job (or a new status of the same job) is shown.
  const jobId = job?.id;
  const jobStatus = job?.status;
  // Resolving an issue doesn't change the status, so it bumps this to reload the detail.
  const [reloads, setReloads] = useState(0);
  useEffect(() => {
    if (!jobId) return;
    let live = true;
    setHistoryOpen(false);
    getJobDetail(jobId).then((d) => live && setDetail(d));
    return () => {
      live = false;
    };
  }, [jobId, jobStatus, reloads]);
  const d = detail && detail.id === jobId ? detail : null;

  const next = job && nextStatus(job.status);
  // The one main button: approve a draft, receive with QC, or this user's own next step.
  const main =
    !job || !next
      ? null
      : job.status === "DRAFT"
        ? canApprove && { label: NEXT_STEP.DRAFT!.label, go: () => run(approveJob(job.id), `${jobNo(job.no)} approved and assigned`) }
        : job.status === "SENT_BACK"
          ? office && canModify && { label: NEXT_STEP.SENT_BACK!.label, go: onReceive }
          : canModify && canSetStatus(role, job.status, next) && (!office || NEXT_STEP[job.status]?.by !== "JOBBER")
            ? { label: NEXT_STEP[job.status]!.label, go: () => run(setJobStatus(job.id, next, note), `${jobNo(job.no)}: ${JOB_STATUS[next].label}`).then((ok) => ok && setNote("")) }
            : null;
  const confirmMain = job?.status !== "SENT_BACK";

  const more = job
    ? [
        office && canModify && { key: "edit", label: "Edit", icon: <EditOutlined />, onClick: onEdit },
        canTransfer && TRANSFERABLE.includes(job.status) && { key: "transfer", label: "Transfer to another jobber", icon: <SwapOutlined />, href: `/transfers?job=${job.id}` },
        // Corrections only after approval; a draft leaves Draft only by being approved.
        office && canModify && job.status !== "DRAFT" && { key: "status", label: "Change status", icon: <HistoryOutlined />, onClick: () => setChanging(true) },
        // Office can take a step for the jobber (e.g. they called it in).
        office &&
          canModify &&
          next &&
          NEXT_STEP[job.status]?.by === "JOBBER" && {
            key: "step",
            label: `${NEXT_STEP[job.status]!.label} (for ${job.jobber})`,
            onClick: () => run(setJobStatus(job.id, next), `${jobNo(job.no)}: ${JOB_STATUS[next].label}`),
          },
        canDelete && { key: "delete", label: "Delete", icon: <DeleteOutlined />, danger: true, onClick: () => confirmDelete() },
      ].filter((x): x is Exclude<typeof x, false | undefined | null | ""> => !!x)
    : [];
  function confirmDelete() {
    modal.confirm({
      title: `Delete ${jobNo(job!.no)}?`,
      okText: "Delete",
      okButtonProps: { danger: true },
      onOk: () => run(deleteJob(job!.id), "Job deleted").then((ok) => ok && onClose()),
    });
  }

  const idx = job ? JOB_STEPS.indexOf(job.status) : 0;
  const last = d?.logs.at(-1);
  const turn = job ? whoseTurn(job, office) : null;
  const pad = phone ? 20 : 28;

  const facts: [string, React.ReactNode][] = job
    ? [
        ...(office ? [["Jobber", job.jobber] as [string, React.ReactNode]] : []),
        ["Catalogue", job.catalog ?? "—"],
        ["Pieces sent", job.pieces ? <Ledger>{n(job.pieces)}</Ledger> : "—"],
        ["Due", <Due key="due" at={job.dueDate} done={job.status === "COMPLETED"} />],
        ...(job.notes ? [["Notes", job.notes] as [string, React.ReactNode]] : []),
        ["Created", d ? `${d.createdBy} · ${fmtDate(new Date(d.createdAt))}` : "…"],
      ]
    : [];

  return (
    <Drawer
      open={!!job}
      onClose={onClose}
      size={useDrawerSize(520)}
      closable={false}
      styles={{ header: { display: "none" }, body: { padding: 0 }, footer: { padding: `12px ${pad}px calc(12px + env(safe-area-inset-bottom))` } }}
      footer={
        job &&
        (more.length > 0 || main) && (
          <div style={{ display: "flex", gap: 10 }}>
            {more.length > 0 && (
              <Dropdown
                trigger={["click"]}
                placement="topLeft"
                menu={{
                  items: more.map(({ key, label, icon, danger }) => ({ key, label, icon, danger })),
                  onClick: ({ key }) => {
                    const m = more.find((x) => x.key === key)!;
                    if ("href" in m && m.href) router.push(m.href);
                    else if ("onClick" in m) m.onClick?.();
                  },
                }}
              >
                <Button style={{ height: 48, paddingInline: 18 }}>More</Button>
              </Dropdown>
            )}
            {main &&
              (confirmMain ? (
                <Popconfirm title={`${main.label} for ${jobNo(job.no)}?`} okText="Yes" onConfirm={main.go}>
                  <Button type="primary" block style={{ height: 48, fontSize: 15 }}>
                    {main.label}
                  </Button>
                </Popconfirm>
              ) : (
                <Button type="primary" block style={{ height: 48, fontSize: 15 }} onClick={main.go}>
                  {main.label}
                </Button>
              ))}
          </div>
        )
      }
    >
      {job && (
        <>
          <div style={{ padding: `${phone ? 20 : 24}px 12px 18px ${pad}px`, display: "flex", alignItems: "flex-start", gap: 12, borderBottom: "1px solid #EEF2F6" }}>
            <div style={{ flex: 1, minWidth: 0, display: "flex", flexDirection: "column", gap: 6 }}>
              <Ledger>
                <span style={muted}>{jobNo(job.no)}</span>
              </Ledger>
              <h2 style={{ margin: 0, fontFamily: FONT_DISPLAY, fontSize: 24, fontWeight: 700, lineHeight: 1.2 }}>{job.title}</h2>
              <span style={{ fontSize: 14 }}>
                <StatusDot color={JOB_STATUS[job.status].color} label={turn ? `${JOB_STATUS[job.status].label} · ${turn}` : JOB_STATUS[job.status].label} />
              </span>
            </div>
            <Button type="text" aria-label="Close" style={{ width: 44, height: 44 }} icon={<CloseOutlined style={{ color: "#64748B" }} />} onClick={onClose} />
          </div>

          <div style={{ padding: pad, display: "flex", flexDirection: "column", gap: 24 }}>
            {/* Sent back for rework: what to fix comes first. */}
            {job.fix && (
              <Alert type="error" title={role === "JOBBER" ? "Sent back to fix" : "Sent back for rework"} description={job.fix} />
            )}

            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              <div style={{ display: "flex", gap: 4 }} aria-hidden="true">
                {JOB_STEPS.map((s, i) => (
                  <span
                    key={s}
                    style={{
                      flex: 1,
                      height: 6,
                      borderRadius: 3,
                      background: i < idx ? "#0369A1" : i === idx ? JOB_STATUS[job.status].color : "#E2E8F0",
                    }}
                  />
                ))}
              </div>
              <span style={muted}>
                Step {idx + 1} of {JOB_STEPS.length}
                {last && ` · ${last.by}, ${fmtDateTime(last.at)}`}
              </span>
            </div>

            <dl style={{ margin: 0, display: "grid", gridTemplateColumns: phone ? "112px 1fr" : "140px 1fr", rowGap: 14, fontSize: phone ? 15 : 14 }}>
              {facts.map(([k, v]) => (
                <div key={k} style={{ display: "contents" }}>
                  <dt style={{ color: "#64748B" }}>{k}</dt>
                  <dd style={{ margin: 0, color: "#0F172A", minWidth: 0, overflowWrap: "anywhere" }}>{v}</dd>
                </div>
              ))}
            </dl>

            {(d?.qcs.length ?? 0) > 0 && (
              <section>
                <h3 style={{ margin: "0 0 8px", fontSize: 15, fontWeight: 600 }}>Quality check</h3>
                {d!.qcs.map((q, qi) => (
                  <div key={q.id} style={{ padding: "12px 0", borderTop: "1px solid #F1F5F9", display: "flex", flexDirection: "column", gap: 6 }}>
                    <div style={{ display: "flex", justifyContent: "space-between", gap: 8, flexWrap: "wrap" }}>
                      <StatusDot color={QC_RESULT[q.result].color} label={QC_RESULT[q.result].label} />
                      <span style={{ fontSize: 12, color: "#64748B" }}>
                        {q.by} · {fmtDateTime(q.at)}
                      </span>
                    </div>
                    {qi === 0 || q.receivedPieces !== null ? (
                      <span style={{ fontSize: 14, color: "#334155" }}>
                        {qcLine({ received: q.receivedPieces, rejected: q.rejectedPieces, notReceived: q.missingPieces })}
                      </span>
                    ) : null}
                    {q.notes && <span style={{ fontSize: 14, color: "#475569" }}>{q.notes}</span>}
                    {q.issues.map((i) => (
                      <div key={i.id} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 8, flexWrap: "wrap", minHeight: 36 }}>
                        <span style={{ fontSize: 14, textDecoration: i.resolvedAt ? "line-through" : undefined, color: i.resolvedAt ? "#94A3B8" : "#0F172A" }}>
                          {QC_ISSUE_LABEL[i.type]}
                          {i.qty ? ` · ${i.qty}` : ""}
                          {i.note ? ` · ${i.note}` : ""}
                        </span>
                        {i.resolvedAt ? (
                          <span style={{ fontSize: 12, color: "#15803D" }}>Resolved{i.resolvedBy ? ` by ${i.resolvedBy}` : ""}</span>
                        ) : office && canModify ? (
                          <Popconfirm title="Mark this issue resolved?" okText="Yes" onConfirm={() => run(resolveQcIssue(i.id), "Issue resolved").then((ok) => ok && setReloads((x) => x + 1))}>
                            <Button type="link" style={{ paddingInline: 0 }}>
                              Mark resolved
                            </Button>
                          </Popconfirm>
                        ) : (
                          <span style={{ fontSize: 12, color: "#B91C1C" }}>Open</span>
                        )}
                      </div>
                    ))}
                  </div>
                ))}
              </section>
            )}

            <section>
              <h3 style={{ margin: "0 0 8px", fontSize: 15, fontWeight: 600 }}>Fabric sent</h3>
              {!d ? (
                <span style={muted}>Loading…</span>
              ) : d.challans.length === 0 ? (
                <span style={muted}>No challan linked yet.{office ? " Link one from New challan." : ""}</span>
              ) : (
                d.challans.map((c) => (
                  <div key={c.id} style={{ display: "flex", justifyContent: "space-between", padding: "12px 0", borderTop: "1px solid #F1F5F9", fontSize: phone ? 15 : 14 }}>
                    <Link href={`/challans/${c.id}`}>
                      <Ledger>{c.no}</Ledger> <span style={{ color: "#64748B" }}>· {fmtDate(new Date(c.date))}</span>
                    </Link>
                    <Ledger>
                      <span style={{ color: "#334155" }}>{c.meters} m</span>
                    </Ledger>
                  </div>
                ))
              )}
            </section>

            {main && !office && (
              <Input placeholder="Note for the office (optional)" value={note} onChange={(e) => setNote(e.target.value)} />
            )}

            {d && d.logs.length > 0 && (
              <section>
                <Button type="link" style={{ paddingInline: 0, fontWeight: 500 }} onClick={() => setHistoryOpen((o) => !o)}>
                  {historyOpen ? "Hide history" : `Show history (${d.logs.length})`}
                </Button>
                {historyOpen && (
                  <Timeline
                    style={{ marginTop: 12 }}
                    items={[...d.logs].reverse().map((l) => ({
                      color: JOB_STATUS[l.status].color,
                      content: (
                        <>
                          <b style={{ fontWeight: 600 }}>{JOB_STATUS[l.status].label}</b> · {l.by}
                          <div style={{ fontSize: 12, color: "#64748B" }}>{fmtDateTime(l.at)}</div>
                          {l.note && <div>{l.note}</div>}
                        </>
                      ),
                    }))}
                  />
                )}
              </section>
            )}
          </div>

          <Modal
            title="Change status"
            open={changing}
            onCancel={() => setChanging(false)}
            okText="Save"
            okButtonProps={{ disabled: !newStatus }}
            onOk={async () => {
              if (!newStatus) return;
              // Completing a sent-back job always goes through QC.
              if (job.status === "SENT_BACK" && newStatus === "COMPLETED") {
                setChanging(false);
                return onReceive();
              }
              if (await run(setJobStatus(job.id, newStatus, note), "Status changed")) {
                setChanging(false);
                setNewStatus(undefined);
                setNote("");
              }
            }}
          >
            <Space orientation="vertical" style={{ width: "100%" }}>
              <Select
                placeholder="New status"
                value={newStatus}
                onChange={setNewStatus}
                style={{ width: "100%" }}
                options={JOB_STEPS.filter((s) => s !== job.status && s !== "DRAFT").map((s) => ({ value: s, label: JOB_STATUS[s].label }))}
              />
              <Input placeholder="Reason" value={note} onChange={(e) => setNote(e.target.value)} />
            </Space>
          </Modal>
        </>
      )}
    </Drawer>
  );
}
