"use client";

import { useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import dayjs from "dayjs";
import { DeleteOutlined, PlusOutlined } from "@ant-design/icons";
import { Alert, Button, Card, Col, DatePicker, Form, Input, Row, Segmented, Select, Space, Typography } from "antd";
import { PhotoInput, type Photo } from "@/components/PhotoInput";
import { Ledger, PageHeader } from "@/components/ui";
import { today } from "@/lib/format";
import { MAX_LUMPS_PER_LINE, PART_LABEL, PARTS, sumMeters } from "@/lib/validation";
import { createChallan } from "./actions";

type Catalog = { id: string; name: string; volume: string | null; fabric: string | null; designs: { id: string; colourName: string }[] };
type Job = { id: string; label: string; jobberId: string; catalogId: string | null };
type Line = { key: number; designId?: string; partType: (typeof PARTS)[number]; lumps: string[] };

export function ChallanForm({
  jobbers,
  catalogs,
  jobs,
  initialJobId,
}: {
  jobbers: { id: string; name: string }[];
  catalogs: Catalog[];
  jobs: Job[];
  initialJobId?: string;
}) {
  const router = useRouter();
  const startJob = jobs.find((j) => j.id === initialJobId);
  const nextKey = useRef(1);
  const newLine = (): Line => ({ key: nextKey.current++, partType: "TOP", lumps: [""] });

  const [date, setDate] = useState(today);
  const [jobberId, setJobberId] = useState<string | undefined>(startJob?.jobberId);
  const [jobWorkId, setJobWorkId] = useState<string | undefined>(startJob?.id);
  const [catalogId, setCatalogId] = useState<string | undefined>(startJob?.catalogId ?? undefined);
  const [fabricDetail, setFabricDetail] = useState(catalogs.find((c) => c.id === startJob?.catalogId)?.fabric ?? "");
  const [remarks, setRemarks] = useState("");
  const [photo, setPhoto] = useState<Photo>(null);
  const [lines, setLines] = useState<Line[]>(() => [newLine()]);
  const [focus, setFocus] = useState("");
  const [error, setError] = useState("");
  const [pending, start] = useTransition();

  const catalog = catalogs.find((c) => c.id === catalogId);
  const grandTotal = sumMeters(lines.flatMap((l) => l.lumps));

  function pickCatalog(id?: string) {
    const prev = catalog?.fabric ?? "";
    setCatalogId(id);
    if (!fabricDetail || fabricDetail === prev) setFabricDetail(catalogs.find((c) => c.id === id)?.fabric ?? "");
    setLines((ls) => ls.map((l) => ({ ...l, designId: undefined })));
  }

  function pickJob(id?: string) {
    setJobWorkId(id);
    const job = jobs.find((j) => j.id === id);
    if (job?.catalogId && job.catalogId !== catalogId) pickCatalog(job.catalogId);
  }

  const updateLine = (key: number, patch: Partial<Line>) =>
    setLines((ls) => ls.map((l) => (l.key === key ? { ...l, ...patch } : l)));

  function addLump(l: Line) {
    if (l.lumps.length >= MAX_LUMPS_PER_LINE) return;
    updateLine(l.key, { lumps: [...l.lumps, ""] });
    setFocus(`${l.key}:${l.lumps.length}`);
  }

  function submit() {
    setError("");
    start(async () => {
      const res = await createChallan({
        date,
        jobberId,
        catalogId,
        jobWorkId,
        fabricDetail,
        remarks,
        designPhotoUrl: photo?.url ?? null,
        designPhotoId: photo?.publicId ?? null,
        // Blank lump boxes are ignored; the server recomputes everything anyway.
        lines: lines.map((l) => ({ designId: l.designId, partType: l.partType, lumps: l.lumps.filter((m) => m.trim()) })),
      });
      if (res?.error) setError(res.error);
    });
  }

  return (
    <>
      <PageHeader
        title="New Challan"
        breadcrumbs={[{ label: "Challans", href: "/challans" }, { label: "New Challan" }]}
        actions={
          <>
            <Button onClick={() => router.back()}>Cancel</Button>
            <Button type="primary" loading={pending} onClick={submit}>
              Save Challan
            </Button>
          </>
        }
      />

      <Card title="Challan details" style={{ marginBottom: 12 }}>
        <Form layout="vertical">
          <Row gutter={12}>
            <Col xs={24} md={6}>
              <Form.Item label="Date" required>
                <DatePicker
                  inputReadOnly
                  style={{ width: "100%" }}
                  format="DD MMM YYYY"
                  allowClear={false}
                  value={dayjs(date)}
                  onChange={(d) => d && setDate(d.format("YYYY-MM-DD"))}
                />
              </Form.Item>
            </Col>
            <Col xs={24} md={9}>
              <Form.Item label="Jobber" required>
                <Select
                  showSearch
                  optionFilterProp="label"
                  placeholder="Select jobber"
                  value={jobberId}
                  onChange={(id) => {
                    setJobberId(id);
                    if (jobs.find((j) => j.id === jobWorkId)?.jobberId !== id) setJobWorkId(undefined);
                  }}
                  options={jobbers.map((j) => ({ value: j.id, label: j.name }))}
                />
              </Form.Item>
            </Col>
            <Col xs={24} md={9}>
              <Form.Item label="Job Work" tooltip="Link this fabric to a job so the jobber's job shows it">
                <Select
                  allowClear
                  showSearch
                  optionFilterProp="label"
                  placeholder={jobberId ? "Select job (optional)" : "Pick a jobber first"}
                  disabled={!jobberId}
                  value={jobWorkId}
                  onChange={pickJob}
                  options={jobs.filter((j) => j.jobberId === jobberId).map((j) => ({ value: j.id, label: j.label }))}
                />
              </Form.Item>
            </Col>
            <Col xs={24} md={12}>
              <Form.Item label="Catalogue" required>
                <Select
                  showSearch
                  optionFilterProp="label"
                  placeholder="Select catalogue"
                  value={catalogId}
                  onChange={pickCatalog}
                  options={catalogs.map((c) => ({ value: c.id, label: `${c.name} ${c.volume ?? ""}`.trim() }))}
                />
              </Form.Item>
            </Col>
            <Col xs={24} md={12}>
              <Form.Item label="Fabric detail">
                <Input value={fabricDetail} onChange={(e) => setFabricDetail(e.target.value)} />
              </Form.Item>
            </Col>
          </Row>
        </Form>
      </Card>

      {lines.map((l, li) => (
        <Card
          key={l.key}
          size="small"
          title={`Line ${li + 1}`}
          style={{ marginBottom: 12 }}
          extra={
            <Space>
              <Typography.Text type="secondary">
                {l.lumps.filter((m) => m.trim()).length} lumps · <Ledger>{sumMeters(l.lumps)} m</Ledger>
              </Typography.Text>
              {lines.length > 1 && (
                <Button type="text" danger size="small" icon={<DeleteOutlined />} onClick={() => setLines(lines.filter((x) => x.key !== l.key))} />
              )}
            </Space>
          }
        >
          <Row gutter={12} style={{ marginBottom: 12 }}>
            <Col xs={24} md={12}>
              <Select
                style={{ width: "100%" }}
                placeholder={catalog ? "Design colour" : "Pick a catalogue first"}
                disabled={!catalog}
                value={l.designId}
                onChange={(designId) => updateLine(l.key, { designId })}
                options={catalog?.designs.map((d) => ({ value: d.id, label: d.colourName }))}
              />
            </Col>
            <Col xs={24} md={12}>
              <Segmented
                block
                value={l.partType}
                onChange={(partType) => updateLine(l.key, { partType: partType as Line["partType"] })}
                options={PARTS.map((p) => ({ value: p, label: PART_LABEL[p] }))}
              />
            </Col>
          </Row>

          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(96px, 1fr))", gap: 8 }}>
            {l.lumps.map((m, i) => (
              <Input
                key={i}
                prefix={<span style={{ fontSize: 11, color: "#94A3B8" }}>{i + 1}</span>}
                inputMode="decimal"
                placeholder="m"
                className="ledger"
                style={{ textAlign: "right" }}
                autoFocus={focus === `${l.key}:${i}`}
                value={m}
                onChange={(e) =>
                  updateLine(l.key, { lumps: l.lumps.map((x, j) => (j === i ? e.target.value.replace(/[^\d.]/g, "") : x)) })
                }
                onPressEnter={() => i === l.lumps.length - 1 && addLump(l)}
                suffix={
                  l.lumps.length > 1 && (
                    <DeleteOutlined
                      style={{ color: "#CBD5E1", fontSize: 11 }}
                      onClick={() => updateLine(l.key, { lumps: l.lumps.filter((_, j) => j !== i) })}
                    />
                  )
                }
              />
            ))}
          </div>
          <Button type="dashed" icon={<PlusOutlined />} style={{ marginTop: 10 }} onClick={() => addLump(l)}>
            Add lump
          </Button>
        </Card>
      ))}

      <Button type="dashed" block icon={<PlusOutlined />} style={{ marginBottom: 12 }} onClick={() => setLines([...lines, newLine()])}>
        Add line (colour / part)
      </Button>

      <Card title="Photo and remarks" style={{ marginBottom: 12 }}>
        <Form layout="vertical">
          <Form.Item label="Design photo">
            <PhotoInput value={photo} onChange={setPhoto} />
          </Form.Item>
          <Form.Item label="Remarks" style={{ marginBottom: 0 }}>
            <Input.TextArea rows={2} value={remarks} onChange={(e) => setRemarks(e.target.value)} />
          </Form.Item>
        </Form>
      </Card>

      {error && <Alert type="error" showIcon title={error} style={{ marginBottom: 12 }} />}
      <Card
        size="small"
        style={{ position: "sticky", bottom: 0, zIndex: 5, boxShadow: "0 -4px 16px rgba(15,23,42,0.08)" }}
        styles={{ body: { display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12 } }}
      >
        <div>
          <Typography.Text type="secondary">Total</Typography.Text>
          <div style={{ fontSize: 20, fontWeight: 700 }}>
            <Ledger>{grandTotal} m</Ledger>
          </div>
        </div>
        <Button type="primary" size="large" loading={pending} onClick={submit}>
          Save Challan
        </Button>
      </Card>
    </>
  );
}
