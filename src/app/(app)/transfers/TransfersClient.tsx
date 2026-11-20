"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { EyeOutlined, PlusOutlined } from "@ant-design/icons";
import { Alert, Button, Checkbox, Form, Input, Modal, Segmented, Select, Tag } from "antd";
import type { TableColumnsType } from "antd";
import { DataTable, Ledger, PageHeader, useRun } from "@/components/ui";
import { transferJob } from "./actions";

type Option = { value: string; label: string };
type JobOption = Option & { jobberId: string; challans: number };
type Row = {
  id: string;
  at: string;
  what: { kind: "job" | "challan"; id: string; no: string } | null;
  from: string;
  to: string;
  type: "FULL" | "PARTIAL" | "JOB";
  note: string | null;
  by: string;
};

const TYPE_TAG = { JOB: { label: "Job", color: "gold" }, FULL: { label: "Full challan", color: "blue" }, PARTIAL: { label: "Selected lumps", color: "purple" } };
const hrefOf = (w: NonNullable<Row["what"]>) => (w.kind === "job" ? "/jobs" : `/challans/${w.id}`);

export function TransfersClient({
  rows,
  challans,
  jobs,
  jobbers,
  canWrite,
  initialJobId,
}: {
  rows: Row[];
  challans: Option[];
  jobs: JobOption[];
  jobbers: Option[];
  canWrite: boolean;
  initialJobId?: string;
}) {
  const run = useRun();
  const router = useRouter();
  const startJob = jobs.some((j) => j.value === initialJobId) ? initialJobId : undefined;
  const [open, setOpen] = useState(false);
  // Opened after hydration: a modal rendered open on the server doesn't match the client.
  useEffect(() => {
    if (startJob) setOpen(true);
  }, [startJob]);
  const [kind, setKind] = useState<"job" | "challan">("job");
  const [challanId, setChallanId] = useState<string>();
  const [saving, setSaving] = useState(false);
  const [form] = Form.useForm();
  const jobId = Form.useWatch("jobWorkId", form);
  const job = jobs.find((j) => j.value === jobId);

  async function submit() {
    if (kind === "challan") return router.push(`/challans/${challanId}/transfer`);
    const v = await form.validateFields();
    setSaving(true);
    const ok = await run(transferJob(v), "Job transferred");
    setSaving(false);
    if (ok) {
      setOpen(false);
      form.resetFields();
      // Drop ?job= without a navigation, so the refresh useRun already did keeps the new row.
      window.history.replaceState(null, "", "/transfers");
    }
  }

  const columns: TableColumnsType<Row> = [
    { title: "When", dataIndex: "at" },
    {
      title: "Job / Challan",
      dataIndex: "what",
      render: (w: Row["what"]) => (w ? <Link href={hrefOf(w)}><Ledger>{w.no}</Ledger></Link> : "—"),
    },
    { title: "Type", dataIndex: "type", render: (t: Row["type"]) => <Tag color={TYPE_TAG[t].color}>{TYPE_TAG[t].label}</Tag> },
    { title: "From", dataIndex: "from" },
    { title: "To", dataIndex: "to" },
    { title: "Note", dataIndex: "note", responsive: ["md"], render: (n) => n ?? "—" },
    { title: "By", dataIndex: "by", responsive: ["lg"] },
  ];

  return (
    <>
      <PageHeader
        title="Job Transfer"
        subtitle="Move a job, a challan, or some of a challan's lumps to another jobber"
        breadcrumbs={[{ label: "Home", href: "/" }, { label: "Job Transfer" }]}
        actions={
          canWrite && (
            <Button type="primary" icon={<PlusOutlined />} onClick={() => setOpen(true)}>
              New Transfer
            </Button>
          )
        }
      />
      <DataTable<Row>
        columns={columns}
        data={rows}
        totalLabel="transfers"
        search={(r) => `${r.what?.no ?? ""} ${r.from} ${r.to} ${r.note ?? ""}`}
        searchPlaceholder="Search job, challan or jobber"
        actions={(r) => [{ key: "view", label: "View", icon: <EyeOutlined />, hidden: !r.what, href: r.what ? hrefOf(r.what) : undefined }]}
      />

      <Modal
        title="New Transfer"
        open={open}
        okText={kind === "job" ? "Transfer Job" : "Continue"}
        confirmLoading={saving}
        okButtonProps={{ disabled: kind === "challan" && !challanId }}
        onOk={submit}
        onCancel={() => {
          setOpen(false);
          if (startJob) window.history.replaceState(null, "", "/transfers");
        }}
        destroyOnHidden
      >
        <Segmented
          block
          value={kind}
          onChange={(v) => setKind(v as "job" | "challan")}
          options={[
            { value: "job", label: "Job Work" },
            { value: "challan", label: "Challan / lumps" },
          ]}
          style={{ marginBottom: 16 }}
        />
        {kind === "job" ? (
          <Form form={form} layout="vertical" initialValues={{ jobWorkId: startJob, moveChallans: true }}>
            <Form.Item name="jobWorkId" label="Job" rules={[{ required: true, message: "Pick the job" }]}>
              <Select showSearch optionFilterProp="label" placeholder="Pick the job to move" options={jobs} />
            </Form.Item>
            <Form.Item name="toJobberId" label="Move to jobber" rules={[{ required: true, message: "Pick the new jobber" }]}>
              <Select
                showSearch
                optionFilterProp="label"
                placeholder="Select jobber"
                options={jobbers.filter((j) => j.value !== job?.jobberId)}
              />
            </Form.Item>
            <Form.Item name="moveChallans" valuePropName="checked" style={{ marginBottom: 8 }}>
              <Checkbox disabled={!job?.challans}>
                Move the fabric too ({job?.challans ?? 0} linked challan{job?.challans === 1 ? "" : "s"})
              </Checkbox>
            </Form.Item>
            <Form.Item name="note" label="Note">
              <Input maxLength={200} placeholder="Why it's moving (optional)" />
            </Form.Item>
            <Alert type="info" showIcon title="The new jobber starts from Assigned and confirms Material Received when the fabric reaches them." />
          </Form>
        ) : (
          <Select
            showSearch
            optionFilterProp="label"
            placeholder="Pick the challan to transfer"
            style={{ width: "100%" }}
            value={challanId}
            onChange={setChallanId}
            options={challans}
          />
        )}
      </Modal>
    </>
  );
}
