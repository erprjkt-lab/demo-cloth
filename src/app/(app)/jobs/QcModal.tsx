"use client";

import { useEffect, useState } from "react";
import { DeleteOutlined, PlusOutlined } from "@ant-design/icons";
import { Alert, Button, Col, Descriptions, Form, Input, InputNumber, Modal, Radio, Row, Select, Statistic, Typography } from "antd";
import { useRun } from "@/components/ui";
import { jobNo, QC_ISSUE_LABEL, QC_ISSUE_TYPES, type JobStatus } from "@/lib/jobs";
import { confirmReceipt } from "./actions";

type Job = { id: string; no: number; title: string; jobber: string; pieces: number | null };

/**
 * QC when the office receives a job back: pieces received and rejected; not received is worked
 * out from what was sent. Anything wrong → accept and close (tracked) or send back for rework.
 */
export function QcModal({ job, onClose, onDone }: { job: Job | null; onClose: () => void; onDone?: (s: JobStatus) => void }) {
  const run = useRun();
  const [form] = Form.useForm();
  const [saving, setSaving] = useState(false);
  const received: number | null = Form.useWatch("receivedPieces", form) ?? null;
  const rejected: number = Form.useWatch("rejectedPieces", form) ?? 0;
  const outcome = Form.useWatch("outcome", form);
  const others = Form.useWatch("issues", form) ?? [];

  useEffect(() => {
    if (!job) return;
    form.resetFields();
    form.setFieldsValue({ receivedPieces: job.pieces, rejectedPieces: 0, outcome: "ACCEPT", issues: [] });
  }, [job, form]);

  const sent = job?.pieces ?? null;
  const notReceived = sent !== null && received !== null ? Math.max(0, sent - received) : null;
  const accepted = received !== null ? Math.max(0, received - rejected) : null;
  const problems = (notReceived ?? 0) > 0 || rejected > 0 || others.length > 0;

  async function submit() {
    const v = await form.validateFields();
    setSaving(true);
    const rework = problems && v.outcome === "REWORK";
    const ok = await run(
      confirmReceipt(job!.id, { ...v, outcome: problems ? v.outcome : "ACCEPT" }),
      rework ? "Sent back to the jobber for rework" : problems ? "Received and completed; problems kept open" : "Received, QC passed",
    );
    setSaving(false);
    if (ok) {
      onDone?.(rework ? "IN_PROGRESS" : "COMPLETED");
      onClose();
    }
  }

  const okText = !problems ? "Confirm — QC passed" : outcome === "REWORK" ? "Send back for rework" : "Accept & complete";
  const fmt = (n: number | null) => (n === null ? "—" : n.toLocaleString("en-IN"));

  return (
    <Modal
      title={job ? `Receive & QC · ${jobNo(job.no)}` : ""}
      open={!!job}
      onCancel={onClose}
      width={680}
      destroyOnHidden
      footer={[
        <Button key="cancel" onClick={onClose}>
          Cancel
        </Button>,
        <Button key="ok" type="primary" danger={problems && outcome === "REWORK"} loading={saving} onClick={submit}>
          {okText}
        </Button>,
      ]}
    >
      {job && (
        <Form form={form} layout="vertical">
          <Descriptions
            size="small"
            column={{ xs: 1, sm: 2 }}
            style={{ marginBottom: 12 }}
            items={[
              { label: "Job", children: job.title },
              { label: "Jobber", children: job.jobber },
            ]}
          />

          <Row gutter={12}>
            <Col xs={12} sm={8}>
              <Form.Item
                name="receivedPieces"
                label="Pieces received"
                rules={sent !== null ? [{ type: "number", max: sent, message: `Max ${sent} (pieces sent)` }] : undefined}
              >
                <InputNumber min={0} style={{ width: "100%" }} placeholder="Count" />
              </Form.Item>
            </Col>
            <Col xs={12} sm={8}>
              <Form.Item
                name="rejectedPieces"
                label="Rejected"
                rules={[{ type: "number", max: received ?? undefined, message: "More than received" }]}
              >
                <InputNumber min={0} style={{ width: "100%" }} />
              </Form.Item>
            </Col>
            <Col xs={24} sm={8}>
              <Form.Item name="rejectReason" label="Reject reason">
                <Input placeholder={rejected > 0 ? "e.g. loose stitching" : "If any rejected"} disabled={rejected === 0} />
              </Form.Item>
            </Col>
          </Row>

          {/* Live tally: what this receipt means for the job. */}
          <Row gutter={8} style={{ background: "#F8FAFC", border: "1px solid #EEF2F6", borderRadius: 8, padding: "8px 4px", marginBottom: 16 }}>
            {[
              { title: "Sent", value: fmt(sent) },
              { title: "Received", value: fmt(received) },
              { title: "Not received", value: fmt(notReceived), color: notReceived ? "#D97706" : undefined },
              { title: "Rejected", value: fmt(rejected), color: rejected ? "#DC2626" : undefined },
              { title: "Accepted", value: fmt(accepted), color: "#16A34A" },
            ].map((t) => (
              <Col key={t.title} flex="1 1 18%" style={{ minWidth: 64 }}>
                <Statistic title={t.title} value={t.value} styles={{ content: { fontSize: 18, fontWeight: 600, color: t.color } }} />
              </Col>
            ))}
          </Row>

          <Typography.Text strong>Other issues</Typography.Text>{" "}
          <Typography.Text type="secondary">(optional: work not done properly, anything else)</Typography.Text>
          <Form.List name="issues">
            {(fields, { add, remove }) => (
              <div style={{ marginTop: 8 }}>
                {fields.map((f) => (
                  <Row key={f.key} gutter={8} align="top" wrap>
                    <Col xs={12} sm={7}>
                      <Form.Item name={[f.name, "type"]} rules={[{ required: true, message: "Pick one" }]}>
                        <Select placeholder="Type" options={QC_ISSUE_TYPES.map((t) => ({ value: t, label: QC_ISSUE_LABEL[t] }))} />
                      </Form.Item>
                    </Col>
                    <Col xs={9} sm={5}>
                      <Form.Item name={[f.name, "qty"]}>
                        <InputNumber min={1} placeholder="Qty" style={{ width: "100%" }} />
                      </Form.Item>
                    </Col>
                    <Col xs={3} sm={2} style={{ textAlign: "right" }}>
                      <Button type="text" danger icon={<DeleteOutlined />} aria-label="Remove issue" onClick={() => remove(f.name)} />
                    </Col>
                    <Col xs={24} sm={10}>
                      <Form.Item name={[f.name, "note"]}>
                        <Input placeholder="Details, e.g. buttons not fixed on 5 tops" />
                      </Form.Item>
                    </Col>
                  </Row>
                ))}
                <Button type="dashed" block icon={<PlusOutlined />} onClick={() => add({ type: "NOT_DONE" })} style={{ marginBottom: 16 }}>
                  Add issue
                </Button>
              </div>
            )}
          </Form.List>

          {problems ? (
            <Form.Item name="outcome" label="What now?">
              <Radio.Group
                style={{ display: "flex", flexDirection: "column", gap: 8 }}
                options={[
                  { value: "ACCEPT", label: "Accept and close the job — keep rejected / not received open to follow up" },
                  { value: "REWORK", label: "Send back to the jobber for rework — they see what's rejected and missing" },
                ]}
              />
            </Form.Item>
          ) : (
            <Alert type="success" showIcon style={{ marginBottom: 16 }} title="Everything received and accepted. QC passes." />
          )}

          <Form.Item name="notes" label="Notes" style={{ marginBottom: 0 }}>
            <Input.TextArea rows={2} placeholder="Optional" />
          </Form.Item>
        </Form>
      )}
    </Modal>
  );
}
