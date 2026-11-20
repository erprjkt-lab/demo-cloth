"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Alert, Button, Card, Col, Form, Input, Row, Segmented, Select, Space, Tag, Typography } from "antd";
import { Ledger, PageHeader } from "@/components/ui";
import { sumMeters } from "@/lib/validation";
import { transferChallan } from "../../actions";

type Line = { id: string; label: string; lumps: { id: string; seq: number; meters: string }[] };

export function TransferForm({
  challan,
  lines,
  jobbers,
}: {
  challan: { id: string; no: string; jobber: string };
  lines: Line[];
  jobbers: { id: string; name: string }[];
}) {
  const router = useRouter();
  const [toJobberId, setTo] = useState<string>();
  const [type, setType] = useState<"FULL" | "PARTIAL">("FULL");
  const [picked, setPicked] = useState<Set<string>>(new Set());
  const [note, setNote] = useState("");
  const [error, setError] = useState("");
  const [pending, start] = useTransition();

  const toggle = (ids: string[], on: boolean) =>
    setPicked((p) => {
      const n = new Set(p);
      ids.forEach((i) => (on ? n.add(i) : n.delete(i)));
      return n;
    });
  const all = lines.flatMap((l) => l.lumps);
  const moving = type === "FULL" ? all : all.filter((x) => picked.has(x.id));

  function submit() {
    setError("");
    start(async () => {
      const res = await transferChallan(challan.id, { toJobberId, type, lumpIds: [...picked], note });
      if (res?.error) setError(res.error);
    });
  }

  return (
    <>
      <PageHeader
        title={`Transfer ${challan.no}`}
        subtitle={`Now with ${challan.jobber}`}
        breadcrumbs={[
          { label: "Challans", href: "/challans" },
          { label: challan.no, href: `/challans/${challan.id}` },
          { label: "Transfer" },
        ]}
        actions={<Button onClick={() => router.back()}>Cancel</Button>}
      />

      <Card style={{ marginBottom: 12 }}>
        <Form layout="vertical">
          <Row gutter={12}>
            <Col xs={24} md={12}>
              <Form.Item label="Move to jobber" required>
                <Select
                  showSearch
                  optionFilterProp="label"
                  placeholder="Select jobber"
                  value={toJobberId}
                  onChange={setTo}
                  options={jobbers.map((j) => ({ value: j.id, label: j.name }))}
                />
              </Form.Item>
            </Col>
            <Col xs={24} md={12}>
              <Form.Item label="Transfer">
                <Segmented
                  block
                  value={type}
                  onChange={(v) => setType(v as "FULL" | "PARTIAL")}
                  options={[
                    { value: "FULL", label: "Full challan" },
                    { value: "PARTIAL", label: "Selected lumps" },
                  ]}
                />
              </Form.Item>
            </Col>
            <Col span={24}>
              <Form.Item label="Note" style={{ marginBottom: 0 }}>
                <Input value={note} maxLength={200} onChange={(e) => setNote(e.target.value)} />
              </Form.Item>
            </Col>
          </Row>
        </Form>
      </Card>

      {type === "PARTIAL" &&
        lines.map((l) => {
          const allOn = l.lumps.every((x) => picked.has(x.id));
          return (
            <Card
              key={l.id}
              size="small"
              title={l.label}
              style={{ marginBottom: 12 }}
              extra={
                <Button type="link" size="small" onClick={() => toggle(l.lumps.map((x) => x.id), !allOn)}>
                  {allOn ? "Clear" : "Select all"}
                </Button>
              }
            >
              <Space size={[6, 6]} wrap>
                {l.lumps.map((x) => (
                  <Tag.CheckableTag
                    key={x.id}
                    checked={picked.has(x.id)}
                    onChange={(on) => toggle([x.id], on)}
                    style={{ border: "1px solid #E2E8F0", padding: "2px 8px" }}
                  >
                    <span style={{ opacity: 0.6, fontSize: 10 }}>{x.seq}</span> <Ledger>{x.meters}</Ledger>
                  </Tag.CheckableTag>
                ))}
              </Space>
            </Card>
          );
        })}

      {error && <Alert type="error" showIcon title={error} style={{ marginBottom: 12 }} />}
      <Card
        size="small"
        style={{ position: "sticky", bottom: 0, zIndex: 5, boxShadow: "0 -4px 16px rgba(15,23,42,0.08)" }}
        styles={{ body: { display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12 } }}
      >
        <div>
          <Typography.Text type="secondary">{moving.length} lumps moving</Typography.Text>
          <div style={{ fontSize: 20, fontWeight: 700 }}>
            <Ledger>{sumMeters(moving.map((x) => x.meters))} m</Ledger>
          </div>
        </div>
        <Button type="primary" size="large" loading={pending} disabled={!moving.length || !toJobberId} onClick={submit}>
          Transfer
        </Button>
      </Card>
    </>
  );
}
