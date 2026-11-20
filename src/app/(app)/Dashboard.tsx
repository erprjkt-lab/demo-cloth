"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { CalendarOutlined, EyeOutlined, PlusOutlined } from "@ant-design/icons";
import { Button, Card, Col, Empty, Row, Statistic, Table, Tag, Typography } from "antd";
import { DataTable, JobStatusTag, Ledger, PageHeader } from "@/components/ui";
import { dueLabel, fmtDateTime } from "@/lib/format";
import { jobNo, NEXT_STEP, type JobStatus } from "@/lib/jobs";

type Running = {
  id: string;
  no: number;
  title: string;
  status: JobStatus;
  pieces: number | null;
  dueDate: Date | null;
  updatedAt: Date;
  jobber: string;
  catalog: string | null;
};
type Upcoming = { id: string; title: string; dueAt: Date; assignedTo: string; challan: { id: string; no: string } | null };

const TONE = { overdue: "#DC2626", soon: "#D97706", later: "#475569" } as const;

/** "Overdue 2 days" in red, "Today"/"Tomorrow"/"In 3 days" in amber, later in grey. */
function Due({ at }: { at: Date | null }) {
  if (!at) return <Typography.Text type="secondary">No due date</Typography.Text>;
  const d = dueLabel(new Date(at));
  return <span style={{ color: TONE[d.tone], fontWeight: d.tone === "later" ? 400 : 600 }}>{d.text}</span>;
}

export function Dashboard({
  name,
  kpis,
  jobsByStatus,
  running,
  upcoming,
}: {
  name: string;
  kpis: { dueReminders: number; openIssues: number };
  jobsByStatus: { status: JobStatus; count: number }[];
  running: Running[];
  upcoming: Upcoming[];
}) {
  const router = useRouter();
  const count = (st: JobStatus) => jobsByStatus.find((s) => s.status === st)?.count ?? 0;
  const runningCount = jobsByStatus.filter((s) => s.status !== "DRAFT" && s.status !== "COMPLETED").reduce((a, s) => a + s.count, 0);
  // ponytail: counted from the 50 most urgent running jobs loaded; fine while overdue jobs are fewer than that.
  const overdueJobs = running.filter((j) => j.dueDate && dueLabel(new Date(j.dueDate)).tone === "overdue").length;
  const tiles = [
    { title: "Running jobs", value: runningCount, href: "/jobs" },
    { title: "Overdue jobs", value: overdueJobs, href: "/jobs", alert: overdueJobs > 0 },
    { title: "Drafts to approve", value: count("DRAFT"), href: "/jobs", alert: count("DRAFT") > 0 },
    { title: "Sent back · to QC", value: count("SENT_BACK"), href: "/jobs", alert: count("SENT_BACK") > 0 },
    { title: "Open QC issues", value: kpis.openIssues, href: "/jobs", alert: kpis.openIssues > 0 },
    { title: "Reminders due", value: kpis.dueReminders, href: "/tasks", alert: kpis.dueReminders > 0 },
  ];
  const openJob = (id: string) => router.push(`/jobs?view=${id}`);

  return (
    <>
      <PageHeader
        title="Dashboard"
        subtitle={`Welcome back, ${name}`}
        actions={
          <>
            <Link href="/challans/new">
              <Button icon={<PlusOutlined />}>New Challan</Button>
            </Link>
            <Link href="/jobs">
              <Button type="primary" icon={<PlusOutlined />}>
                Job Work
              </Button>
            </Link>
          </>
        }
      />

      <Row gutter={[12, 12]} style={{ marginBottom: 12 }}>
        {tiles.map((t) => (
          <Col key={t.title} xs={12} md={8} xl={4}>
            <Link href={t.href}>
              <Card hoverable size="small">
                <Statistic title={t.title} value={t.value} styles={{ content: { color: t.alert ? "#D97706" : undefined, fontWeight: 600 } }} />
              </Card>
            </Link>
          </Col>
        ))}
      </Row>

      <Row gutter={[12, 12]}>
        <Col xs={24} xl={16}>
          <DataTable<Running>
            cardTitle={`Running job work (${runningCount})`}
            cardExtra={<Link href="/jobs">View all</Link>}
            data={running}
            totalLabel="running jobs"
            search={(j) => `${jobNo(j.no)} ${j.title} ${j.jobber} ${j.catalog ?? ""}`}
            searchPlaceholder="Search job or jobber"
            pagination={{ pageSize: 10, hideOnSinglePage: true }}
            locale={{ emptyText: "No jobs with jobbers right now" }}
            onRow={(j) => ({ onClick: () => openJob(j.id), style: { cursor: "pointer" } })}
            columns={[
              { title: "Job", dataIndex: "no", render: (no) => <Ledger>{jobNo(no)}</Ledger> },
              {
                title: "Title",
                dataIndex: "title",
                render: (t: string, j) => (
                  <span>
                    {t}
                    {j.catalog && <div style={{ fontSize: 12, color: "#64748B" }}>{j.catalog}</div>}
                  </span>
                ),
              },
              { title: "Jobber", dataIndex: "jobber" },
              { title: "Status", dataIndex: "status", render: (s: JobStatus) => <JobStatusTag status={s} /> },
              { title: "Due", dataIndex: "dueDate", render: (d: Date | null) => <Due at={d} /> },
              {
                title: "Waiting on",
                key: "waiting",
                render: (_, j) =>
                  NEXT_STEP[j.status]?.by === "JOBBER" ? (
                    <Tag>Jobber</Tag>
                  ) : (
                    <Tag color="orange" title={NEXT_STEP[j.status]?.label}>
                      Office
                    </Tag>
                  ),
              },
              {
                title: "Pieces",
                dataIndex: "pieces",
                align: "right",
                responsive: ["xxl"],
                render: (p) => (p ? <Ledger>{p.toLocaleString("en-IN")}</Ledger> : "—"),
              },
              { title: "Updated", dataIndex: "updatedAt", responsive: ["xxl"], render: (d) => fmtDateTime(new Date(d)) },
            ]}
            actions={(j) => [{ key: "view", label: "View", icon: <EyeOutlined />, onClick: () => openJob(j.id) }]}
          />
        </Col>

        <Col xs={24} xl={8}>
          <Card
            size="small"
            title={
              <span>
                <CalendarOutlined /> Upcoming tasks
              </span>
            }
            extra={<Link href="/tasks">All tasks</Link>}
            style={{ marginBottom: 12 }}
            styles={{ body: { padding: upcoming.length ? 0 : undefined } }}
          >
            {upcoming.length === 0 ? (
              <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description="Nothing due in the next 7 days" />
            ) : (
              upcoming.map((t) => (
                <Link
                  key={t.id}
                  href="/tasks"
                  style={{ display: "flex", justifyContent: "space-between", gap: 12, padding: "10px 14px", borderBottom: "1px solid #EEF2F6", color: "inherit" }}
                >
                  <span style={{ minWidth: 0 }}>
                    <div style={{ fontWeight: 500 }}>{t.title}</div>
                    <div style={{ fontSize: 12, color: "#64748B" }}>
                      {t.assignedTo}
                      {t.challan && <> · {t.challan.no}</>}
                    </div>
                  </span>
                  <span style={{ textAlign: "right", flexShrink: 0, fontSize: 13 }}>
                    <Due at={t.dueAt} />
                    <div style={{ fontSize: 12, color: "#94A3B8" }}>{fmtDateTime(new Date(t.dueAt))}</div>
                  </span>
                </Link>
              ))
            )}
          </Card>

          <Card title="Jobs by status" size="small" styles={{ body: { padding: 0 } }}>
            <Table
              rowKey="status"
              size="small"
              pagination={false}
              dataSource={jobsByStatus}
              columns={[
                { title: "Status", dataIndex: "status", render: (s: JobStatus) => <JobStatusTag status={s} /> },
                { title: "Jobs", dataIndex: "count", align: "right", render: (n) => <Ledger>{n}</Ledger> },
              ]}
            />
          </Card>
        </Col>
      </Row>
    </>
  );
}
