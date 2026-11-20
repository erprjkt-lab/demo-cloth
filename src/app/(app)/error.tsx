"use client";

import { Button, Result } from "antd";

export default function Error({ reset }: { error: Error; reset: () => void }) {
  return (
    <Result
      status="warning"
      title="Something went wrong"
      subTitle="The database may be slow to answer. Check your internet connection and try again."
      extra={
        <Button type="primary" onClick={reset}>
          Try again
        </Button>
      }
    />
  );
}
