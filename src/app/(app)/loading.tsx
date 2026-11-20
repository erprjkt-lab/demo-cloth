"use client";

import { Card, Skeleton } from "antd";

// Shown the moment a menu item is clicked, while the next page's data loads.
export default function Loading() {
  return (
    <div>
      <Skeleton.Input active size="small" style={{ width: 180, marginBottom: 8 }} />
      <Skeleton.Input active style={{ width: 240, marginBottom: 16, display: "block" }} />
      <Card>
        <Skeleton active paragraph={{ rows: 8 }} />
      </Card>
    </div>
  );
}
