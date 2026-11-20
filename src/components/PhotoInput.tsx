"use client";

import { useState } from "react";
import { CameraOutlined, DeleteOutlined } from "@ant-design/icons";
import { Alert, Button, Image, Space, Upload } from "antd";
import { uploadPhoto } from "@/lib/photo";
import { thumb } from "@/lib/format";

export type Photo = { url: string; publicId: string } | null;

/** Works standalone or as an antd Form.Item child (value / onChange). */
export function PhotoInput({ value = null, onChange }: { value?: Photo; onChange?: (p: Photo) => void }) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  return (
    <div>
      {value ? (
        <Space align="start">
          <Image src={thumb(value.url)} preview={{ src: value.url }} width={96} height={96} style={{ objectFit: "cover", borderRadius: 8 }} alt="" />
          <Button icon={<DeleteOutlined />} onClick={() => onChange?.(null)}>
            Remove
          </Button>
        </Space>
      ) : (
        <Upload
          accept="image/jpeg,image/png,image/webp"
          showUploadList={false}
          customRequest={async ({ file }) => {
            setBusy(true);
            setError("");
            try {
              onChange?.(await uploadPhoto(file as File));
            } catch (e) {
              setError((e as Error).message);
            } finally {
              setBusy(false);
            }
          }}
        >
          <Button icon={<CameraOutlined />} loading={busy}>
            {busy ? "Uploading…" : "Add photo"}
          </Button>
        </Upload>
      )}
      {error && <Alert type="error" showIcon title={error} style={{ marginTop: 8 }} />}
    </div>
  );
}
