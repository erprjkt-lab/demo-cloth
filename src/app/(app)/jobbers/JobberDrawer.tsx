"use client";

import { useEffect, useState } from "react";
import { Button, Col, Drawer, Form, Input, Row, Space } from "antd";
import { useRun, useDrawerSize } from "@/components/ui";
import { saveJobber } from "./actions";

export type Jobber = {
  id: string;
  name: string;
  ownerName: string | null;
  gstNo: string | null;
  mobile1: string;
  mobile2: string | null;
  address: string | null;
};

/** Create (jobber = null) or edit a jobber. open = jobber !== undefined. */
export function JobberDrawer({ jobber, onClose }: { jobber: Jobber | null | undefined; onClose: () => void }) {
  const run = useRun();
  const [form] = Form.useForm();
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (jobber === undefined) return;
    form.resetFields();
    if (jobber) form.setFieldsValue(jobber);
  }, [jobber, form]);

  async function submit() {
    const v = await form.validateFields();
    setSaving(true);
    const ok = await run(saveJobber(jobber?.id ?? null, v), jobber ? "Jobber updated" : "Jobber created");
    setSaving(false);
    if (ok) onClose();
  }

  const mobile = { pattern: /^\d{10}$/, message: "10 digits" };
  return (
    <Drawer
      title={jobber ? `Edit ${jobber.name}` : "New Jobber"}
      open={jobber !== undefined}
      onClose={onClose}
      size={useDrawerSize(520)}
      footer={
        <Space style={{ width: "100%", justifyContent: "flex-end" }}>
          <Button onClick={onClose}>Cancel</Button>
          <Button type="primary" loading={saving} onClick={submit}>
            Submit
          </Button>
        </Space>
      }
    >
      <Form form={form} layout="vertical" requiredMark="optional">
        <Form.Item name="name" label="Jobber name" rules={[{ required: true, message: "Enter the jobber name" }]}>
          <Input />
        </Form.Item>
        <Form.Item name="ownerName" label="Owner name">
          <Input />
        </Form.Item>
        <Form.Item
          name="gstNo"
          label="GST no"
          normalize={(v: string) => v?.toUpperCase()}
          rules={[{ pattern: /^[0-9]{2}[A-Z0-9]{13}$/, message: "15 characters, e.g. 24ABCDE1234F1Z5" }]}
        >
          <Input maxLength={15} />
        </Form.Item>
        <Row gutter={12}>
          <Col span={12}>
            <Form.Item name="mobile1" label="Mobile 1" rules={[{ required: true, message: "Enter a mobile number" }, mobile]}>
              <Input inputMode="numeric" maxLength={10} />
            </Form.Item>
          </Col>
          <Col span={12}>
            <Form.Item name="mobile2" label="Mobile 2" rules={[mobile]}>
              <Input inputMode="numeric" maxLength={10} />
            </Form.Item>
          </Col>
        </Row>
        <Form.Item name="address" label="Address">
          <Input.TextArea rows={3} />
        </Form.Item>
      </Form>
    </Drawer>
  );
}
