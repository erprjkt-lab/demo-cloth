"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import dayjs from "dayjs";
import { DeleteOutlined, EditOutlined, EyeOutlined, PlusOutlined, SwapOutlined } from "@ant-design/icons";
import {
  Alert,
  Button,
  DatePicker,
  Descriptions,
  Drawer,
  Form,
  Input,
  InputNumber,
  Popconfirm,
  Select,
  Space,
  Steps,
  Table,
  Tag,
  Timeline,
  Typography,
} from "antd";
import type { TableColumnsType } from "antd";
import { DataTable, JobStatusTag, Ledger, PageHeader, useRun, useDrawerSize } from "@/components/ui";
import { fmtDate, fmtDateTime } from "@/lib/format";
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
  updatedAt: Date;
};
type Detail = NonNullable<Awaited<ReturnType<typeof getJobDetail>>>;

export function JobsClient({
  rows,
  role,
  perms,
  canTransfer,
  initialViewId,
  jobbers,
  catalogs,
}: {
  rows: JobRow[];
  role: Role;
  perms: Action[];
  canTransfer: boolean;
  initialViewId?: string;
  jobbers: Option[];
  catalogs: Option[];
}) {
  const run = useRun();
  const office = role !== "JOBBER";
  const canApprove = office && perms.includes("approve");
  // Everything is listed by default, completed jobs included; the filter narrows it down.
  const [status, setStatus] = useState<JobStatus | "ACTIVE" | "ALL" | "ISSUES">("ALL");
  const [qcJob, setQcJob] = useState<JobRow | null>(null);
  const [editing, setEditing] = useState<JobRow | null | undefined>(undefined); // undefined = closed, null = new
  const [viewing, setViewing] = useState<JobRow | null>(null);
  // Opened after hydration (a drawer rendered open on the server wouldn't match the client).
  useEffect(() => {
    const row = initialViewId && rows.find((r) => r.id === initialViewId);
    if (row) setViewing(row);
    // Only on arrival; later list refreshes shouldn't reopen it.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initialViewId]);
  const [form] = Form.useForm();
  const [saving, setSaving] = useState<"draft" | "approve" | null>(null);

  const filtered = rows.filter((r) =>
    status === "ALL"
      ? true
      : status === "ACTIVE"
        ? r.status !== "COMPLETED"
        : status === "ISSUES"
          ? r.openIssues > 0
          : r.status === status,
  );

  /** The one button shown in the "Next step" column for this user, if any. */
  const stepFor = (r: JobRow): { label: string; go: () => Promise<boolean> | void; direct?: boolean } | null => {
    // Receiving goes through the QC dialog rather than a one-tap confirm.
    if (r.status === "SENT_BACK") {
      return office && perms.includes("modify") ? { label: NEXT_STEP.SENT_BACK!.label, go: () => setQcJob(r), direct: true } : null;
    }
    if (r.status === "DRAFT") {
      return canApprove ? { label: NEXT_STEP.DRAFT!.label, go: () => run(approveJob(r.id), `${jobNo(r.no)} approved and assigned`) } : null;
    }
    const to = nextStatus(r.status);
    if (!to || !perms.includes("modify") || !canSetStatus(role, r.status, to)) return null;
    // Office can act on the jobber's behalf (in the View drawer), but the table button is for whoever owns the step.
    if (office && NEXT_STEP[r.status]?.by === "JOBBER") return null;
    return { label: NEXT_STEP[r.status]!.label, go: () => run(setJobStatus(r.id, to), `${jobNo(r.no)}: ${JOB_STATUS[to].label}`) };
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

  const columns: TableColumnsType<JobRow> = [
    {
      title: "Job No",
      dataIndex: "no",
      width: 100,
      render: (no, r) => (
        <Typography.Link onClick={() => setViewing(r)}>
          <Ledger>{jobNo(no)}</Ledger>
        </Typography.Link>
      ),
    },
    {
      title: "Title",
      dataIndex: "title",
      render: (t) => (
        <span title={t} style={{ display: "inline-block", maxWidth: 220, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", verticalAlign: "bottom" }}>
          {t}
        </span>
      ),
    },
    ...(office ? [{ title: "Jobber", dataIndex: "jobber" } as const] : []),
    // Status and the next-step button come early so a jobber on a phone sees them without scrolling.
    {
      title: "Status",
      dataIndex: "status",
      render: (s: JobStatus, r) => (
        <span style={{ display: "inline-flex", flexWrap: "wrap", gap: 4 }}>
          <JobStatusTag status={s} />
          {r.openIssues > 0 ? (
            <Tag color="red" style={{ marginInlineEnd: 0 }}>
              {r.openIssues} open issue{r.openIssues === 1 ? "" : "s"}
            </Tag>
          ) : (
            s === "COMPLETED" &&
            r.lastQc && (
              <Tag color={QC_RESULT[r.lastQc].color} style={{ marginInlineEnd: 0 }}>
                {QC_RESULT[r.lastQc].label}
              </Tag>
            )
          )}
        </span>
      ),
    },
    {
      title: "Next step",
      key: "next",
      render: (_, r) => {
        const step = stepFor(r);
        if (step?.direct) {
          return (
            <Button type="primary" size="small" onClick={step.go}>
              {step.label}
            </Button>
          );
        }
        if (step) {
          return (
            <Popconfirm title={`${step.label} for ${jobNo(r.no)}?`} onConfirm={step.go}>
              <Button type="primary" size="small">
                {step.label}
              </Button>
            </Popconfirm>
          );
        }
        const waiting = r.status === "COMPLETED" ? "Done" : r.status === "DRAFT" ? "Waiting for approval" : office && NEXT_STEP[r.status]?.by === "JOBBER" ? "With jobber" : "—";
        return <Typography.Text type="secondary">{waiting}</Typography.Text>;
      },
    },
    // Wide screens only (also in the View drawer): keeps the QC counts in view on laptops and tablets.
    { title: "Catalogue", dataIndex: "catalog", responsive: ["xxl"], render: (v) => v ?? "—" },
    {
      title: "Sent",
      dataIndex: "pieces",
      align: "right",
      render: (v) => (v ? <Ledger>{v.toLocaleString("en-IN")}</Ledger> : "—"),
    },
    {
      title: "Received",
      dataIndex: "received",
      align: "right",
      render: (v: number | null) => (v === null ? "—" : <Ledger>{v.toLocaleString("en-IN")}</Ledger>),
    },
    {
      title: "Rejected",
      dataIndex: "rejected",
      align: "right",
      render: (v: number | null) =>
        v === null ? "—" : <Ledger><span style={{ color: v > 0 ? "#DC2626" : undefined, fontWeight: v > 0 ? 600 : undefined }}>{v.toLocaleString("en-IN")}</span></Ledger>,
    },
    {
      title: "Not received",
      dataIndex: "notReceived",
      align: "right",
      render: (v: number | null) =>
        v === null ? "—" : <Ledger><span style={{ color: v > 0 ? "#D97706" : undefined, fontWeight: v > 0 ? 600 : undefined }}>{v.toLocaleString("en-IN")}</span></Ledger>,
    },
    {
      title: "Due",
      dataIndex: "dueDate",
      render: (d: string | null, r) =>
        d ? (
          <span style={{ color: r.status !== "COMPLETED" && dayjs(d).isBefore(dayjs(), "day") ? "#DC2626" : undefined }}>
            {fmtDate(new Date(d))}
          </span>
        ) : (
          "—"
        ),
    },
    { title: "Challans", dataIndex: "challans", align: "right", responsive: ["xxl"] },
  ];

  return (
    <>
      <PageHeader
        title={office ? "Job Work" : "My Jobs"}
        subtitle={office ? "Work given to jobbers and where each job stands" : "Update each job as you receive, finish and send it back"}
        breadcrumbs={[{ label: "Home", href: "/" }, { label: "Job Work" }]}
        actions={
          office &&
          perms.includes("write") && (
            <Button type="primary" icon={<PlusOutlined />} onClick={() => openForm(null)}>
              New Job Work
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
        searchPlaceholder="Search job no, title, jobber"
        toolbar={
          <Select
            value={status}
            onChange={setStatus}
            style={{ width: 200 }}
            options={[
              { value: "ALL", label: "All jobs" },
              { value: "ACTIVE", label: "Open jobs (not completed)" },
              ...(office ? [{ value: "ISSUES", label: "Open QC issues" }] : []),
              ...JOB_STEPS.filter((s) => office || s !== "DRAFT").map((s) => ({ value: s, label: JOB_STATUS[s].label })),
            ]}
          />
        }
        actions={(r) => [
          { key: "view", label: "View", icon: <EyeOutlined />, onClick: () => setViewing(r) },
          { key: "edit", label: "Edit", icon: <EditOutlined />, hidden: !office || !perms.includes("modify"), onClick: () => openForm(r) },
          {
            key: "transfer",
            label: "Transfer",
            icon: <SwapOutlined />,
            hidden: !canTransfer || !TRANSFERABLE.includes(r.status),
            href: `/transfers?job=${r.id}`,
          },
          {
            key: "delete",
            label: "Delete",
            icon: <DeleteOutlined />,
            danger: true,
            hidden: !perms.includes("delete"),
            confirm: `Delete ${jobNo(r.no)}?`,
            onClick: () => run(deleteJob(r.id), "Job deleted"),
          },
        ]}
      />

      <Drawer
        title={editing ? `Edit ${jobNo(editing.no)}` : "New Job Work"}
        open={editing !== undefined}
        onClose={() => setEditing(undefined)}
        size={useDrawerSize(520)}
        footer={
          <Space style={{ width: "100%", justifyContent: "flex-end" }}>
            <Button onClick={() => setEditing(undefined)}>Cancel</Button>
            {editing && editing.status !== "DRAFT" ? (
              <Button type="primary" loading={saving === "draft"} onClick={() => submit("draft")}>
                Save
              </Button>
            ) : (
              <>
                <Button type={canApprove ? "default" : "primary"} loading={saving === "draft"} disabled={!!saving} onClick={() => submit("draft")}>
                  Save as Draft
                </Button>
                {canApprove && (
                  <Button type="primary" loading={saving === "approve"} disabled={!!saving} onClick={() => submit("approve")}>
                    Save & Approve
                  </Button>
                )}
              </>
            )}
          </Space>
        }
      >
        {(!editing || editing.status === "DRAFT") && (
          <Alert
            type="info"
            showIcon
            style={{ marginBottom: 16 }}
            title={
              canApprove
                ? "A draft stays with the office. Approve it to assign it: the jobber is notified and can start."
                : "This is saved as a draft. An admin approves it before it reaches the jobber."
            }
          />
        )}
        <Form form={form} layout="vertical" requiredMark="optional">
          <Form.Item name="title" label="Job title" rules={[{ required: true, message: "Enter what has to be done" }]}>
            <Input placeholder="e.g. Sajni Vol 2 – stitch Green tops" />
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
            <InputNumber min={1} style={{ width: "100%" }} placeholder="e.g. 1000" />
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
        onReceive={() => viewing && setQcJob(viewing)}
        onClose={() => setViewing(null)}
        onChanged={(s) => setViewing((v) => (v ? { ...v, status: s } : v))}
      />

      <QcModal
        job={qcJob}
        onClose={() => setQcJob(null)}
        onDone={(s) => setViewing((v) => (v && v.id === qcJob?.id ? { ...v, status: s } : v))}
      />
    </>
  );
}

function JobViewDrawer({
  job,
  role,
  canModify,
  canApprove,
  onReceive,
  onClose,
  onChanged,
}: {
  job: JobRow | null;
  role: Role;
  canModify: boolean;
  canApprove: boolean;
  onReceive: () => void;
  onClose: () => void;
  onChanged: (s: JobStatus) => void;
}) {
  const run = useRun();
  const [detail, setDetail] = useState<Detail | null>(null);
  const [newStatus, setNewStatus] = useState<JobStatus>();
  const [note, setNote] = useState("");

  // Reload history whenever a different job (or a new status of the same job) is shown.
  const jobId = job?.id;
  const jobStatus = job?.status;
  // Resolving an issue doesn't change the status, so it bumps this to reload the detail.
  const [reloads, setReloads] = useState(0);
  const reload = () => setReloads((n) => n + 1);
  useEffect(() => {
    if (!jobId) return;
    let live = true;
    getJobDetail(jobId).then((d) => live && setDetail(d));
    return () => {
      live = false;
    };
  }, [jobId, jobStatus, reloads]);

  async function change(to: JobStatus, msg: string) {
    if (job!.status === "SENT_BACK" && to === "COMPLETED") return onReceive();
    const action = job!.status === "DRAFT" ? approveJob(job!.id, note) : setJobStatus(job!.id, to, note);
    if (await run(action, msg)) {
      setNote("");
      setNewStatus(undefined);
      onChanged(to);
    }
  }

  const next = job && nextStatus(job.status);
  const ownStep =
    job && next && (job.status === "DRAFT" ? canApprove : canModify && canSetStatus(role, job.status, next));

  return (
    <Drawer
      title={job ? `${jobNo(job.no)} · ${job.title}` : ""}
      open={!!job}
      onClose={onClose}
      size={useDrawerSize(560)}
      extra={job && <JobStatusTag status={job.status} />}
    >
      {job && (
        <>
          {/* Sent back for rework: what to fix comes first, before anything else. */}
          {detail?.qcs[0]?.result === "REWORK" && job.status !== "COMPLETED" && (
            <Alert
              type="error"
              showIcon
              style={{ marginBottom: 12 }}
              title={role === "JOBBER" ? "Sent back for rework: please fix" : "Last QC sent this back for rework; check these"}
              description={
                <ul style={{ margin: 0, paddingLeft: 18 }}>
                  {detail.qcs[0].issues.map((i) => (
                    <li key={i.id}>
                      <b>{QC_ISSUE_LABEL[i.type]}</b>
                      {i.qty ? ` · ${i.qty}` : ""}
                      {i.note ? ` · ${i.note}` : ""}
                    </li>
                  ))}
                  {detail.qcs[0].notes && <li>{detail.qcs[0].notes}</li>}
                </ul>
              }
            />
          )}
          {ownStep && (
            <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginBottom: 16 }}>
              <Input placeholder="Note (optional)" value={note} onChange={(e) => setNote(e.target.value)} style={{ flex: "1 1 200px" }} />
              <Button type="primary" style={{ flex: "1 1 160px" }} onClick={() => change(next, `${jobNo(job.no)}: ${JOB_STATUS[next].label}`)}>
                {NEXT_STEP[job.status]!.label}
              </Button>
            </div>
          )}

          <Steps
            orientation="vertical"
            size="small"
            current={JOB_STEPS.indexOf(job.status)}
            items={JOB_STEPS.map((s, i) => {
              // Steps past the current one stay blank even if reached before a correction.
              const log = i <= JOB_STEPS.indexOf(job.status) ? detail?.logs.findLast((l) => l.status === s) : undefined;
              return { title: JOB_STATUS[s].label, content: log ? `${log.by} · ${fmtDateTime(log.at)}` : undefined };
            })}
            style={{ marginBottom: 16 }}
          />


          <Descriptions
            size="small"
            column={1}
            bordered
            items={[
              { label: "Jobber", children: job.jobber },
              { label: "Catalogue", children: job.catalog ?? "—" },
              { label: "Pieces", children: job.pieces?.toLocaleString("en-IN") ?? "—" },
              { label: "Due date", children: job.dueDate ? fmtDate(new Date(job.dueDate)) : "—" },
              { label: "Notes", children: job.notes ?? "—" },
              { label: "Created", children: detail ? `${detail.createdBy} · ${fmtDateTime(detail.createdAt)}` : "…" },
            ]}
          />

          <Typography.Title level={5} style={{ marginTop: 20 }}>
            Challans (fabric sent)
          </Typography.Title>
          <Table
            size="small"
            rowKey="id"
            loading={!detail}
            pagination={false}
            dataSource={detail?.challans ?? []}
            locale={{ emptyText: "No challan linked yet. Link one from New Challan." }}
            columns={[
              { title: "Challan", dataIndex: "no", render: (no, c) => <Link href={`/challans/${c.id}`}><Ledger>{no}</Ledger></Link> },
              { title: "Date", dataIndex: "date", render: (d) => fmtDate(new Date(d)) },
              { title: "Meters", dataIndex: "meters", align: "right", render: (m) => <Ledger>{m}</Ledger> },
            ]}
          />

          {(detail?.qcs.length ?? 0) > 0 && (
            <>
              <Typography.Title level={5} style={{ marginTop: 20 }}>
                Quality checks
              </Typography.Title>
              {detail!.qcs.map((q) => (
                <div key={q.id} style={{ border: "1px solid #E2E8F0", borderRadius: 8, padding: 12, marginBottom: 8 }}>
                  <div style={{ display: "flex", justifyContent: "space-between", flexWrap: "wrap", gap: 4, marginBottom: 6 }}>
                    <Tag color={QC_RESULT[q.result].color}>{QC_RESULT[q.result].label}</Tag>
                    <Typography.Text type="secondary" style={{ fontSize: 12 }}>
                      {q.by} · {fmtDateTime(q.at)}
                    </Typography.Text>
                  </div>
                  {q.receivedPieces !== null && (
                    <div>
                      Received <Ledger>{q.receivedPieces.toLocaleString("en-IN")}</Ledger>
                      {" · "}Rejected <Ledger><span style={{ color: q.rejectedPieces ? "#DC2626" : undefined }}>{q.rejectedPieces ?? 0}</span></Ledger>
                      {q.missingPieces !== null && (
                        <>
                          {" · "}Not received <Ledger><span style={{ color: q.missingPieces ? "#D97706" : undefined }}>{q.missingPieces}</span></Ledger>
                        </>
                      )}
                    </div>
                  )}
                  {q.notes && <div style={{ color: "#475569" }}>{q.notes}</div>}
                  {q.issues.map((i) => (
                    <div
                      key={i.id}
                      style={{
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "space-between",
                        gap: 8,
                        padding: "6px 0",
                        borderTop: "1px solid #F1F5F9",
                        flexWrap: "wrap",
                      }}
                    >
                      <span style={{ textDecoration: i.resolvedAt ? "line-through" : undefined, color: i.resolvedAt ? "#94A3B8" : undefined }}>
                        <b>{QC_ISSUE_LABEL[i.type]}</b>
                        {i.qty ? ` · ${i.qty}` : ""}
                        {i.note ? ` · ${i.note}` : ""}
                      </span>
                      {i.resolvedAt ? (
                        <Typography.Text type="success" style={{ fontSize: 12 }}>
                          Resolved{i.resolvedBy ? ` by ${i.resolvedBy}` : ""}
                        </Typography.Text>
                      ) : role !== "JOBBER" && canModify ? (
                        <Popconfirm
                          title="Mark this issue resolved?"
                          onConfirm={() => run(resolveQcIssue(i.id), "Issue resolved").then((ok) => ok && reload())}
                        >
                          <Button size="small">Mark resolved</Button>
                        </Popconfirm>
                      ) : (
                        <Tag color="red" style={{ marginInlineEnd: 0 }}>
                          Open
                        </Tag>
                      )}
                    </div>
                  ))}
                </div>
              ))}
            </>
          )}

          <Typography.Title level={5} style={{ marginTop: 20 }}>
            History
          </Typography.Title>
          <Timeline
            items={(detail?.logs ?? []).map((l) => ({
              color: JOB_STATUS[l.status].color === "green" ? "green" : "blue",
              content: (
                <>
                  <b>{JOB_STATUS[l.status].label}</b> · {l.by}
                  <div style={{ fontSize: 12, color: "#64748B" }}>{fmtDateTime(l.at)}</div>
                  {l.note && <div>{l.note}</div>}
                </>
              ),
            }))}
          />

          {/* Corrections only after approval; a draft leaves Draft only by being approved. */}
          {role !== "JOBBER" && canModify && job.status !== "DRAFT" && (
            <>
              <Typography.Title level={5}>Change status</Typography.Title>
              <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
                <Select
                  placeholder="Set status"
                  value={newStatus}
                  onChange={setNewStatus}
                  style={{ flex: "1 1 180px" }}
                  options={JOB_STEPS.filter((s) => s !== job.status && s !== "DRAFT").map((s) => ({ value: s, label: JOB_STATUS[s].label }))}
                />
                <Input placeholder="Reason" value={note} onChange={(e) => setNote(e.target.value)} style={{ flex: "1 1 180px" }} />
                <Button disabled={!newStatus} onClick={() => newStatus && change(newStatus, "Status changed")}>
                  Save
                </Button>
              </div>
            </>
          )}
        </>
      )}
    </Drawer>
  );
}
