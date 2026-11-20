"use client";

import { useEffect, useState } from "react";
import { DeleteOutlined, PlusOutlined } from "@ant-design/icons";
import { Alert, Button, Col, Drawer, Form, Input, InputNumber, Row, Space, Typography } from "antd";
import { PhotoInput, type Photo } from "@/components/PhotoInput";
import { MasterPicker, useRun, useDrawerSize } from "@/components/ui";
import type { MasterOption } from "@/lib/masters";
import { SIZE_LABEL, SIZES } from "@/lib/validation";
import { saveCatalog } from "./actions";

export type CatalogInput = {
  id: string;
  name: string;
  volume: string | null;
  code: string | null;
  fabric: string | null;
  typeId: string;
  typeName: string;
  piecesPerDesign: number;
  designs: { id: string; colourName: string }[];
  sizes: Partial<Record<(typeof SIZES)[number], number>>;
  photo: Photo;
};

/** Create (catalog = null) or edit a catalogue. open = catalog !== undefined. */
export function CatalogDrawer({
  catalog,
  types,
  onClose,
}: {
  catalog: CatalogInput | null | undefined;
  /** Catalogue types from Masters. */
  types: MasterOption[];
  onClose: () => void;
}) {
  const run = useRun();
  const [form] = Form.useForm();
  const [saving, setSaving] = useState(false);
  const designs = Form.useWatch("designs", form) ?? [];
  const perDesign = Form.useWatch("piecesPerDesign", form) ?? 0;
  const sizes = Form.useWatch("sizes", form) ?? {};
  const ratioSum = SIZES.reduce((a, s) => a + (Number(sizes[s]) || 0), 0);

  useEffect(() => {
    if (catalog === undefined) return;
    form.resetFields();
    form.setFieldsValue(catalog ?? { typeId: types.find((t) => t.isActive)?.id, designs: [{ colourName: "" }], sizes: {} });
  }, [catalog, form, types]);

  async function submit() {
    const { photo, ...v } = await form.validateFields();
    setSaving(true);
    const ok = await run(
      saveCatalog(catalog?.id ?? null, {
        ...v,
        sizes: Object.fromEntries(SIZES.map((s) => [s, v.sizes?.[s] ?? 0])),
        photoUrl: photo?.url ?? null,
        photoPublicId: photo?.publicId ?? null,
      }),
      catalog ? "Catalogue updated" : "Catalogue created",
    );
    setSaving(false);
    if (ok) onClose();
  }

  return (
    <Drawer
      title={catalog ? `Edit ${catalog.name}` : "New Catalogue"}
      open={catalog !== undefined}
      onClose={onClose}
      size={useDrawerSize(640)}
      footer={
        <Space style={{ width: "100%", justifyContent: "flex-end" }}>
          <Button onClick={onClose}>Cancel</Button>
          <Button type="primary" loading={saving} onClick={submit}>
            Submit
          </Button>
        </Space>
      }
    >
      <Form form={form} layout="vertical">
        <Row gutter={12}>
          <Col xs={24} md={12}>
            <Form.Item name="name" label="Catalogue name" rules={[{ required: true, message: "Enter a name" }]}>
              <Input placeholder="e.g. Sajni" />
            </Form.Item>
          </Col>
          <Col xs={12} md={6}>
            <Form.Item name="volume" label="Volume">
              <Input placeholder="Vol 2" />
            </Form.Item>
          </Col>
          <Col xs={12} md={6}>
            <Form.Item name="code" label="Code">
              <Input />
            </Form.Item>
          </Col>
          <Col xs={24} md={12}>
            <Form.Item name="fabric" label="Fabric">
              <Input />
            </Form.Item>
          </Col>
          <Col xs={24} md={12}>
            <Form.Item name="typeId" label="Type" rules={[{ required: true, message: "Pick a type (types are set up under Masters)" }]}>
              <MasterPicker options={types} />
            </Form.Item>
          </Col>
          <Col xs={24} md={12}>
            <Form.Item name="piecesPerDesign" label="Pieces per design" rules={[{ required: true, message: "Enter pieces per design" }]}>
              <InputNumber min={1} style={{ width: "100%" }} />
            </Form.Item>
          </Col>
          <Col xs={24} md={12}>
            <Form.Item label="Total pieces">
              <Input
                disabled
                value={`${designs.length} designs × ${Number(perDesign).toLocaleString("en-IN")} = ${(designs.length * perDesign).toLocaleString("en-IN")} pcs`}
              />
            </Form.Item>
          </Col>
        </Row>

        <Typography.Text strong>Design colours</Typography.Text>
        <Form.List name="designs">
          {(fields, { add, remove }) => (
            <div style={{ marginTop: 8 }}>
              <Row gutter={8}>
                {fields.map((f, i) => (
                  <Col xs={12} md={8} key={f.key}>
                    <Space.Compact block>
                      <Form.Item name={[f.name, "colourName"]} rules={[{ required: true, message: "Colour" }]} style={{ flex: 1 }}>
                        <Input placeholder={`Design ${i + 1}`} />
                      </Form.Item>
                      {fields.length > 1 && <Button icon={<DeleteOutlined />} onClick={() => remove(f.name)} />}
                    </Space.Compact>
                  </Col>
                ))}
              </Row>
              <Button type="dashed" icon={<PlusOutlined />} onClick={() => add({ colourName: "" })} style={{ marginBottom: 16 }}>
                Add design
              </Button>
            </div>
          )}
        </Form.List>

        <Typography.Text strong>Size ratio (per design)</Typography.Text>
        <Row gutter={8} style={{ marginTop: 8 }}>
          {SIZES.map((s) => (
            <Col span={6} key={s}>
              <Form.Item name={["sizes", s]} label={SIZE_LABEL[s]}>
                <InputNumber min={0} style={{ width: "100%" }} />
              </Form.Item>
            </Col>
          ))}
        </Row>
        <Alert
          type={ratioSum === perDesign && perDesign > 0 ? "success" : "warning"}
          showIcon
          title={`Sizes add up to ${ratioSum} of ${perDesign || 0} pieces per design`}
          style={{ marginBottom: 16 }}
        />

        <Form.Item name="photo" label="Catalogue photo">
          <PhotoInput />
        </Form.Item>
      </Form>
    </Drawer>
  );
}
