"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { RightOutlined } from "@ant-design/icons";
import { Button, Card } from "antd";
import { DataTable, Due, JobStatusDot, Ledger, PageHeader, useScreen } from "@/components/ui";
import { dueLabel } from "@/lib/format";
import { FONT_DISPLAY } from "@/lib/theme";
import { jobNo, type JobStatus } from "@/lib/jobs";

type Running = { id: string; no: number; title: string; status: JobStatus; dueDate: Date | null; jobber: string };
type Upcoming = { id: string; title: string; dueAt: Date; assignedTo: string };

const panelHead: React.CSSProperties = { margin: 0, fontSize: 16, fontWeight: 600 };
const rowLine: React.CSSProperties = { display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12, padding: "12px 0", borderTop: "1px solid #F1F5F9", fontSize: 14, color: "#0F172A" };

export function Dashboard({
  greeting,
  today,
  counts,
  running,
  upcoming,
}: {
  greeting: string;
  today: string;
  counts: { running: number; drafts: number; toReceive: number; openIssues: number; dueReminders: number };
  running: Running[];
  upcoming: Upcoming[];
}) {
  const router = useRouter();
  const { phone, desktop } = useScreen();
  // ponytail: counted from the 50 most urgent running jobs loaded; fine while overdue jobs are fewer than that.
  const overdue = running.filter((j) => j.dueDate && dueLabel(new Date(j.dueDate)).tone === "overdue").length;
  const stats = [
    { label: "Running jobs", n: counts.running, href: "/jobs" },
    { label: "Overdue", n: overdue, href: "/jobs", tone: overdue ? "#B91C1C" : undefined },
    { label: "To receive & QC", n: counts.toReceive, href: "/jobs?tab=receive" },
    { label: "Drafts to approve", n: counts.drafts, href: "/jobs?tab=drafts" },
  ];
  const todo = [
    { n: counts.drafts, text: counts.drafts === 1 ? "draft to approve" : "drafts to approve", href: "/jobs?tab=drafts" },
    { n: counts.toReceive, text: counts.toReceive === 1 ? "job to receive and check" : "jobs to receive and check", href: "/jobs?tab=receive" },
    { n: counts.openIssues, text: counts.openIssues === 1 ? "QC issue still open" : "QC issues still open", href: "/jobs?tab=issues" },
    { n: counts.dueReminders, text: counts.dueReminders === 1 ? "reminder due" : "reminders due", href: "/tasks" },
  ].filter((t) => t.n > 0);

  return (
    <>
      <PageHeader
        title={greeting}
        subtitle={today}
        actions={
          <>
            <Link href="/challans/new">
              <Button>New challan</Button>
            </Link>
            <Link href="/jobs?new=1">
              <Button type="primary">New job</Button>
            </Link>
          </>
        }
      />

      {/* Stats strip: one panel, four cells (2 × 2 on phones). */}
      <Card styles={{ body: { padding: 0, display: "grid", gridTemplateColumns: phone ? "1fr 1fr" : "repeat(4, minmax(0, 1fr))" } }} style={{ marginBottom: phone ? 16 : 24 }}>
        {stats.map((s, i) => (
          <Link
            key={s.label}
            href={s.href}
            style={{
              padding: phone ? "16px" : "20px 24px",
              display: "flex",
              flexDirection: "column",
              gap: 6,
              color: "inherit",
              borderLeft: (phone ? i % 2 : i) ? "1px solid #EEF2F6" : undefined,
              borderTop: phone && i > 1 ? "1px solid #EEF2F6" : undefined,
            }}
          >
            <span style={{ fontSize: 13, color: "#64748B" }}>{s.label}</span>
            <span style={{ fontFamily: FONT_DISPLAY, fontSize: phone ? 26 : 30, fontWeight: 700, lineHeight: 1, color: s.tone ?? "#0F172A" }}>{s.n}</span>
          </Link>
        ))}
      </Card>

      <div style={{ display: "grid", gridTemplateColumns: desktop ? "minmax(0, 2fr) minmax(0, 1fr)" : "minmax(0, 1fr)", gap: phone ? 16 : 24, alignItems: "start" }}>
        <DataTable<Running>
          cardTitle="Running job work"
          cardExtra={<Link href="/jobs">View all</Link>}
          data={running}
          totalLabel="running jobs"
          pagination={{ pageSize: 8, hideOnSinglePage: true }}
          locale={{ emptyText: "No jobs with jobbers right now" }}
          onOpen={(j) => router.push(`/jobs?view=${j.id}`)}
          columns={[
            {
              title: "Job",
              key: "job",
              render: (_, j) => (
                <div>
                  <div style={{ fontWeight: 500 }}>{j.title}</div>
                  <div style={{ fontSize: 12, color: "#64748B", marginTop: 2 }}>
                    <Ledger>{jobNo(j.no)}</Ledger>
                  </div>
                </div>
              ),
            },
            { title: "Jobber", dataIndex: "jobber" },
            { title: "Status", dataIndex: "status", render: (s: JobStatus) => <JobStatusDot status={s} /> },
            { title: "Due", key: "due", align: "right", render: (_, j) => <Due at={j.dueDate} /> },
          ]}
          mobileRow={(j) => (
            <div style={{ display: "flex", justifyContent: "space-between", gap: 12 }}>
              <div style={{ display: "flex", flexDirection: "column", gap: 3, minWidth: 0 }}>
                <span style={{ fontSize: 15, fontWeight: 500 }}>{j.title}</span>
                <span style={{ fontSize: 13, color: "#64748B" }}>
                  <Ledger>{jobNo(j.no)}</Ledger> · {j.jobber}
                </span>
                <span style={{ fontSize: 13 }}>
                  <JobStatusDot status={j.status} size={7} />
                </span>
              </div>
              <span style={{ flexShrink: 0, fontSize: 13 }}>
                <Due at={j.dueDate} />
              </span>
            </div>
          )}
        />

        <div style={{ display: "flex", flexDirection: "column", gap: phone ? 16 : 24 }}>
          <Card styles={{ body: { padding: "18px 24px 8px" } }}>
            <h2 style={panelHead}>Needs your attention</h2>
            <div style={{ marginTop: 6 }}>
              {todo.length === 0 ? (
                <p style={{ ...rowLine, color: "#64748B", margin: 0 }}>All clear. Nothing waiting on you.</p>
              ) : (
                todo.map((t) => (
                  <Link key={t.href + t.text} href={t.href} style={rowLine}>
                    <span>
                      <b style={{ fontWeight: 600 }}>{t.n}</b> {t.text}
                    </span>
                    <RightOutlined style={{ fontSize: 11, color: "#94A3B8" }} />
                  </Link>
                ))
              )}
            </div>
          </Card>

          <Card styles={{ body: { padding: "18px 24px 8px" } }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <h2 style={panelHead}>Upcoming tasks</h2>
              <Link href="/tasks" style={{ fontSize: 14, fontWeight: 500 }}>
                All tasks
              </Link>
            </div>
            <div style={{ marginTop: 6 }}>
              {upcoming.length === 0 ? (
                <p style={{ ...rowLine, color: "#64748B", margin: 0 }}>Nothing due in the next 7 days.</p>
              ) : (
                upcoming.map((t) => (
                  <Link key={t.id} href="/tasks" style={rowLine}>
                    <span style={{ minWidth: 0 }}>
                      {t.title}
                      <span style={{ display: "block", fontSize: 12, color: "#64748B" }}>{t.assignedTo}</span>
                    </span>
                    <span style={{ flexShrink: 0, fontSize: 13 }}>
                      <Due at={t.dueAt} />
                    </span>
                  </Link>
                ))
              )}
            </div>
          </Card>
        </div>
      </div>
    </>
  );
}
