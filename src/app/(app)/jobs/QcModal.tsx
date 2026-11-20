"use client";

import { useEffect, useState } from "react";
import { DeleteOutlined } from "@ant-design/icons";
import { Button, Drawer, Form, Input, InputNumber, Modal, Radio, Select } from "antd";
import { useRun, useScreen } from "@/components/ui";
import { FONT_DISPLAY } from "@/lib/theme";
import { QC_ISSUE_LABEL, QC_ISSUE_TYPES, type JobStatus } from "@/lib/jobs";
import { confirmReceipt } from "./actions";

type Job = { id: string; no: number; title: string; jobber: string; pieces: number | null };

/** − [ n ] + : big enough for a thumb, and the number can still be typed. */
function Counter({ value, onChange, max, id }: { value?: number | null; onChange?: (v: number | null) => void; max?: number; id?: string }) {
  const v = value ?? 0;
  const set = (x: number) => onChange?.(Math.max(0, max !== undefined ? Math.min(max, x) : x));
  const round: React.CSSProperties = { width: 44, height: 44, borderRadius: "50%", fontSize: 20, color: "#334155" };
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
      <Button aria-label="Decrease" style={round} onClick={() => set(v - 1)}>
        −
      </Button>
      <InputNumber
        id={id}
        controls={false}
        variant="borderless"
        min={0}
        max={max}
        value={value}
        onChange={(x) => onChange?.(x)}
        inputMode="numeric"
        style={{ width: 80 }}
        styles={{ input: { textAlign: "center", fontFamily: "var(--font-plex-mono)", fontSize: 20 } }}
      />
      <Button aria-label="Increase" style={round} onClick={() => set(v + 1)}>
        +
      </Button>
    </div>
  );
}

/**
 * Receive & QC when a job comes back: pieces received and rejected; not received is worked out
 * from what was sent. Anything short → close and follow up (tracked) or send back for rework.
 * A bottom sheet on phones, a dialog elsewhere.
 */
export function QcModal({ job, onClose, onDone }: { job: Job | null; onClose: () => void; onDone?: (s: JobStatus) => void }) {
  const run = useRun();
  const { phone } = useScreen();
  const [form] = Form.useForm();
  const [saving, setSaving] = useState(false);
  const received: number | null = Form.useWatch("receivedPieces", form) ?? null;
  const rejected: number = Form.useWatch("rejectedPieces", form) ?? 0;
  const others = Form.useWatch("issues", form) ?? [];

  useEffect(() => {
    if (!job) return;
    form.resetFields();
    form.setFieldsValue({ receivedPieces: job.pieces ?? 0, rejectedPieces: 0, outcome: "ACCEPT", issues: [] });
  }, [job, form]);

  const sent = job?.pieces ?? null;
  const notReceived = sent !== null && received !== null ? Math.max(0, sent - received) : 0;
  const accepted = Math.max(0, (received ?? 0) - rejected);
  const problems = notReceived > 0 || rejected > 0 || others.length > 0;

  async function submit() {
    const v = await form.validateFields();
    setSaving(true);
    const rework = problems && v.outcome === "REWORK";
    const ok = await run(
      confirmReceipt(job!.id, { ...v, outcome: problems ? v.outcome : "ACCEPT" }),
      rework ? "Sent back to the jobber for rework" : problems ? "Received and closed; the shortfall stays open" : "Received, QC passed",
    );
    setSaving(false);
    if (ok) {
      onDone?.(rework ? "IN_PROGRESS" : "COMPLETED");
      onClose();
    }
  }

  const fmt = (x: number) => x.toLocaleString("en-IN");
  const line: React.CSSProperties = { display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12, padding: "12px 0", borderBottom: "1px solid #F1F5F9" };

  const body = job && (
    <Form form={form} layout="vertical" style={{ display: "flex", flexDirection: "column", gap: 20 }}>
      <div>
        <h2 style={{ margin: 0, fontFamily: FONT_DISPLAY, fontSize: 22, fontWeight: 700 }}>Receive &amp; QC</h2>
        <p style={{ margin: "4px 0 0", fontSize: 14, color: "#64748B" }}>
          {job.jobber} sent back {job.title}.{sent !== null && ` ${fmt(sent)} pieces were sent.`}
        </p>
      </div>

      <div>
        <div style={line}>
          <label htmlFor="qc-recv" style={{ fontSize: 16 }}>
            Received
          </label>
          <Form.Item name="receivedPieces" noStyle>
            <Counter id="qc-recv" max={sent ?? undefined} />
          </Form.Item>
        </div>
        <div style={line}>
          <label htmlFor="qc-rej" style={{ fontSize: 16 }}>
            Rejected
          </label>
          <Form.Item name="rejectedPieces" noStyle rules={[{ type: "number", max: received ?? undefined, message: "More than received" }]}>
            <Counter id="qc-rej" max={received ?? undefined} />
          </Form.Item>
        </div>
        {rejected > 0 && (
          <div style={{ ...line, flexDirection: "column", alignItems: "stretch", gap: 4 }}>
            <label htmlFor="qc-why" style={{ fontSize: 13, color: "#64748B" }}>
              Why rejected
            </label>
            <Form.Item name="rejectReason" noStyle>
              <Input id="qc-why" variant="borderless" placeholder="e.g. loose stitching" style={{ padding: 0, fontSize: 16 }} />
            </Form.Item>
          </div>
        )}
      </div>

      <p style={{ margin: 0, fontSize: 15, color: "#334155" }}>
        <b style={{ color: "#15803D" }}>{fmt(accepted)}</b> accepted
        {notReceived > 0 && (
          <>
            {" · "}
            <b style={{ color: "#B45309" }}>{fmt(notReceived)}</b> not received
          </>
        )}
        {rejected > 0 && (
          <>
            {" · "}
            <b style={{ color: "#B91C1C" }}>{fmt(rejected)}</b> rejected
          </>
        )}
      </p>

      {/* Anything else wrong (work not done properly, …): optional, tucked behind a link. */}
      <Form.List name="issues">
        {(fields, { add, remove }) => (
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            {fields.map((f) => (
              <div key={f.key} style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
                <Form.Item name={[f.name, "type"]} noStyle rules={[{ required: true }]}>
                  <Select style={{ flex: "1 1 140px" }} options={QC_ISSUE_TYPES.map((t) => ({ value: t, label: QC_ISSUE_LABEL[t] }))} />
                </Form.Item>
                <Form.Item name={[f.name, "qty"]} noStyle>
                  <InputNumber min={1} placeholder="Qty" style={{ width: 90 }} inputMode="numeric" />
                </Form.Item>
                <Button type="text" danger icon={<DeleteOutlined />} aria-label="Remove issue" onClick={() => remove(f.name)} />
                <Form.Item name={[f.name, "note"]} noStyle>
                  <Input placeholder="Details, e.g. buttons not fixed on 5 tops" style={{ flex: "1 1 100%" }} />
                </Form.Item>
              </div>
            ))}
            <Button type="link" style={{ alignSelf: "flex-start", paddingInline: 0 }} onClick={() => add({ type: "NOT_DONE" })}>
              + Add another issue
            </Button>
          </div>
        )}
      </Form.List>

      {problems && (
        <Form.Item name="outcome" noStyle>
          <Radio.Group
            style={{ display: "flex", flexDirection: "column" }}
            options={[
              { value: "ACCEPT", label: <span style={{ fontSize: 16, lineHeight: "48px" }}>Close the job, follow up the shortfall</span> },
              { value: "REWORK", label: <span style={{ fontSize: 16, lineHeight: "48px" }}>Send back to {job.jobber} for rework</span> },
            ]}
          />
        </Form.Item>
      )}

      <Form.Item name="notes" noStyle>
        <Input placeholder="Note (optional)" />
      </Form.Item>

      <Button type="primary" block loading={saving} onClick={submit} style={{ height: 52, fontSize: 16, borderRadius: 12 }}>
        Confirm
      </Button>
    </Form>
  );

  return phone ? (
    <Drawer
      placement="bottom"
      open={!!job}
      onClose={onClose}
      size="auto"
      destroyOnHidden
      styles={{
        header: { display: "none" },
        wrapper: { borderRadius: "20px 20px 0 0", overflow: "hidden", maxHeight: "92dvh" },
        body: { padding: "10px 20px calc(20px + env(safe-area-inset-bottom))" },
      }}
    >
      <span aria-hidden="true" style={{ display: "block", margin: "0 auto 14px", width: 40, height: 4, borderRadius: 2, background: "#CBD5E1" }} />
      {body}
    </Drawer>
  ) : (
    <Modal open={!!job} onCancel={onClose} width={480} footer={null} destroyOnHidden centered>
      {body}
    </Modal>
  );
}
